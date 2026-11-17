/**
 * CONTROLADOR de rondas y pagos: calendario, detalle de ronda, registro de pagos y cierre.
 * Reglas del proyecto que se aplican aquí:
 *  - una ronda por participante (cada persona cobra una sola vez)
 *  - total recolectado de una ronda = suma de los pagos registrados
 *  - una ronda no se cierra con cuotas pendientes sin confirmación explícita
 */
import { obtenerComprobante, registrarPago } from '../models/tandaModel';
import {
  buscarPago,
  esParticipanteConCuenta,
  cerrarRondaYFinalizar,
  listarPagosDeRonda,
  listarRondas,
  obtenerRonda,
  obtenerTandaBasica,
  participanteDeTanda,
  rondaDeUnPago,
  type RondaResumen,
  type TandaBasica,
} from '../models/rondaModel';
import type { Usuario } from '../models/usuarioModel';
import { diferenciaDias, esFechaISOValida, hoyISO } from '../utils/fechas';
import { redondear2 } from '../utils/formato';

export type EstadoRonda = 'cerrada' | 'en_curso' | 'pendiente';

export const METODOS_PAGO = ['Efectivo', 'Banco Atlántida', 'BAC Credomatic', 'Billetera Tengo'] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export interface RondaVista extends RondaResumen {
  estado: EstadoRonda;
  /** cuota × participantes */
  monto: number;
  /** 0 a 100 */
  porcentaje: number;
  esMia: boolean;
  textoPlazo: string;
  /** días hasta la fecha de la ronda (negativo si ya pasó) */
  dias: number;
}

function textoPlazoRonda(estado: EstadoRonda, dias: number): string {
  if (estado === 'en_curso') {
    if (dias > 1) return `Cierra en ${dias} días`;
    if (dias === 1) return 'Cierra mañana';
    if (dias === 0) return 'Cierra hoy';
    return `Venció hace ${-dias} ${dias === -1 ? 'día' : 'días'}`;
  }
  if (estado === 'pendiente') return dias > 0 ? `En ${dias} ${dias === 1 ? 'día' : 'días'}` : 'Por iniciar';
  return '';
}

function armarVistas(tanda: TandaBasica, rondas: RondaResumen[], usuario: Usuario): RondaVista[] {
  const hoy = hoyISO();
  const monto = redondear2(tanda.cuota * tanda.participantesTotal);
  const primeraAbierta = rondas.find((r) => !r.cerrada)?.id;

  return rondas.map((r) => {
    const estado: EstadoRonda = r.cerrada ? 'cerrada' : r.id === primeraAbierta ? 'en_curso' : 'pendiente';
    const dias = diferenciaDias(hoy, r.fecha);
    return {
      ...r,
      estado,
      monto,
      porcentaje: monto ? Math.min(100, Math.round((r.recolectado / monto) * 100)) : 0,
      esMia: r.beneficiarioUsuarioId === usuario.id,
      textoPlazo: textoPlazoRonda(estado, dias),
      dias,
    };
  });
}

export interface TandaAcceso extends TandaBasica {
  /** true si el usuario organiza la tanda: solo él registra pagos, cierra rondas y envía recordatorios */
  esOrganizador: boolean;
}

/**
 * Devuelve la tanda si el usuario puede verla: la organiza, o participa en ella con su cuenta.
 * (Un participante la ve en modo lectura.)
 */
async function tandaDelUsuario(tandaId: number, usuario: Usuario): Promise<TandaAcceso | null> {
  const tanda = await obtenerTandaBasica(tandaId);
  if (!tanda) return null;
  const esOrganizador = tanda.usuarioId === usuario.id;
  if (!esOrganizador && !(await esParticipanteConCuenta(tandaId, usuario.id))) return null;
  return { ...tanda, esOrganizador };
}

// ───────────────────────── Calendario ─────────────────────────

export interface CalendarioVista {
  tanda: TandaAcceso;
  rondas: RondaVista[];
  montoPorCobro: number;
  fechaInicio: string;
  fechaFin: string;
  completadas: number;
  enCurso: number;
}

