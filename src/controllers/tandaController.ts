/**
 * CONTROLADOR de tandas: arma los datos que necesita cada pantalla.
 */
import {
  cerrarRonda,
  crearTandaCompleta,
  listarResumenPorUsuario,
  obtenerProximoCobro,
  registrarPago,
  totalAhorrado,
  totalRecolectado,
  type Ahorro,
  type RecargoTipo,
  type ResumenTanda,
} from '../models/tandaModel';
import {
  buscarIdPorTelefono,
  buscarPorId,
  listarContactos,
  listarUsuarios,
  type Usuario,
} from '../models/usuarioModel';
import { esFechaISOValida, generarCalendario, hoyISO, sumarPeriodos, type Frecuencia } from '../utils/fechas';
import { redondear2, soloDigitos } from '../utils/formato';

export interface ProximoCobro {
  tandaId: number;
  tandaNombre: string;
  fecha: string;
  monto: number;
  rondaNumero: number;
}

export interface TandaVista extends ResumenTanda {
  esOrganizador: boolean;
  esMiTurno: boolean;
  montoARecibir: number;
  porcentaje: number;
}

export type TandaConDetalle = TandaVista;

export interface ResumenDashboard {
  ahorro: Ahorro;
  totalRecolectado: number;
  totalCobrado: number;
  tandas: TandaVista[];
  proximoCobro: ProximoCobro | null;
  totalRecolectadoGeneral?: number;
}

