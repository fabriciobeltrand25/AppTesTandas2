/** MODELO: consultas de rondas, pagos por ronda y estado de participantes. Solo SQL. */
import { obtenerDB } from '../database/db';
import type { Frecuencia } from '../utils/fechas';

export interface TandaBasica {
  id: number;
  usuarioId: number;
  nombre: string;
  cuota: number;
  frecuencia: Frecuencia;
  fechaInicio: string;
  estado: 'activa' | 'finalizada';
  recargoTipo: 'ninguno' | 'fijo' | 'porcentaje';
  recargoValor: number;
  participantesTotal: number;
}

export interface RondaResumen {
  id: number;
  tandaId: number;
  numero: number;
  fecha: string;
  cerrada: number; // 0 | 1
  beneficiarioId: number;
  beneficiarioNombre: string;
  beneficiarioTelefono: string;
  beneficiarioUsuarioId: number | null;
  beneficiarioTurno: number;
  pagados: number;
  recolectado: number;
}

export interface FilaPago {
  participanteId: number;
  nombre: string;
  telefono: string;
  turno: number;
  usuarioId: number | null;
  pagoId: number | null;
  monto: number | null;
  recargo: number | null;
  fechaPago: string | null;
  metodo: string | null;
  tieneComprobante: number;
}

export interface ParticipanteEstado {
  id: number;
  usuarioId: number | null;
  nombre: string;
  telefono: string;
  turno: number;
  atrasadas: number;
  pagadas: number;
  rondaCobro: number | null;
  fechaCobro: string | null;
  cobroCerrado: number | null;
}

const SELECT_RONDA = `
  SELECT r.id, r.tanda_id AS tandaId, r.numero, r.fecha, r.cerrada,
         r.beneficiario_id AS beneficiarioId,
         COALESCE(u.nombre, p.nombre) AS beneficiarioNombre,
         COALESCE(u.telefono, p.telefono) AS beneficiarioTelefono,
         p.usuario_id AS beneficiarioUsuarioId,
         p.turno AS beneficiarioTurno,
         (SELECT COUNT(*) FROM pagos WHERE ronda_id = r.id) AS pagados,
         (SELECT ROUND(COALESCE(SUM(monto), 0), 2) FROM pagos WHERE ronda_id = r.id) AS recolectado
    FROM rondas r
    JOIN participantes p ON p.id = r.beneficiario_id
    LEFT JOIN usuarios u ON u.id = p.usuario_id`;

export async function obtenerTandaBasica(id: number): Promise<TandaBasica | null> {
  const db = await obtenerDB();
  return db.getFirstAsync<TandaBasica>(
    `SELECT t.id, t.usuario_id AS usuarioId, t.nombre, t.cuota, t.frecuencia,
            t.fecha_inicio AS fechaInicio, t.estado,
            t.recargo_tipo AS recargoTipo, t.recargo_valor AS recargoValor,
            (SELECT COUNT(*) FROM participantes WHERE tanda_id = t.id) AS participantesTotal
       FROM tandas t WHERE t.id = ?`,
    [id]
  );
}

export async function listarRondas(tandaId: number): Promise<RondaResumen[]> {
  const db = await obtenerDB();
  return db.getAllAsync<RondaResumen>(`${SELECT_RONDA} WHERE r.tanda_id = ? ORDER BY r.numero`, [tandaId]);
}

export async function obtenerRonda(rondaId: number): Promise<RondaResumen | null> {
  const db = await obtenerDB();
  return db.getFirstAsync<RondaResumen>(`${SELECT_RONDA} WHERE r.id = ?`, [rondaId]);
}