export async function obtenerCalendario(tandaId: number, usuario: Usuario): Promise<CalendarioVista | null> {
  const tanda = await tandaDelUsuario(tandaId, usuario);
  if (!tanda) return null;
  const rondas = armarVistas(tanda, await listarRondas(tandaId), usuario);
  return {
    tanda,
    rondas,
    montoPorCobro: tanda.cuota * tanda.participantesTotal,
    fechaInicio: rondas[0]?.fecha ?? tanda.fechaInicio,
    fechaFin: rondas[rondas.length - 1]?.fecha ?? tanda.fechaInicio,
    completadas: rondas.filter((r) => r.estado === 'cerrada').length,
    enCurso: rondas.filter((r) => r.estado === 'en_curso').length,
  };
}

// ───────────────────────── Detalle de ronda ─────────────────────────

export type EstadoPago = 'pagado' | 'pendiente' | 'atrasado';

export interface PagoVista {
  participanteId: number;
  /** Cuenta vinculada al participante (null si no tiene cuenta) */
  usuarioId: number | null;
  nombre: string;
  telefono: string;
  turno: number;
  /** true si este participante es el propio usuario que mira la pantalla */
  esMio: boolean;
  pagado: boolean;
  pagoId: number | null;
  monto: number | null;
  recargo: number;
  fechaPago: string | null;
  metodo: string | null;
  tieneComprobante: boolean;
  /** Recargo que se cobraría si paga hoy (solo pendientes atrasados) */
  recargoPendiente: number;
  estado: EstadoPago;
}

export interface DetalleRonda {
  tanda: TandaAcceso;
  ronda: RondaVista;
  totalRondas: number;
  pagaron: PagoVista[];
  pendientes: PagoVista[];
  recolectado: number;
  esperado: number;
  porcentaje: number;
  montoPendiente: number;
  /** Recargos por atraso cobrados en esta ronda (van aparte de la bolsa) */
  recargosCobrados: number;
}

export async function obtenerDetalleRonda(rondaId: number, usuario: Usuario): Promise<DetalleRonda | null> {
  const base = await obtenerRonda(rondaId);
  if (!base) return null;
  const tanda = await tandaDelUsuario(base.tandaId, usuario);
  if (!tanda) return null;

  const rondas = armarVistas(tanda, await listarRondas(tanda.id), usuario);
  const ronda = rondas.find((r) => r.id === rondaId);
  if (!ronda) return null;

  const filas = await listarPagosDeRonda(rondaId, tanda.id);
  const vencida = ronda.estado === 'cerrada' || (ronda.estado === 'en_curso' && ronda.dias < 0);
  const hoy = hoyISO();
  const vistas: PagoVista[] = filas.map((f) => ({
    participanteId: f.participanteId,
    usuarioId: f.usuarioId,
    nombre: f.nombre,
    telefono: f.telefono,
    turno: f.turno,
    esMio: f.usuarioId === usuario.id,
    pagado: f.pagoId !== null,
    pagoId: f.pagoId,
    monto: f.monto,
    recargo: f.recargo ?? 0,
    fechaPago: f.fechaPago,
    metodo: f.metodo,
    tieneComprobante: f.tieneComprobante === 1,
    // Recargo que se cobraría si paga hoy: aplica a la ronda en curso y a las ya cerradas (pago tardío)
    recargoPendiente:
      f.pagoId === null && (ronda.estado === 'en_curso' || ronda.estado === 'cerrada')
        ? calcularRecargo(tanda, ronda.fecha, hoy)
        : 0,
    estado: f.pagoId !== null ? 'pagado' : vencida ? 'atrasado' : 'pendiente',
  }));

  const pagaron = vistas.filter((v) => v.pagado);
  const pendientes = vistas.filter((v) => !v.pagado);
  const esperado = redondear2(tanda.cuota * tanda.participantesTotal);
  // Total recolectado = suma exacta de los pagos registrados
  const recolectado = redondear2(pagaron.reduce((suma, v) => suma + (v.monto ?? 0), 0));

  return {
    tanda,
    ronda,
    totalRondas: rondas.length,
    pagaron,
    pendientes,
    recolectado,
    esperado,
    porcentaje: esperado ? Math.min(100, Math.round((recolectado / esperado) * 100)) : 0,
    montoPendiente: redondear2(pendientes.length * tanda.cuota),
    recargosCobrados: redondear2(pagaron.reduce((suma, v) => suma + v.recargo, 0)),
  };
}

