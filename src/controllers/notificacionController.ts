/**
 * CONTROLADOR de notificaciones LOCALES (no necesitan internet ni servidor).
 *
 * ⚠️ Mientras NOTIFICACIONES_ACTIVAS sea false (src/config.ts) este archivo NO carga
 * el módulo 'expo-notifications' y todas las funciones no hacen nada, así la app
 * funciona en Expo Go sin crashear.
 *
 * Para activarlas: compila un Development Build (APK) y cambia el interruptor a true.
 *
 * Qué programa cuando están activas:
 *   - el día anterior a las 9:00 y el mismo día a las 8:00 de cada ronda abierta
 *   - aviso especial si ese día te toca cobrar
 *   - si la ronda ya venció, recordatorios las próximas 3 mañanas
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { NOTIFICACIONES_ACTIVAS } from '../config';
import type { Usuario } from '../models/usuarioModel';
import { diferenciaDias, hoyISO } from '../utils/fechas';
import { formatearLempiras } from '../utils/formato';
import { obtenerCalendario } from './rondaController';
import { obtenerResumenDashboard } from './tandaController';

// Solo tipos (se borran al compilar: no cargan el módulo nativo)
type ModuloNotificaciones = typeof import('expo-notifications');

const CANAL = 'recordatorios';
const CLAVE_ACTIVAS = 'notif_activas';
const CLAVE_PREGUNTADO = 'notif_preguntado';

/** Carga expo-notifications SOLO cuando está permitido (carga perezosa). */
function cargarModulo(): ModuloNotificaciones | null {
  if (!NOTIFICACIONES_ACTIVAS) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as ModuloNotificaciones;
}

/** true si esta versión de la app puede usar notificaciones. */
export function notificacionesDisponibles(): boolean {
  return NOTIFICACIONES_ACTIVAS;
}

/** Cómo se muestran las notificaciones si la app está abierta. */
export function configurarManejador() {
  const N = cargarModulo();
  if (!N) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Ejecuta una acción cuando el usuario toca una notificación. Devuelve la función para cancelar. */
export function alTocarNotificacion(accion: (rondaId: number) => void): () => void {
  const N = cargarModulo();
  if (!N) return () => {};
  const suscripcion = N.addNotificationResponseReceivedListener((respuesta) => {
    const rondaId = respuesta.notification.request.content.data?.rondaId;
    if (rondaId) accion(Number(rondaId));
  });
  return () => suscripcion.remove();
}

async function asegurarCanal(N: ModuloNotificaciones) {
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(CANAL, {
      name: 'Recordatorios de tandas',
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#006948',
    });
  }
}

// ───────────────────────── Ajustes y permisos ─────────────────────────

export async function estanActivadas(): Promise<boolean> {
  if (!NOTIFICACIONES_ACTIVAS) return false;
  try {
    return (await SecureStore.getItemAsync(CLAVE_ACTIVAS)) !== 'no';
  } catch {
    return true;
  }
}

export async function guardarActivadas(valor: boolean): Promise<void> {
  if (!NOTIFICACIONES_ACTIVAS) return;
  try {
    await SecureStore.setItemAsync(CLAVE_ACTIVAS, valor ? 'si' : 'no');
  } catch {
    /* sin acceso al almacén seguro: se queda el valor por defecto */
  }
}

export async function permisoConcedido(): Promise<boolean> {
  const N = cargarModulo();
  if (!N) return false;
  return (await N.getPermissionsAsync()).granted;
}

/** Pide el permiso al sistema (muestra el cuadro de Android/iOS). */
export async function pedirPermiso(): Promise<boolean> {
  const N = cargarModulo();
  if (!N) return false;
  await asegurarCanal(N);
  const actual = await N.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;
  return (await N.requestPermissionsAsync()).granted;
}

/** true si todavía no le hemos preguntado al usuario si quiere los recordatorios. */
export async function debePreguntar(): Promise<boolean> {
  if (!NOTIFICACIONES_ACTIVAS) return false;
  try {
    return (await SecureStore.getItemAsync(CLAVE_PREGUNTADO)) !== 'si';
  } catch {
    return false;
  }
}