/** Todos los participantes de la tanda con su pago (si ya pagó) en la ronda indicada. */
export async function listarPagosDeRonda(rondaId: number, tandaId: number): Promise<FilaPago[]> {
  const db = await obtenerDB();
  return db.getAllAsync<FilaPago>(
    `SELECT pa.id AS participanteId,
            COALESCE(u.nombre, pa.nombre) AS nombre,
            COALESCE(u.telefono, pa.telefono) AS telefono,
            pa.turno, pa.usuario_id AS usuarioId,
            pg.id AS pagoId, pg.monto, pg.recargo, pg.fecha_pago AS fechaPago, pg.metodo,
            CASE WHEN pg.comprobante IS NULL THEN 0 ELSE 1 END AS tieneComprobante
       FROM participantes pa
       LEFT JOIN usuarios u ON u.id = pa.usuario_id
       LEFT JOIN pagos pg ON pg.participante_id = pa.id AND pg.ronda_id = ?
      WHERE pa.tanda_id = ?
      ORDER BY pa.turno`,
    [rondaId, tandaId]
  );
}

export async function buscarPago(rondaId: number, participanteId: number): Promise<{ id: number } | null> {
  const db = await obtenerDB();
  return db.getFirstAsync<{ id: number }>(
    'SELECT id FROM pagos WHERE ronda_id = ? AND participante_id = ?',
    [rondaId, participanteId]
  );
}

export async function participanteDeTanda(
  participanteId: number,
  tandaId: number
): Promise<{ id: number } | null> {
  const db = await obtenerDB();
  return db.getFirstAsync<{ id: number }>(
    'SELECT id FROM participantes WHERE id = ? AND tanda_id = ?',
    [participanteId, tandaId]
  );
}

/** Cierra la ronda y finaliza la tanda en una misma transacción. Devuelve true si finalizó. */
export async function cerrarRondaYFinalizar(rondaId: number, tandaId: number): Promise<boolean> {
  const db = await obtenerDB();
  let finalizada = false;
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE rondas SET cerrada = 1 WHERE id = ? AND tanda_id = ?', [rondaId, tandaId]);
    const r = await db.runAsync(
      `UPDATE tandas SET estado = 'finalizada'
        WHERE id = ? AND NOT EXISTS (SELECT 1 FROM rondas WHERE tanda_id = ? AND cerrada = 0)`,
      [tandaId, tandaId]
    );
    finalizada = r.changes > 0;
  });
  return finalizada;
}

/**
 * Participantes con su estado de cuotas.
 * "Atrasada" = ronda cerrada, o con fecha anterior a hoy, en la que no pagó.
 */
export async function listarParticipantesEstado(tandaId: number, hoy: string): Promise<ParticipanteEstado[]> {
  const db = await obtenerDB();
  return db.getAllAsync<ParticipanteEstado>(
    `SELECT pa.id, pa.usuario_id AS usuarioId,
            COALESCE(u.nombre, pa.nombre) AS nombre,
            COALESCE(u.telefono, pa.telefono) AS telefono,
            pa.turno,
            (SELECT COUNT(*) FROM rondas r
              WHERE r.tanda_id = pa.tanda_id AND (r.cerrada = 1 OR r.fecha < ?)
                AND NOT EXISTS (SELECT 1 FROM pagos pg WHERE pg.ronda_id = r.id AND pg.participante_id = pa.id)
            ) AS atrasadas,
            (SELECT COUNT(*) FROM pagos pg WHERE pg.participante_id = pa.id) AS pagadas,
            (SELECT numero  FROM rondas WHERE beneficiario_id = pa.id) AS rondaCobro,
            (SELECT fecha   FROM rondas WHERE beneficiario_id = pa.id) AS fechaCobro,
            (SELECT cerrada FROM rondas WHERE beneficiario_id = pa.id) AS cobroCerrado
       FROM participantes pa
       LEFT JOIN usuarios u ON u.id = pa.usuario_id
      WHERE pa.tanda_id = ?
      ORDER BY pa.turno`,
    [hoy, tandaId]
  );
}

// ───────────────────────── Avisos y estadísticas ─────────────────────────

