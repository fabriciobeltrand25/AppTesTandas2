/**
 * CONTROLADOR de datos de ejemplo (seeders).
 *
 * Al abrir la app por primera vez (y solo una vez):
 *   1) Crea las cuentas de prueba de database/datosPrueba.ts con contraseña y PIN reales
 *      (hasheados igual que una cuenta normal: se puede iniciar sesión y recuperar contraseña).
 *   2) Crea 3 tandas de ejemplo organizadas por el primer contacto, con participantes VINCULADOS
 *      a esas cuentas (usuario_id), cuotas pagadas y rondas cerradas.
 * La bandera se guarda en la tabla "meta", así que no se repite ni se vuelve a crear si borras datos.
 */
import { CONTACTOS_PRUEBA, PASSWORD_PRUEBA, PIN_PRUEBA, SEMBRAR_AUTOMATICO } from '../database/datosPrueba';
import { leerMeta, guardarMeta } from '../models/metaModel';
import { cerrarRonda, crearTandaCompleta, registrarPago } from '../models/tandaModel';
import { buscarPorTelefono, crearUsuario, listarUsuariosDemo, type Usuario } from '../models/usuarioModel';
import { generarCalendario, hoyISO, sumarPeriodos, type Frecuencia } from '../utils/fechas';
import { soloDigitos } from '../utils/formato';
import { prepararClaves } from './authController';

const META_USUARIOS = 'seed_usuarios_v1';
const META_TANDAS = 'seed_tandas_v1';
const MIN_PARTICIPANTES = 3;

export interface Persona {
  nombre: string;
  telefono: string;
  usuarioId: number | null;
}

interface PlantillaTanda {
  nombre: string;
  cuota: number;
  frecuencia: Frecuencia;
  /** posiciones (0 = primer contacto) de los contactos que participan, en orden de turno */
  contactos: number[];
  rondaActual: number;
}

const PLANTILLAS: PlantillaTanda[] = [
  { nombre: 'Cuchubal Familia Pérez', cuota: 500, frecuencia: 'quincenal', contactos: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rondaActual: 4 },
  { nombre: 'Tanda Compañeros Oficina', cuota: 1000, frecuencia: 'mensual', contactos: [0, 5, 6, 7, 8, 9, 10, 11], rondaActual: 2 },
  { nombre: 'Ahorro Amigas del Barrio', cuota: 300, frecuencia: 'semanal', contactos: [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], rondaActual: 7 },
];

/** Crea una tanda con sus rondas y pagos de ejemplo. */
export async function crearTandaDemo(organizadorId: number, p: PlantillaTanda, gente: Persona[]): Promise<void> {
  const hoy = hoyISO();
  const rondaActual = Math.min(p.rondaActual, gente.length);
  const inicio = sumarPeriodos(hoy, p.frecuencia, -(rondaActual - 1));

  const tanda = await crearTandaCompleta({
    usuarioId: organizadorId,
    nombre: p.nombre,
    cuota: p.cuota,
    frecuencia: p.frecuencia,
    fechaInicio: inicio,
    recargoTipo: 'ninguno',
    recargoValor: 0,
    participantes: gente,
    calendario: generarCalendario(inicio, p.frecuencia, gente.length),
  });

  for (const ronda of tanda.rondas) {
    if (ronda.numero < rondaActual) {
      for (const part of tanda.participantes) await registrarPago(ronda.id, part.id, p.cuota, ronda.fecha, 'Efectivo');
      await cerrarRonda(ronda.id);
    } else if (ronda.numero === rondaActual) {
      const pagaron = Math.ceil(tanda.participantes.length * 0.6);
      for (const part of tanda.participantes.slice(0, pagaron)) {
        await registrarPago(ronda.id, part.id, p.cuota, hoy, 'Efectivo');
      }
    }
  }
}

/** Contactos válidos (8 dígitos, sin repetir); ignora los que siguen en "PENDIENTE". */
function contactosValidos() {
  const vistos = new Set<string>();
  const lista: { nombre: string; telefono: string; correo: string | null }[] = [];
  for (const c of CONTACTOS_PRUEBA) {
    const tel = soloDigitos(c.telefono);
    if (!/^\d{8}$/.test(tel) || vistos.has(tel)) continue;
    vistos.add(tel);
    lista.push({ nombre: c.nombre, telefono: tel, correo: c.correo ?? null });
  }
  return lista;
}