export async function marcarPreguntado(): Promise<void> {
  if (!NOTIFICACIONES_ACTIVAS) return;
  try {
    await SecureStore.setItemAsync(CLAVE_PREGUNTADO, 'si');
  } catch {
    /* ignorar */
  }
}

// ───────────────────────── Programación ─────────────────────────

/** "2026-10-20" + 8 h  ->  Date local de ese día a las 8:00 */
function aFechaHora(iso: string, hora: number): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, hora, 0, 0);
}

/** Suma (o resta) días a una fecha ISO. */
function diaMasK(iso: string, k: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + k));
  return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
}

async function programar(N: ModuloNotificaciones, titulo: string, cuerpo: string, fecha: Date, rondaId: number) {
  if (fecha.getTime() < Date.now() + 60_000) return 0; // ya pasó (o es dentro de menos de 1 min)
  await N.scheduleNotificationAsync({
    content: { title: titulo, body: cuerpo, data: { rondaId }, sound: true },
    trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: fecha, channelId: CANAL },
  });
  return 1;
}

/**
 * Borra los recordatorios anteriores y programa los nuevos según el estado actual.
 * Devuelve cuántos quedaron programados (0 si las notificaciones están desactivadas).
 */
export async function reprogramar(usuario: Usuario): Promise<number> {
  const N = cargarModulo();
  if (!N) return 0;
  try {
    await N.cancelAllScheduledNotificationsAsync();
    if (!(await estanActivadas())) return 0;
    if (!(await permisoConcedido())) return 0;
    await asegurarCanal(N);

    const hoy = hoyISO();
    const { tandas } = await obtenerResumenDashboard(usuario);
    let programadas = 0;

    for (const t of tandas) {
      if (t.estado !== 'activa') continue;
      const cal = await obtenerCalendario(t.id, usuario);
      if (!cal) continue;

      const abiertas = cal.rondas.filter((r) => r.estado !== 'cerrada').slice(0, 2);
      for (const r of abiertas) {
        const pendientes = Math.max(cal.tanda.participantesTotal - r.pagados, 0);
        const dias = diferenciaDias(hoy, r.fecha);

        if (r.estado === 'en_curso' && dias < 0) {
          for (let k = 1; k <= 3; k++) {
            programadas += await programar(
              N,
              `Ronda #${r.numero} vencida`,
              `${t.nombre}: faltan ${pendientes} ${pendientes === 1 ? 'cuota' : 'cuotas'}. Revisa y recuerda a los participantes.`,
              aFechaHora(diaMasK(hoy, k), 9),
              r.id
            );
          }
          continue;
        }

        programadas += await programar(
          N,
          `Mañana vence la ronda #${r.numero}`,
          `${t.nombre}: ${r.pagados} de ${cal.tanda.participantesTotal} cuotas registradas.`,
          aFechaHora(diaMasK(r.fecha, -1), 9),
          r.id
        );

        programadas += await programar(
          N,
          r.esMia ? '¡Hoy te toca cobrar!' : `Hoy cierra la ronda #${r.numero}`,
          r.esMia
            ? `${t.nombre}: ${formatearLempiras(r.monto)}. ${pendientes > 0 ? `Faltan ${pendientes} cuotas.` : 'Todas las cuotas están registradas.'}`
            : `${t.nombre}: ${pendientes > 0 ? `faltan ${pendientes} cuotas por registrar.` : 'todas las cuotas están registradas.'}`,
          aFechaHora(r.fecha, 8),
          r.id
        );
      }
    }
    return programadas;
  } catch (e) {
    console.warn('No se pudieron programar las notificaciones', e);
    return 0;
  }
}

/** Notificación de prueba a los 3 segundos (para comprobar que funciona). */
export async function enviarPrueba(): Promise<boolean> {
  const N = cargarModulo();
  if (!N) return false;
  if (!(await pedirPermiso())) return false;
  await N.scheduleNotificationAsync({
    content: {
      title: 'Mis Tandas',
      body: '¡Los recordatorios funcionan! Así te avisaremos de tus rondas.',
      sound: true,
    },
    trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: CANAL },
  });
  return true;
}

/** Cuántas notificaciones hay programadas ahora mismo. */
export async function contarProgramadas(): Promise<number> {
  const N = cargarModulo();
  if (!N) return 0;
  return (await N.getAllScheduledNotificationsAsync()).length;
}