/** Comprobante (foto en base64) de un pago; se carga solo cuando se quiere ver. */
export async function obtenerComprobanteDePago(pagoId: number, usuario: Usuario): Promise<string | null> {
  // Solo quien puede ver la tanda (organiza o participa) puede ver sus comprobantes
  const rondaId = await rondaDeUnPago(pagoId);
  if (rondaId === null) return null;
  const ronda = await obtenerRonda(rondaId);
  if (!ronda || !(await tandaDelUsuario(ronda.tandaId, usuario))) return null;
  return obtenerComprobante(pagoId);
}

// ───────────────────────── Recargo por atraso ─────────────────────────

/** Días de atraso del pago respecto a la fecha de la ronda (0 si llegó a tiempo). */
export function diasDeAtraso(fechaRonda: string, fechaPago: string): number {
  return Math.max(diferenciaDias(fechaRonda, fechaPago), 0);
}

/**
 * Recargo por pagar después de la fecha de la ronda. Se cobra UNA vez por cuota atrasada:
 *  - fijo: un monto en lempiras
 *  - porcentaje: % de la cuota
 */
export function calcularRecargo(
  tanda: { cuota: number; recargoTipo: 'ninguno' | 'fijo' | 'porcentaje'; recargoValor: number },
  fechaRonda: string,
  fechaPago: string
): number {
  if (tanda.recargoTipo === 'ninguno' || tanda.recargoValor <= 0) return 0;
  if (diasDeAtraso(fechaRonda, fechaPago) <= 0) return 0;
  const bruto = tanda.recargoTipo === 'fijo' ? tanda.recargoValor : (tanda.cuota * tanda.recargoValor) / 100;
  return Math.round(bruto * 100) / 100;
}

// ───────────────────────── Registrar pago ─────────────────────────

export interface DatosPago {
  rondaId: number;
  participanteId: number;
  metodo: MetodoPago | null;
  fechaPago: string; // YYYY-MM-DD
  /** Cobrar el recargo por atraso si corresponde (el organizador puede perdonarlo) */
  cobrarRecargo: boolean;
  /** Foto del comprobante en base64 (opcional) */
  comprobante: string | null;
}

/** Tamaño máximo del comprobante guardado (caracteres base64, ~1.5 MB). */
const MAX_COMPROBANTE = 2_000_000;

/** tardio = true cuando el pago se registró en una ronda que ya estaba cerrada */
export type ResultadoSimple = { ok: true; tardio?: boolean } | { ok: false; error: string };