/** Corre al abrir la app. Es seguro llamarlo siempre: solo actúa la primera vez. */
export async function sembrarSiHaceFalta(): Promise<void> {
  if (!SEMBRAR_AUTOMATICO) return;
  if ((await leerMeta(META_TANDAS)) === '1') return;

  const contactos = contactosValidos();
  if (contactos.length < MIN_PARTICIPANTES) {
    console.warn('[seed] Faltan números reales en database/datosPrueba.ts (mínimo 3). No se cargaron datos de ejemplo.');
    return; // sin bandera: cuando pongas los números, se sembrará en el siguiente arranque
  }

  // 1) Cuentas de prueba con contraseña + PIN
  if ((await leerMeta(META_USUARIOS)) !== '1') {
    for (const c of contactos) {
      if (await buscarPorTelefono(c.telefono)) continue; // ya tiene cuenta: no se toca
      const claves = await prepararClaves(PASSWORD_PRUEBA, PIN_PRUEBA);
      await crearUsuario({ nombre: c.nombre, telefono: c.telefono, correo: c.correo, ...claves, esDemo: true });
    }
    await guardarMeta(META_USUARIOS, '1');
  }

  // 2) Tandas de ejemplo con participantes vinculados a esas cuentas
  const cuentas = await Promise.all(contactos.map((c) => buscarPorTelefono(c.telefono)));
  const personas: Persona[] = cuentas
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => ({ nombre: u.nombre, telefono: u.telefono, usuarioId: u.id }));
  const organizador = personas[0];
  if (!organizador?.usuarioId) return;

  for (const plantilla of PLANTILLAS) {
    const gente = plantilla.contactos.filter((i) => i < personas.length).map((i) => personas[i]);
    if (gente.length < MIN_PARTICIPANTES) continue;
    await crearTandaDemo(organizador.usuarioId, plantilla, gente);
  }
  await guardarMeta(META_TANDAS, '1');
}

// ───────── Botón manual "Cargar datos de ejemplo" (Inicio, solo en desarrollo) ─────────

const NOMBRES_RESPALDO = [
  'Carlos Pérez', 'Miriam Flores', 'Ana Mejía', 'Luis Ordóñez', 'Karla Reyes', 'José Martínez',
  'Sofía Cárcamo', 'Daniel Zelaya', 'Gloria Núñez', 'Pedro Aguilar', 'Rosa Lagos', 'Marvin Castro',
];

/**
 * Crea las 3 tandas de ejemplo para el usuario que está en sesión.
 * Usa las cuentas de prueba como participantes; si no hay, usa nombres inventados.
 */
export async function sembrarParaUsuario(usuario: Usuario): Promise<void> {
  const demos = (await listarUsuariosDemo()).filter((u) => u.id !== usuario.id);
  const base: Persona[] =
    demos.length >= MIN_PARTICIPANTES
      ? demos.map((u) => ({ nombre: u.nombre, telefono: u.telefono, usuarioId: u.id }))
      : NOMBRES_RESPALDO.map((nombre, i) => ({
          nombre,
          telefono: `9${String(1000000 + i * 137).slice(0, 7)}`,
          usuarioId: null,
        }));

  const yo: Persona = { nombre: usuario.nombre, telefono: usuario.telefono, usuarioId: usuario.id };
  const tamanos = [10, 8, 12];

  for (let k = 0; k < PLANTILLAS.length; k++) {
    const p = PLANTILLAS[k];
    const n = Math.min(tamanos[k], base.length + 1);
    if (n < MIN_PARTICIPANTES) continue;
    const gente = Array.from({ length: n - 1 }, (_, i) => base[(i + k * 3) % base.length]);
    // El usuario participa en el turno que le toca cobrar ahora
    gente.splice(Math.min(p.rondaActual, n) - 1, 0, yo);
    await crearTandaDemo(usuario.id, p, gente);
  }
}
