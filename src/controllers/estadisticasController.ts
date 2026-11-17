/** CONTROLADOR de estadísticas generales de las tandas del usuario. */
import { contarPagos, pagosPorMetodo, totalRecargos } from '../models/rondaModel';
import type { Usuario } from '../models/usuarioModel';
import { obtenerParticipantes } from './participanteController';
import { obtenerResumenDashboard } from './tandaController';

export interface EstadisticaMetodo {
  metodo: string;
  cantidad: number;
  monto: number;
  porcentaje: number;
}

export interface EstadisticaTanda {
  id: number;
  nombre: string;
  porcentaje: number;
  rondasCerradas: number;
  totalRondas: number;
  recolectadoActual: number;
  esperadoActual: number;
}

export interface Estadisticas {
  /** Ahorro real: cuotas que pagaste + rondas que cobraste */
  totalAhorrado: number;
  /** Cuotas que la cuenta del usuario ha pagado */
  cuotasPagadasMonto: number;
  /** Recolección como organizador */
  totalRecolectado: number;
  /** Lo que la cuenta del usuario ya cobró como beneficiario ("Has cobrado") */
  totalCobrado: number;
  /** Recargos por atraso cobrados (aparte de la bolsa) */
  recargosCobrados: number;
  pagosRegistrados: number;
  cuotasAtrasadas: number;
  /** pagadas / (pagadas + atrasadas), 0 a 100 */
  cumplimiento: number;
  tandasActivas: number;
  tandasFinalizadas: number;
  porMetodo: EstadisticaMetodo[];
  tandas: EstadisticaTanda[];
}

export async function obtenerEstadisticas(usuario: Usuario): Promise<Estadisticas> {
  const [resumen, pagos, metodos, recargos] = await Promise.all([
    obtenerResumenDashboard(usuario),
    contarPagos(usuario.id),
    pagosPorMetodo(usuario.id),
    totalRecargos(usuario.id),
  ]);

  let atrasadas = 0;
  for (const t of resumen.tandas) {
    if (!t.esOrganizador) continue; // las cuotas atrasadas solo las gestiona el organizador
    const p = await obtenerParticipantes(t.id, usuario);
    atrasadas += p?.items.reduce((suma, i) => suma + i.atrasadas, 0) ?? 0;
  }

  const totalMetodos = metodos.reduce((s, m) => s + m.cantidad, 0);
  const base = pagos + atrasadas;

  return {
    totalAhorrado: resumen.ahorro.total,
    cuotasPagadasMonto: resumen.ahorro.pagado,
    totalRecolectado: resumen.totalRecolectado,
    totalCobrado: resumen.ahorro.ganado,
    recargosCobrados: recargos,
    pagosRegistrados: pagos,
    cuotasAtrasadas: atrasadas,
    cumplimiento: base ? Math.round((pagos / base) * 100) : 100,
    tandasActivas: resumen.tandas.filter((t) => t.estado === 'activa').length,
    tandasFinalizadas: resumen.tandas.filter((t) => t.estado === 'finalizada').length,
    porMetodo: metodos.map((m) => ({
      ...m,
      porcentaje: totalMetodos ? Math.round((m.cantidad / totalMetodos) * 100) : 0,
    })),
    tandas: resumen.tandas.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      porcentaje: t.porcentaje,
      rondasCerradas: t.rondasCerradas,
      totalRondas: t.totalRondas,
      recolectadoActual: t.rondaActual?.recolectado ?? 0,
      esperadoActual: t.montoARecibir,
    })),
  };
}