export interface PagoReciente {
  id: number;
  monto: number;
  fechaPago: string;
  metodo: string | null;
  participante: string;
  tanda: string;
  tandaId: number;
  ronda: number;
  rondaId: number;
}

/** Últimos pagos registrados en las tandas que el usuario puede ver (organiza o participa). */
export async function listarPagosRecientes(usuarioId: number, limite: number): Promise<PagoReciente[]> {
  const db = await obtenerDB();
  return db.getAllAsync<PagoReciente>(
    `SELECT pg.id, pg.monto, pg.fecha_pago AS fechaPago, pg.metodo,
            COALESCE(u.nombre, pa.nombre) AS participante, t.nombre AS tanda, t.id AS tandaId,
            r.numero AS ronda, r.id AS rondaId
       FROM pagos pg
       JOIN rondas r ON r.id = pg.ronda_id
       JOIN participantes pa ON pa.id = pg.participante_id
       LEFT JOIN usuarios u ON u.id = pa.usuario_id
       JOIN tandas t ON t.id = r.tanda_id
      WHERE t.usuario_id = ?
         OR EXISTS (SELECT 1 FROM participantes px WHERE px.tanda_id = t.id AND px.usuario_id = ?)
      ORDER BY pg.id DESC
      LIMIT ?`,
    [usuarioId, usuarioId, limite]
  );
}

export interface PagosPorMetodo {
  metodo: string;
  cantidad: number;
  monto: number;
}

export async function pagosPorMetodo(usuarioId: number): Promise<PagosPorMetodo[]> {
  const db = await obtenerDB();
  return db.getAllAsync<PagosPorMetodo>(
    `SELECT COALESCE(pg.metodo, 'Sin especificar') AS metodo, COUNT(*) AS cantidad, ROUND(SUM(pg.monto), 2) AS monto
       FROM pagos pg
       JOIN rondas r ON r.id = pg.ronda_id
       JOIN tandas t ON t.id = r.tanda_id
      WHERE t.usuario_id = ?
      GROUP BY COALESCE(pg.metodo, 'Sin especificar')
      ORDER BY cantidad DESC`,
    [usuarioId]
  );
}

export async function contarPagos(usuarioId: number): Promise<number> {
  const db = await obtenerDB();
  const f = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM pagos pg
       JOIN rondas r ON r.id = pg.ronda_id
       JOIN tandas t ON t.id = r.tanda_id
      WHERE t.usuario_id = ?`,
    [usuarioId]
  );
  return f?.n ?? 0;
}

/** true si la cuenta participa (está vinculada) en la tanda. */
export async function esParticipanteConCuenta(tandaId: number, usuarioId: number): Promise<boolean> {
  const db = await obtenerDB();
  const f = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM participantes WHERE tanda_id = ? AND usuario_id = ? LIMIT 1',
    [tandaId, usuarioId]
  );
  return f !== null;
}

/** Suma de los recargos por atraso cobrados en las tandas que el usuario organiza. */
export async function totalRecargos(usuarioId: number): Promise<number> {
  const db = await obtenerDB();
  const f = await db.getFirstAsync<{ total: number }>(
    `SELECT ROUND(COALESCE(SUM(pg.recargo), 0), 2) AS total
       FROM pagos pg
       JOIN rondas r ON r.id = pg.ronda_id
       JOIN tandas t ON t.id = r.tanda_id
      WHERE t.usuario_id = ?`,
    [usuarioId]
  );
  return f?.total ?? 0;
}

/** Ronda a la que pertenece un pago (para comprobar permisos antes de mostrar su comprobante). */
export async function rondaDeUnPago(pagoId: number): Promise<number | null> {
  const db = await obtenerDB();
  const f = await db.getFirstAsync<{ ronda_id: number }>('SELECT ronda_id FROM pagos WHERE id = ?', [pagoId]);
  return f?.ronda_id ?? null;
}
