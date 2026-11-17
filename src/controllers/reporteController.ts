/** CONTROLADOR de reportes: arma el contenido del PDF "estado de la tanda" y el resumen general. */
import type { Usuario } from '../models/usuarioModel';
import { documentoHTML, esc } from '../utils/reportes';
import { etiquetaFrecuencia, fechaDMA, formatearLempiras } from '../utils/formato';
import { obtenerParticipantes } from './participanteController';
import { obtenerCalendario } from './rondaController';
import { obtenerResumenDashboard } from './tandaController';
import { hoyISO } from '../utils/fechas';

const pie = (usuario: Usuario) =>
  `<div class="pie">Generado con Mis Tandas el ${fechaDMA(hoyISO())} por ${esc(usuario.nombre)}</div>`;

/** Estado detallado de una tanda: rondas, pagos y participantes. */
export async function generarReporteTanda(usuario: Usuario, tandaId: number): Promise<string | null> {
  const cal = await obtenerCalendario(tandaId, usuario);
  if (!cal) return null;
  const part = await obtenerParticipantes(tandaId, usuario);
  const t = cal.tanda;
  const recolectado = cal.rondas.reduce((s, r) => s + r.recolectado, 0);

  const filasRondas = cal.rondas
    .map((r) => {
      const estado =
        r.estado === 'cerrada'
          ? '<span class="ok">Entregada</span>'
          : r.estado === 'en_curso'
          ? '<span class="cur">En curso</span>'
          : 'Pendiente';
      return `<tr><td>#${r.numero}</td><td>${fechaDMA(r.fecha)}</td><td>${esc(r.beneficiarioNombre)}</td>
        <td>${estado}</td><td>${formatearLempiras(r.recolectado)} / ${formatearLempiras(r.monto)}</td></tr>`;
    })
    .join('');

  const filasPart = (part?.items ?? [])
    .map(
      (p) => `<tr><td>${p.turno}</td><td>${esc(p.nombre)}</td><td>+504 ${esc(p.telefono)}</td>
        <td>${p.alDia ? '<span class="ok">Al día</span>' : `<span class="mal">Debe ${formatearLempiras(p.debe)}</span>`}</td></tr>`
    )
    .join('');

  return documentoHTML(`
    <h1>${esc(t.nombre)}</h1>
    <div class="sub">Cuota ${formatearLempiras(t.cuota)} • ${etiquetaFrecuencia(t.frecuencia)} • ${t.participantesTotal} participantes •
      ${fechaDMA(cal.fechaInicio)} al ${fechaDMA(cal.fechaFin)}</div>
    <div class="cajas">
      <div class="caja"><b>${formatearLempiras(cal.montoPorCobro)}</b><span>Bolsa por ronda</span></div>
      <div class="caja"><b>${cal.completadas} de ${cal.rondas.length}</b><span>Rondas entregadas</span></div>
      <div class="caja"><b>${formatearLempiras(recolectado)}</b><span>Total recolectado</span></div>
      <div class="caja"><b>${part?.conDeuda ?? 0}</b><span>Con cuotas atrasadas</span></div>
    </div>
    <h2>Calendario de rondas</h2>
    <table><tr><th>Ronda</th><th>Fecha</th><th>Cobra</th><th>Estado</th><th>Recolectado</th></tr>${filasRondas}</table>
    <h2>Participantes</h2>
    <table><tr><th>Turno</th><th>Nombre</th><th>Teléfono</th><th>Cuotas</th></tr>${filasPart}</table>
    ${pie(usuario)}`);
}

/** Resumen de todas las tandas del usuario. */
export async function generarReporteGeneral(usuario: Usuario): Promise<string> {
  const { ahorro, totalRecolectado, tandas } = await obtenerResumenDashboard(usuario);
  const filas = tandas
    .map(
      (t) => `<tr><td>${esc(t.nombre)}</td><td>${formatearLempiras(t.cuota)} / ${etiquetaFrecuencia(t.frecuencia)}</td>
        <td>${t.rondasCerradas} de ${t.totalRondas} (${t.porcentaje}%)</td>
        <td>${t.rondaActual ? `${esc(t.rondaActual.beneficiarioNombre)} • ${fechaDMA(t.rondaActual.fecha)}` : 'Finalizada'}</td></tr>`
    )
    .join('');

  return documentoHTML(`
    <h1>Resumen de mis tandas</h1>
    <div class="sub">${esc(usuario.nombre)} • ${fechaDMA(hoyISO())}</div>
    <div class="cajas">
      <div class="caja"><b>${formatearLempiras(ahorro.total)}</b><span>Total ahorrado</span></div>
      <div class="caja"><b>${formatearLempiras(ahorro.pagado)}</b><span>Cuotas pagadas</span></div>
      <div class="caja"><b>${formatearLempiras(ahorro.ganado)}</b><span>Rondas cobradas</span></div>
      <div class="caja"><b>${tandas.filter((t) => t.estado === 'activa').length}</b><span>Tandas activas</span></div>
    </div>
    ${totalRecolectado > 0 ? `<div class="sub">Recolectado como organizador: ${formatearLempiras(totalRecolectado)}</div>` : ''}
    <h2>Tandas</h2>
    ${tandas.length ? `<table><tr><th>Tanda</th><th>Cuota</th><th>Avance</th><th>Próximo cobro</th></tr>${filas}</table>` : '<p>Aún no hay tandas.</p>'}
    ${pie(usuario)}`);
}