export async function obtenerResumenDashboard(usuario: Usuario): Promise<ResumenDashboard> {
  const [tandas, recolectado, ahorro, proximoCobroCrudo] = await Promise.all([
    listarResumenPorUsuario(usuario.id),
    totalRecolectado(usuario.id),
    totalAhorrado(usuario.id),
    obtenerProximoCobro(usuario.id).catch(() => null),
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
    proximoCobro: proximoCobroCrudo as ProximoCobro | null,
  };
}

// ───────────────────── Datos de ejemplo (solo desarrollo) ─────────────────────

const NOMBRES = [
  'Carlos Pérez', 'Miriam Flores', 'Ana Mejía', 'Luis Ordóñez', 'Karla Reyes', 'José Martínez',
  'Sofía Cárcamo', 'Daniel Zelaya', 'Gloria Núñez', 'Pedro Aguilar', 'Rosa Lagos', 'Marvin Castro',
];

interface Demo {
  nombre: string;
  cuota: number;
  frecuencia: Frecuencia;
  participantes: number;
  rondaActual: number;
  conmigo: boolean;
}

export async function sembrarDatosDemo(usuario: Usuario): Promise<void> {
  const demos: Demo[] = [
    { nombre: 'Cuchubal Familia Pérez', cuota: 500, frecuencia: 'quincenal', participantes: 10, rondaActual: 4, conmigo: false },
    { nombre: 'Tanda Compañeros Oficina', cuota: 1000, frecuencia: 'mensual', participantes: 8, rondaActual: 2, conmigo: false },
    { nombre: 'Ahorro Amigas del Barrio', cuota: 300, frecuencia: 'semanal', participantes: 12, rondaActual: 7, conmigo: true },
  ];
  const hoy = hoyISO();

  for (const demo of demos) {
    const inicio = sumarPeriodos(hoy, demo.frecuencia, -(demo.rondaActual - 1));
    const gente = Array.from({ length: demo.participantes }, (_, i) => ({
      nombre: NOMBRES[i % NOMBRES.length],
      telefono: `9${String(1000000 + i + demo.participantes).slice(0, 7)}`,
      usuarioId: null as number | null,
    }));
    if (demo.conmigo) {
      gente[demo.rondaActual - 1] = { nombre: usuario.nombre, telefono: usuario.telefono, usuarioId: usuario.id };
    }

    const tanda = await crearTandaCompleta({
      usuarioId: usuario.id,
      nombre: demo.nombre,
      cuota: demo.cuota,
      frecuencia: demo.frecuencia,
      fechaInicio: inicio,
      participantes: gente,
      calendario: generarCalendario(inicio, demo.frecuencia, demo.participantes),
    });

    for (const ronda of tanda.rondas) {
      if (ronda.numero < demo.rondaActual) {
        for (const p of tanda.participantes) await registrarPago(ronda.id, p.id, demo.cuota, ronda.fecha);
        await cerrarRonda(ronda.id);
      } else if (ronda.numero === demo.rondaActual) {
        const pagaron = Math.ceil(tanda.participantes.length * 0.6);
        for (const p of tanda.participantes.slice(0, pagaron)) {
          await registrarPago(ronda.id, p.id, demo.cuota, hoy);
        }
      }
    }
  }
}

// ───────────────────────── Nueva tanda ─────────────────────────

export const MIN_PARTICIPANTES = 3;
export const MAX_PARTICIPANTES = 30;
const CUOTA_MAXIMA = 1_000_000;

export interface ParticipanteForm {
  nombre: string;
  telefono: string;
  usuarioId?: number | null;
}

export interface DatosNuevaTanda {
  nombre: string;
  cuota: string | number;
  frecuencia: Frecuencia;
  fechaInicio: string;
  cantidad?: number;
  recargoTipo?: RecargoTipo;
  recargoValor?: string | number;
  participantes?: ParticipanteForm[];
}

export type ResultadoTanda =
  | { ok: true; tandaId: number }
  | { ok: false; errores: Record<string, string> };

export function aNumero(texto: string | number): number {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : 0;
  const n = Number(texto.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function sortear<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

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

export async function listarUsuariosParaElegir(): Promise<Usuario[]> {
  return listarUsuarios();
}

export interface OpcionParticipante {
  nombre: string;
  telefono: string;
  usuarioId: number | null;
  tipo: 'cuenta' | 'contacto';
}

export async function listarOpcionesParticipantes(usuario: Usuario): Promise<OpcionParticipante[]> {
  const [cuentas, contactos] = await Promise.all([listarUsuarios(), listarContactos(usuario.id)]);
  return [
    ...cuentas.map((u): OpcionParticipante => ({ nombre: u.nombre, telefono: u.telefono, usuarioId: u.id, tipo: 'cuenta' })),
    ...contactos.map((c): OpcionParticipante => ({ nombre: c.nombre, telefono: c.telefono, usuarioId: null, tipo: 'contacto' })),
  ];
}

const FRECUENCIAS: Frecuencia[] = ['semanal', 'quincenal', 'mensual'];

export async function crearTanda(usuarioIdOrUser: number | Usuario, d: DatosNuevaTanda): Promise<ResultadoTanda> {
  const usuarioId = typeof usuarioIdOrUser === 'object' ? usuarioIdOrUser.id : usuarioIdOrUser;
  
  const cuotaNum = typeof d.cuota === 'number' ? d.cuota : aNumero(d.cuota);
  const frecuencia = d.frecuencia || 'quincenal';
  const fechaInicio = d.fechaInicio || hoyISO();
  const participantesForm = d.participantes || [];

  const errores: Record<string, string> = {};
  const nombre = d.nombre.trim();

  if (nombre.length < 3) errores.nombre = 'Escribe un nombre para la tanda';
  else if (nombre.length > 40) errores.nombre = 'El nombre es demasiado largo (máximo 40)';

  if (!Number.isFinite(cuotaNum) || cuotaNum <= 0) errores.cuota = 'Ingresa una cuota válida mayor a cero';
  else if (cuotaNum > CUOTA_MAXIMA) errores.cuota = 'El monto es demasiado alto';

  if (!FRECUENCIAS.includes(frecuencia)) errores.frecuencia = 'Elige semanal, quincenal o mensual';

  if (!esFechaISOValida(fechaInicio)) errores.fecha = 'La fecha de inicio no es válida';
  else if (fechaInicio < hoyISO()) errores.fecha = 'La fecha no puede ser anterior a hoy';

  let participantesFinales = participantesForm;
  if (participantesFinales.length === 0) {
    participantesFinales = [
      { nombre: 'Participante 1', telefono: '90000001', usuarioId: null },
      { nombre: 'Participante 2', telefono: '90000002', usuarioId: null },
      { nombre: 'Participante 3', telefono: '90000003', usuarioId: null },
    ];
  }

  if (Object.keys(errores).length) {
    return { ok: false, errores };
  }

  const participantes = [];
  for (const p of participantesFinales) {
    let uId = p.usuarioId ?? null;
    let nombreP = p.nombre.trim();
    let telefono = soloDigitos(p.telefono);
    if (uId !== null) {
      const cuenta = await buscarPorId(uId);
      if (cuenta) {
        nombreP = cuenta.nombre;
        telefono = cuenta.telefono;
      } else {
        uId = null;
      }
    } else {
      uId = await buscarIdPorTelefono(telefono);
    }
    participantes.push({ nombre: nombreP, telefono, usuarioId: uId });
  }

  try {
    const creada = await crearTandaCompleta({
      usuarioId,
      nombre,
      cuota: redondear2(cuotaNum),
      frecuencia,
      fechaInicio,
      participantes,
      calendario: generarCalendario(fechaInicio, frecuencia, participantes.length),
    });
    return { ok: true, tandaId: creada.tandaId };
  } catch {
    return { ok: false, errores: { general: 'No se pudo guardar la tanda. Revisa los datos e intenta de nuevo.' } };
  }
}