export async function registrarPagoCuota(usuario: Usuario, d: DatosPago): Promise<ResultadoSimple> {
  if (!d.metodo) return { ok: false, error: 'Elige el método de pago' };
  if (!(METODOS_PAGO as readonly string[]).includes(d.metodo)) return { ok: false, error: 'Método de pago no válido' };
  if (!esFechaISOValida(d.fechaPago)) return { ok: false, error: 'La fecha del pago no es válida' };
  if (d.fechaPago > hoyISO()) return { ok: false, error: 'La fecha del pago no puede ser futura' };

  const ronda = await obtenerRonda(d.rondaId);
  if (!ronda) return { ok: false, error: 'La ronda no existe' };
  const tanda = await tandaDelUsuario(ronda.tandaId, usuario);
  if (!tanda) return { ok: false, error: 'No tienes acceso a esta tanda' };
  if (!tanda.esOrganizador) return { ok: false, error: 'Solo quien organiza la tanda puede registrar pagos' };
  if (d.comprobante && d.comprobante.length > MAX_COMPROBANTE) {
    return { ok: false, error: 'La foto del comprobante es demasiado grande' };
  }
  if (d.comprobante && !/^[A-Za-z0-9+/=\r\n]+$/.test(d.comprobante)) {
    return { ok: false, error: 'El comprobante no es una imagen válida' };
  }

  // Una ronda abierta solo recibe pagos si es la que está en curso. Una ronda ya CERRADA sí
  // admite pagos TARDÍOS: se suman al cobro del beneficiario (que se calcula siempre desde los pagos).
  if (!ronda.cerrada) {
    const rondas = await listarRondas(tanda.id);
    if (rondas.find((r) => !r.cerrada)?.id !== ronda.id) {
      return { ok: false, error: 'Solo se pueden registrar pagos en la ronda en curso' };
    }
  }
  if (!(await participanteDeTanda(d.participanteId, tanda.id))) {
    return { ok: false, error: 'El participante no pertenece a esta tanda' };
  }
  if (await buscarPago(d.rondaId, d.participanteId)) {
    return { ok: false, error: 'Esta cuota ya fue pagada' };
  }

  // El monto siempre es la cuota exacta de la tanda; el recargo se guarda aparte
  const recargo = d.cobrarRecargo ? calcularRecargo(tanda, ronda.fecha, d.fechaPago) : 0;
  try {
    const registrado = await registrarPago(d.rondaId, d.participanteId, tanda.cuota, d.fechaPago, d.metodo, recargo, d.comprobante);
    // Si dos solicitudes llegan a la vez, la base de datos deja pasar solo una (ON CONFLICT DO NOTHING)
    if (!registrado) return { ok: false, error: 'Esta cuota ya fue pagada' };
  } catch {
    // Última barrera de la base de datos (disparadores/restricciones): mensaje claro en vez de una excepción
    return { ok: false, error: 'No se pudo guardar el pago. Intenta de nuevo.' };
  }
  return { ok: true, tardio: ronda.cerrada === 1 };
}

// ───────────────────────── Cerrar ronda ─────────────────────────

export type ResultadoCierre =
  | { ok: true; tandaFinalizada: boolean }
  | { ok: false; motivo: 'confirmar'; pendientes: number; monto: number }
  | { ok: false; motivo: 'error'; mensaje: string };

/**
 * Cierra la ronda en curso. Si hay cuotas pendientes devuelve motivo "confirmar"
 * y solo cierra cuando se vuelve a llamar con confirmado = true.
 */
export async function cerrarRonda(
  usuario: Usuario,
  rondaId: number,
  confirmado: boolean
): Promise<ResultadoCierre> {
  const ronda = await obtenerRonda(rondaId);
  if (!ronda) return { ok: false, motivo: 'error', mensaje: 'La ronda no existe' };
  const tanda = await tandaDelUsuario(ronda.tandaId, usuario);
  if (!tanda) return { ok: false, motivo: 'error', mensaje: 'No tienes acceso a esta tanda' };
  if (!tanda.esOrganizador) {
    return { ok: false, motivo: 'error', mensaje: 'Solo quien organiza la tanda puede cerrar rondas' };
  }
  if (ronda.cerrada) return { ok: false, motivo: 'error', mensaje: 'La ronda ya está cerrada' };

  const rondas = await listarRondas(tanda.id);
  if (rondas.find((r) => !r.cerrada)?.id !== ronda.id) {
    return { ok: false, motivo: 'error', mensaje: 'Primero debes cerrar las rondas anteriores' };
  }

  const pendientes = tanda.participantesTotal - ronda.pagados;
  if (pendientes > 0 && !confirmado) {
    return { ok: false, motivo: 'confirmar', pendientes, monto: redondear2(pendientes * tanda.cuota) };
  }

  // Cierre + finalización de la tanda en una sola transacción (todo o nada)
  try {
    const tandaFinalizada = await cerrarRondaYFinalizar(rondaId, tanda.id);
    return { ok: true, tandaFinalizada };
  } catch {
    return { ok: false, motivo: 'error', mensaje: 'No se pudo cerrar la ronda. Intenta de nuevo.' };
  }
}
