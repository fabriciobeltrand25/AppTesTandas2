/**
 * CONTROLADOR de tandas: arma los datos que necesita cada pantalla.
 */
import {
  crearTandaCompleta,
  listarResumenPorUsuario,
  obtenerProximoCobro,
  totalAhorrado,
  totalRecolectado,
  type Ahorro,
  type ProximoCobro,
  type RecargoTipo,
  type ResumenTanda,
} from '../models/tandaModel';
import {
  buscarPorId,
  buscarIdPorTelefono,
  listarContactos,
  listarUsuarios,
  type Usuario,
} from '../models/usuarioModel';
import { esFechaISOValida, generarCalendario, hoyISO, sumarPeriodos, type Frecuencia } from '../utils/fechas';
import { sembrarParaUsuario } from './seedController';
import { redondear2, soloDigitos } from '../utils/formato';

export interface TandaVista extends ResumenTanda {
  /** true si el usuario organiza la tanda (puede registrar pagos y cerrar rondas) */
  esOrganizador: boolean;
  /** true si el usuario es quien cobra en la ronda actual (por su CUENTA, no solo por teléfono) */
  esMiTurno: boolean;
  /** cuota × participantes */
  montoARecibir: number;
  /** 0 a 100 */
  porcentaje: number;
}

export type { ProximoCobro } from '../models/tandaModel';

export interface ResumenDashboard {
  /** Ahorro real de la cuenta: cuotas que pagó + rondas que ganó (cerradas). Es el número grande del Inicio. */
  ahorro: Ahorro;
  /** Recolección como organizador (cuotas registradas en las tandas que organiza) */
  totalRecolectado: number;
  /** Lo que la cuenta del usuario ya cobró en rondas cerradas (= ahorro.ganado) */
  totalCobrado: number;
  tandas: TandaVista[];
  proximoCobro: ProximoCobro | null;
}

export async function obtenerResumenDashboard(usuario: Usuario): Promise<ResumenDashboard> {
  const [tandas, recolectado, ahorro, proximoCobro] = await Promise.all([
    listarResumenPorUsuario(usuario.id),
    totalRecolectado(usuario.id),
    totalAhorrado(usuario.id),
    obtenerProximoCobro(usuario.id),
  ]);

  const vistas: TandaVista[] = tandas.map((t) => ({
    ...t,
    esOrganizador: t.organizadorId === usuario.id,
    esMiTurno: !!t.rondaActual && t.rondaActual.beneficiarioUsuarioId === usuario.id,
    montoARecibir: t.cuota * t.participantesTotal,
    porcentaje: t.totalRondas ? Math.round((t.rondasCerradas / t.totalRondas) * 100) : 0,
  }));

  return {
    ahorro,
    totalRecolectado: recolectado,
    totalCobrado: ahorro.ganado,
    tandas: vistas,
    proximoCobro,
  };
}

// ───────────────────── Datos de ejemplo ─────────────────────
// La lógica vive en seedController.ts (automática al primer arranque + botón manual del Inicio).

/** Crea las 3 tandas de ejemplo para el usuario en sesión (botón del Inicio, solo en desarrollo). */
export async function sembrarDatosDemo(usuario: Usuario): Promise<void> {
  await sembrarParaUsuario(usuario);
}

// ───────────────────────── Nueva tanda ─────────────────────────

export const MIN_PARTICIPANTES = 3;
export const MAX_PARTICIPANTES = 30;
const CUOTA_MAXIMA = 1_000_000;

export interface ParticipanteForm {
  nombre: string;
  telefono: string; // 8 dígitos
  /** Si viene de la lista de usuarios registrados, el id de su cuenta */
  usuarioId?: number | null;
}

export interface DatosNuevaTanda {
  nombre: string;
  cuota: string; // texto tal como lo escribe el usuario
  frecuencia: Frecuencia;
  fechaInicio: string; // YYYY-MM-DD
  cantidad: number;
  recargoTipo: RecargoTipo;
  recargoValor: string; // texto (monto en L o porcentaje)
  /** Ya en el orden final: el primero cobra en la ronda 1, etc. */
  participantes: ParticipanteForm[];
}

export type ResultadoTanda =
  | { ok: true; tandaId: number }
  | { ok: false; errores: Record<string, string> };

