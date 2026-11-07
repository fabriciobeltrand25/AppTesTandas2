/**
 * CONTROLADOR de tandas: arma los datos que necesita cada pantalla.
 */
import {
  cerrarRonda,
  crearTandaCompleta,
  listarResumenPorUsuario,
  registrarPago,
  totalRecolectado,
  type ResumenTanda,
} from '../models/tandaModel';
import type { Usuario } from '../models/usuarioModel';
import { generarCalendario, hoyISO, sumarPeriodos, type Frecuencia } from '../utils/fechas';
import { soloDigitos } from '../utils/formato';

export interface TandaVista extends ResumenTanda {
  /** true si el usuario es quien cobra en la ronda actual */
  esMiTurno: boolean;
  /** cuota × participantes */
  montoARecibir: number;
  /** 0 a 100 */
  porcentaje: number;
}

export interface ProximoCobro {
  fecha: string;
  monto: number;
  ronda: number;
  tandaNombre: string;
}

export interface ResumenDashboard {
  totalRecolectado: number;
  tandas: TandaVista[];
  proximoCobro: ProximoCobro | null;
}

export async function obtenerResumenDashboard(usuario: Usuario): Promise<ResumenDashboard> {
  const [tandas, total] = await Promise.all([
    listarResumenPorUsuario(usuario.id),
    totalRecolectado(usuario.id),
  ]);

  const vistas: TandaVista[] = tandas.map((t) => ({
    ...t,
    esMiTurno: t.rondaActual?.beneficiarioTelefono === usuario.telefono,
    montoARecibir: t.cuota * t.participantesTotal,
    porcentaje: t.totalRondas ? Math.round((t.rondasCerradas / t.totalRondas) * 100) : 0,
  }));

  // El próximo cobro es la ronda abierta con la fecha más cercana.
  const conRonda = vistas.filter((t) => t.rondaActual);
  conRonda.sort((a, b) => a.rondaActual!.fecha.localeCompare(b.rondaActual!.fecha));
  const primera = conRonda[0];

  return {
    totalRecolectado: total,
    tandas: vistas,
    proximoCobro: primera
      ? {
          fecha: primera.rondaActual!.fecha,
          monto: primera.montoARecibir,
          ronda: primera.rondaActual!.numero,
          tandaNombre: primera.nombre,
        }
      : null,
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

/** Crea 3 tandas de ejemplo para ver cómo luce el dashboard con datos. */
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
      telefono: `9${String(1000000 + i * 137 + demo.participantes).slice(0, 7)}`,
    }));
    if (demo.conmigo) {
      gente[demo.rondaActual - 1] = { nombre: usuario.nombre, telefono: usuario.telefono };
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
  telefono: string; // 8 dígitos
}

export interface DatosNuevaTanda {
  nombre: string;
  cuota: string; // texto tal como lo escribe el usuario
  frecuencia: Frecuencia;
  fechaInicio: string; // YYYY-MM-DD
  cantidad: number;
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

export async function crearTanda(usuario: Usuario, d: DatosNuevaTanda): Promise<ResultadoTanda> {
  const errores: Record<string, string> = {};
  const cuota = aNumero(d.cuota);

  if (d.nombre.trim().length < 3) errores.nombre = 'Escribe un nombre para la tanda';
  if (cuota <= 0) errores.cuota = 'Ingresa el monto de la cuota';
  else if (cuota > CUOTA_MAXIMA) errores.cuota = 'El monto es demasiado alto';
  if (d.fechaInicio < hoyISO()) errores.fecha = 'La fecha no puede ser anterior a hoy';
  if (d.cantidad < MIN_PARTICIPANTES || d.cantidad > MAX_PARTICIPANTES) {
    errores.cantidad = `Debe haber entre ${MIN_PARTICIPANTES} y ${MAX_PARTICIPANTES} participantes`;
  }
  if (!errores.cantidad && d.participantes.length !== d.cantidad) {
    const faltan = d.cantidad - d.participantes.length;
    errores.participantes =
      faltan > 0
        ? `Faltan ${faltan} participante${faltan === 1 ? '' : 's'} por registrar`
        : `Sobran ${-faltan} participante${faltan === -1 ? '' : 's'}`;
  }
  if (Object.keys(errores).length) return { ok: false, errores };

  // Una ronda por participante: cada persona cobra una sola vez.
  const creada = await crearTandaCompleta({
    usuarioId: usuario.id,
    nombre: d.nombre.trim(),
    cuota,
    frecuencia: d.frecuencia,
    fechaInicio: d.fechaInicio,
    participantes: d.participantes.map((p) => ({ nombre: p.nombre.trim(), telefono: p.telefono })),
    calendario: generarCalendario(d.fechaInicio, d.frecuencia, d.participantes.length),
  });
  return { ok: true, tandaId: creada.tandaId };
}
