/** CONTROLADOR de participantes: quién va al día y quién debe. */
import {
  esParticipanteConCuenta,
  listarParticipantesEstado,
  obtenerTandaBasica,
  type TandaBasica,
} from '../models/rondaModel';
import type { Usuario } from '../models/usuarioModel';
import { hoyISO } from '../utils/fechas';

export interface ParticipanteVista {
  id: number;
  usuarioId: number | null;
  nombre: string;
  telefono: string;
  turno: number;
  esAdmin: boolean;
  atrasadas: number;
  /** cuotas atrasadas × cuota */
  debe: number;
  alDia: boolean;
  pagadas: number;
  rondaCobro: number | null;
  fechaCobro: string | null;
  yaCobro: boolean;
}

export interface ParticipantesVista {
  tanda: TandaBasica;
  /** Solo el organizador puede enviar recordatorios */
  esOrganizador: boolean;
  items: ParticipanteVista[];
  alDia: number;
  conDeuda: number;
}

export async function obtenerParticipantes(tandaId: number, usuario: Usuario): Promise<ParticipantesVista | null> {
  const tanda = await obtenerTandaBasica(tandaId);
  if (!tanda) return null;
  const esOrganizador = tanda.usuarioId === usuario.id;
  if (!esOrganizador && !(await esParticipanteConCuenta(tandaId, usuario.id))) return null;

  const filas = await listarParticipantesEstado(tandaId, hoyISO());
  const items: ParticipanteVista[] = filas.map((f) => ({
    id: f.id,
    usuarioId: f.usuarioId,
    nombre: f.nombre,
    telefono: f.telefono,
    turno: f.turno,
    esAdmin: f.usuarioId === usuario.id,
    atrasadas: f.atrasadas,
    debe: f.atrasadas * tanda.cuota,
    alDia: f.atrasadas === 0,
    pagadas: f.pagadas,
    rondaCobro: f.rondaCobro,
    fechaCobro: f.fechaCobro,
    yaCobro: f.cobroCerrado === 1,
  }));

  return {
    tanda,
    esOrganizador,
    items,
    alDia: items.filter((i) => i.alDia).length,
    conDeuda: items.filter((i) => !i.alDia).length,
  };
}
