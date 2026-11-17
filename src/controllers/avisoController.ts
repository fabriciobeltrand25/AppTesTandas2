/**
 * CONTROLADOR de avisos: arma la bandeja "Avisos" a partir de los datos guardados
 * (rondas por vencer, turno de cobro, cuotas atrasadas y pagos recientes).
 */
import { listarPagosRecientes } from '../models/rondaModel';
import { listarCobros } from '../models/tandaModel';
import type { Usuario } from '../models/usuarioModel';
import { diferenciaDias, hoyISO } from '../utils/fechas';
import { fechaCorta, formatearLempiras } from '../utils/formato';
import { obtenerParticipantes } from './participanteController';
import { obtenerDetalleRonda } from './rondaController';
import { obtenerResumenDashboard } from './tandaController';

export type NivelAviso = 'alerta' | 'info' | 'exito';

export interface Aviso {
  id: string;
  nivel: NivelAviso;
  titulo: string;
  detalle: string;
  /** Texto corto a la derecha (fecha o plazo) */
  marca?: string;
  ruta?: { pathname: string; params: Record<string, string> };
}

export interface BandejaAvisos {
  importantes: Aviso[];
  actividad: Aviso[];
}

function plazo(dias: number): string {
  if (dias < 0) return `Venció hace ${-dias} ${dias === -1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
}

export async function obtenerAvisos(usuario: Usuario): Promise<BandejaAvisos> {
  const hoy = hoyISO();
  const { tandas } = await obtenerResumenDashboard(usuario);
  const importantes: Aviso[] = [];

  for (const t of tandas) {
    if (t.estado !== 'activa' || !t.rondaActual) continue;
    const r = t.rondaActual;
    const dias = diferenciaDias(hoy, r.fecha);
    const pagadas = Math.round(r.recolectado / t.cuota);
    const faltan = t.participantesTotal - pagadas;
    const rutaRonda = { pathname: '/ronda', params: { rondaId: String(r.id) } };

    if (t.esMiTurno && dias <= 7) {
      importantes.push({
        id: `cobro-${r.id}`,
        nivel: 'exito',
        titulo: dias <= 0 ? '¡Hoy te toca cobrar!' : 'Pronto te toca cobrar',
        detalle: `${t.nombre} • Ronda #${r.numero} • ${formatearLempiras(t.montoARecibir)}`,
        marca: plazo(dias),
        ruta: rutaRonda,
      });
    }

    if (dias < 0) {
      importantes.push({
        id: `vencida-${r.id}`,
        nivel: 'alerta',
        titulo: `Ronda #${r.numero} vencida`,
        detalle: `${t.nombre}: faltan ${faltan} ${faltan === 1 ? 'cuota' : 'cuotas'} por registrar.`,
        marca: plazo(dias),
        ruta: rutaRonda,
      });
    } else if (dias <= 3 && faltan > 0) {
      importantes.push({
        id: `vence-${r.id}`,
        nivel: 'info',
        titulo: `La ronda #${r.numero} vence ${dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`}`,
        detalle: `${t.nombre}: ${pagadas} de ${t.participantesTotal} cuotas registradas.`,
        marca: fechaCorta(r.fecha),
        ruta: rutaRonda,
      });
    }

    // Si participo (no organizo), avisar si mi cuota de esta ronda sigue pendiente
    if (!t.esOrganizador) {
      const det = await obtenerDetalleRonda(r.id, usuario);
      const mia = det?.pendientes.find((x) => x.esMio);
      if (mia) {
        importantes.push({
          id: `micuota-${r.id}`,
          nivel: dias < 0 ? 'alerta' : 'info',
          titulo: `Tu cuota de la ronda #${r.numero} está pendiente`,
          detalle: `${t.nombre}: ${formatearLempiras(t.cuota)}. Págasela al organizador.`,
          marca: plazo(dias),
          ruta: rutaRonda,
        });
      }
    }

    const p = t.esOrganizador ? await obtenerParticipantes(t.id, usuario) : null;
    if (p && p.conDeuda > 0) {
      importantes.push({
        id: `deuda-${t.id}`,
        nivel: 'alerta',
        titulo: `${p.conDeuda} ${p.conDeuda === 1 ? 'participante con' : 'participantes con'} cuotas atrasadas`,
        detalle: `${t.nombre}: toca para enviar recordatorios.`,
        ruta: { pathname: '/participantes', params: { tandaId: String(t.id) } },
      });
    }
  }

  const orden: Record<NivelAviso, number> = { alerta: 0, exito: 1, info: 2 };
  importantes.sort((a, b) => orden[a.nivel] - orden[b.nivel]);

  // Cobros recibidos por MI cuenta (rondas cerradas donde fui el beneficiario)
  const cobros = await listarCobros(usuario.id, 5);
  const avisosCobros: Aviso[] = cobros.map((c) => ({
    id: `cobrado-${c.rondaId}`,
    nivel: 'exito',
    titulo: `Cobraste ${formatearLempiras(c.monto)}`,
    detalle: `${c.tanda} • ronda #${c.numero}`,
    marca: fechaCorta(c.fecha),
    ruta: { pathname: '/ronda', params: { rondaId: String(c.rondaId) } },
  }));

  const recientes = await listarPagosRecientes(usuario.id, 8);
  const pagos: Aviso[] = recientes.map((p) => ({
    id: `pago-${p.id}`,
    nivel: 'exito',
    titulo: `Pago registrado: ${p.participante}`,
    detalle: `${formatearLempiras(p.monto)} • ${p.tanda} • ronda #${p.ronda}${p.metodo ? ` • ${p.metodo}` : ''}`,
    marca: fechaCorta(p.fechaPago),
    ruta: { pathname: '/ronda', params: { rondaId: String(p.rondaId) } },
  }));

  return { importantes, actividad: [...avisosCobros, ...pagos] };
}