export function aNumero(texto: string): number {
  const n = Number(texto.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Baraja una lista (Fisher-Yates) sin modificar la original. */
export function sortear<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Cálculos del "Resumen proyectado" mientras se llena el formulario. */
export function calcularProyeccion(cuota: number, frecuencia: Frecuencia, cantidad: number, fechaInicio: string) {
  const duracion =
    frecuencia === 'semanal'
      ? `${cantidad} ${cantidad === 1 ? 'semana' : 'semanas'}`
      : (() => {
          const meses = frecuencia === 'quincenal' ? cantidad / 2 : cantidad;
          return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
        })();
  return {
    bolsa: cuota * cantidad,
    rondas: cantidad,
    duracion,
    finaliza: sumarPeriodos(fechaInicio, frecuencia, Math.max(cantidad - 1, 0)),
  };
}

/** Valida un participante nuevo. Devuelve el mensaje de error o null si está bien. */
export function validarParticipante(
  nombre: string,
  telefono: string,
  existentes: ParticipanteForm[]
): string | null {
  if (nombre.trim().length < 3) return 'Escribe el nombre del participante';
  const tel = soloDigitos(telefono);
  if (!/^\d{8}$/.test(tel)) return 'El teléfono debe tener 8 dígitos';
  if (existentes.some((p) => p.telefono === tel)) return 'Ese teléfono ya está en la tanda';
  return null;
}

/** Usuarios registrados que se pueden agregar como participantes (para el ComboBox). */
export async function listarUsuariosParaElegir(): Promise<Usuario[]> {
  return listarUsuarios();
}

/** Una persona que se puede elegir en el ComboBox de "Agregar participante". */
export interface OpcionParticipante {
  nombre: string;
  telefono: string;
  /** Id de su cuenta, o null si es un contacto sin cuenta */
  usuarioId: number | null;
  tipo: 'cuenta' | 'contacto';
}

/**
 * Opciones del ComboBox: las cuentas registradas y, además, los contactos que el usuario
 * ya agregó en sus tandas anteriores sin que tuvieran cuenta (incluidos los datos de ejemplo).
 * Así no tiene que volver a escribirlos ni se mezclan números distintos para la misma persona.
 */
export async function listarOpcionesParticipantes(usuario: Usuario): Promise<OpcionParticipante[]> {
  const [cuentas, contactos] = await Promise.all([listarUsuarios(), listarContactos(usuario.id)]);
  return [
    ...cuentas.map((u): OpcionParticipante => ({ nombre: u.nombre, telefono: u.telefono, usuarioId: u.id, tipo: 'cuenta' })),
    ...contactos.map((c): OpcionParticipante => ({ nombre: c.nombre, telefono: c.telefono, usuarioId: null, tipo: 'contacto' })),
  ];
}

const FRECUENCIAS: Frecuencia[] = ['semanal', 'quincenal', 'mensual'];

export async function crearTanda(usuario: Usuario, d: DatosNuevaTanda): Promise<ResultadoTanda> {
  const errores: Record<string, string> = {};
  const textoCuota = d.cuota.trim().replace(',', '.');
  const cuota = aNumero(textoCuota);
  const recargoValor = d.recargoTipo === 'ninguno' ? 0 : aNumero(d.recargoValor);

  // ── Datos de la tanda (la pantalla ya valida, pero el controlador no debe fiarse de ella) ──
  const nombre = d.nombre.trim();
  if (nombre.length < 3) errores.nombre = 'Escribe un nombre para la tanda';
  else if (nombre.length > 40) errores.nombre = 'El nombre es demasiado largo (máximo 40)';

  if (!/^\d+(\.\d{1,2})?$/.test(textoCuota) || cuota <= 0) errores.cuota = 'Ingresa una cuota válida (máximo 2 decimales)';
  else if (cuota > CUOTA_MAXIMA) errores.cuota = 'El monto es demasiado alto';

  if (!FRECUENCIAS.includes(d.frecuencia)) errores.frecuencia = 'Elige semanal, quincenal o mensual';

  if (!esFechaISOValida(d.fechaInicio)) errores.fecha = 'La fecha de inicio no es válida';
  else if (d.fechaInicio < hoyISO()) errores.fecha = 'La fecha no puede ser anterior a hoy';

  if (!Number.isInteger(d.cantidad) || d.cantidad < MIN_PARTICIPANTES || d.cantidad > MAX_PARTICIPANTES) {
    errores.cantidad = `Debe haber entre ${MIN_PARTICIPANTES} y ${MAX_PARTICIPANTES} participantes`;
  }

  if (!['ninguno', 'fijo', 'porcentaje'].includes(d.recargoTipo)) errores.recargo = 'Tipo de recargo no válido';
  else if (d.recargoTipo !== 'ninguno') {
    if (recargoValor <= 0) errores.recargo = 'Ingresa el valor del recargo';
    else if (d.recargoTipo === 'porcentaje' && recargoValor > 100) errores.recargo = 'El porcentaje no puede pasar de 100';
    else if (d.recargoTipo === 'fijo' && recargoValor > cuota) errores.recargo = 'El recargo no puede ser mayor que la cuota';
  }

  // ── Participantes: cantidad, datos válidos y sin repetir ──
  if (!errores.cantidad && d.participantes.length !== d.cantidad) {
    const faltan = d.cantidad - d.participantes.length;
    errores.participantes =
      faltan > 0
        ? `Faltan ${faltan} participante${faltan === 1 ? '' : 's'} por registrar`
        : `Sobran ${-faltan} participante${faltan === -1 ? '' : 's'}`;
  }
  if (!errores.participantes) {
    const invalido = d.participantes.find(
      (p) => p.nombre.trim().length < 3 || p.nombre.trim().length > 60 || !/^\d{8}$/.test(soloDigitos(p.telefono))
    );
    if (invalido) errores.participantes = `Datos no válidos para "${invalido.nombre.trim() || 'sin nombre'}": usa un nombre y un teléfono de 8 dígitos`;
  }
  if (!errores.participantes) {
    const telefonos = d.participantes.map((p) => soloDigitos(p.telefono));
    const repetido = telefonos.find((t, i) => telefonos.indexOf(t) !== i);
    if (repetido) errores.participantes = `El teléfono ${repetido} está repetido en la tanda`;
    const ids = d.participantes.map((p) => p.usuarioId).filter((id): id is number => typeof id === 'number');
    if (!errores.participantes && ids.some((id, i) => ids.indexOf(id) !== i)) {
      errores.participantes = 'Una misma cuenta aparece más de una vez en la tanda';
    }
  }
  if (Object.keys(errores).length) return { ok: false, errores };

  // Cada participante se vincula a su CUENTA: por id (si se eligió de la lista) o por su teléfono.
  const participantes = [];
  for (const p of d.participantes) {
    let usuarioId = p.usuarioId ?? null;
    let nombreP = p.nombre.trim();
    let telefono = soloDigitos(p.telefono);
    if (usuarioId !== null) {
      const cuenta = await buscarPorId(usuarioId);
      if (cuenta) {
        nombreP = cuenta.nombre;
        telefono = cuenta.telefono;
      } else {
        usuarioId = null;
      }
    } else {
      usuarioId = await buscarIdPorTelefono(telefono);
    }
    participantes.push({ nombre: nombreP, telefono, usuarioId });
  }

  // Revisión final con los datos ya resueltos (el teléfono de una cuenta puede diferir del escrito)
  const tels = participantes.map((p) => p.telefono);
  const cuentas = participantes.map((p) => p.usuarioId).filter((id): id is number => id !== null);
  if (tels.some((t, i) => tels.indexOf(t) !== i) || cuentas.some((id, i) => cuentas.indexOf(id) !== i)) {
    return { ok: false, errores: { participantes: 'Hay participantes repetidos (el mismo teléfono o la misma cuenta)' } };
  }

  // Una ronda por participante: cada persona cobra una sola vez.
  try {
    const creada = await crearTandaCompleta({
      usuarioId: usuario.id,
      nombre,
      cuota: redondear2(cuota),
      frecuencia: d.frecuencia,
      fechaInicio: d.fechaInicio,
      recargoTipo: d.recargoTipo,
      recargoValor: redondear2(recargoValor),
      participantes,
      calendario: generarCalendario(d.fechaInicio, d.frecuencia, participantes.length),
    });
    return { ok: true, tandaId: creada.tandaId };
  } catch {
    // La transacción se deshace sola: no queda una tanda a medias
    return { ok: false, errores: { general: 'No se pudo guardar la tanda. Revisa los datos e intenta de nuevo.' } };
  }
}
