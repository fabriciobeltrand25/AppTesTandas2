/** MODELO: acceso a tandas, participantes, rondas y pagos. Solo SQL. */
import { obtenerDB } from '../database/db';
import type { Frecuencia } from '../utils/fechas';
import { redondear2 } from '../utils/formato';

export type RecargoTipo = 'ninguno' | 'fijo' | 'porcentaje';

export interface RondaActual {
  id: number;
  numero: number;
  fecha: string;
  beneficiarioNombre: string;
  beneficiarioTelefono: string;
  /** Cuenta del beneficiario (null si es un participante sin cuenta) */
  beneficiarioUsuarioId: number | null;
  recolectado: number;
}

export interface ResumenTanda {
  id: number;
  nombre: string;
  cuota: number;
  frecuencia: Frecuencia;
  estado: 'activa' | 'finalizada';
  organizadorId: number;
  participantesTotal: number;
  totalRondas: number;
  rondasCerradas: number;
  rondaActual: RondaActual | null;
}

export interface ParticipanteNuevo {
  nombre: string;
  telefono: string;
  /** Cuenta vinculada (null si el participante no tiene cuenta) */
  usuarioId: number | null;
}

export interface DatosTanda {
  usuarioId: number;
  nombre: string;
  cuota: number;
  frecuencia: Frecuencia;
  fechaInicio: string;
  recargoTipo: RecargoTipo;
  recargoValor: number;
  /** El orden del arreglo define el turno: el primero cobra en la ronda 1, etc. */
  participantes: ParticipanteNuevo[];
  /** Fechas de cada ronda (una por participante), ya calculadas. */
  calendario: { numero: number; fecha: string }[];
}

export interface TandaCreada {
  tandaId: number;
  participantes: { id: number; turno: number }[];
  rondas: { id: number; numero: number; fecha: string }[];
}

/** Crea tanda + participantes + rondas en una sola transacción. */
export async function crearTandaCompleta(d: DatosTanda): Promise<TandaCreada> {
  const db = await obtenerDB();
  const resultado: TandaCreada = { tandaId: 0, participantes: [], rondas: [] };

  await db.withTransactionAsync(async () => {
    const t = await db.runAsync(
      `INSERT INTO tandas (usuario_id, nombre, cuota, frecuencia, fecha_inicio, recargo_tipo, recargo_valor)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.usuarioId, d.nombre, d.cuota, d.frecuencia, d.fechaInicio, d.recargoTipo, d.recargoValor]
    );
    resultado.tandaId = t.lastInsertRowId;

    for (let i = 0; i < d.participantes.length; i++) {
      const p = d.participantes[i];
      const r = await db.runAsync(
        'INSERT INTO participantes (tanda_id, nombre, telefono, turno, usuario_id) VALUES (?, ?, ?, ?, ?)',
        [resultado.tandaId, p.nombre, p.telefono, i + 1, p.usuarioId]
      );
      resultado.participantes.push({ id: r.lastInsertRowId, turno: i + 1 });
    }

    for (const ronda of d.calendario) {
      const beneficiario = resultado.participantes[ronda.numero - 1];
      const r = await db.runAsync(
        'INSERT INTO rondas (tanda_id, numero, fecha, beneficiario_id) VALUES (?, ?, ?, ?)',
        [resultado.tandaId, ronda.numero, ronda.fecha, beneficiario.id]
      );
      resultado.rondas.push({ id: r.lastInsertRowId, numero: ronda.numero, fecha: ronda.fecha });
    }
  });

  return resultado;
}

export async function registrarPago(
  rondaId: number,
  participanteId: number,
  monto: number,
  fechaPago: string,
  metodo: string | null = null,
  recargo = 0,
  comprobante: string | null = null
): Promise<boolean> {
  const db = await obtenerDB();
  const resultado = await db.runAsync(
    `INSERT INTO pagos (ronda_id, participante_id, monto, fecha_pago, metodo, recargo, comprobante)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (ronda_id, participante_id) DO NOTHING`,
    [rondaId, participanteId, monto, fechaPago, metodo, recargo, comprobante]
  );
  return resultado.changes > 0;
}

export async function obtenerComprobante(pagoId: number): Promise<string | null> {
  const db = await obtenerDB();
  const f = await db.getFirstAsync<{ comprobante: string | null }>(
    'SELECT comprobante FROM pagos WHERE id = ?',
    [pagoId]
  );
  return f?.comprobante ?? null;
}

export async function cerrarRonda(rondaId: number): Promise<void> {
  const db = await obtenerDB();
  await db.runAsync('UPDATE rondas SET cerrada = 1 WHERE id = ?', [rondaId]);
}

export interface ProximoCobro {
  fecha: string;
  monto: number;
  ronda: number;
  tandaNombre: string;
}

/** Próxima ronda abierta cuyo beneficiario es esta cuenta, aunque todavía no esté en curso. */
export async function obtenerProximoCobro(usuarioId: number): Promise<ProximoCobro | null> {
  const db = await obtenerDB();
  return db.getFirstAsync<ProximoCobro>(
    `SELECT r.fecha, r.numero AS ronda, t.nombre AS tandaNombre,
            ROUND(t.cuota * (SELECT COUNT(*) FROM participantes WHERE tanda_id = t.id), 2) AS monto
       FROM rondas r
       JOIN participantes p ON p.id = r.beneficiario_id
       JOIN tandas t ON t.id = r.tanda_id
      WHERE r.cerrada = 0 AND t.estado = 'activa' AND p.usuario_id = ?
      ORDER BY r.fecha, r.numero, r.id
      LIMIT 1`,
    [usuarioId]
  );
}

/**
 * Suma de los pagos (cuotas) registrados en las tandas que el usuario ORGANIZA.
 * Es la vista de "recolección del organizador"; NO es el ahorro personal (ver totalAhorrado).
 */
export async function totalRecolectado(usuarioId: number): Promise<number> {
  const db = await obtenerDB();
  const fila = await db.getFirstAsync<{ total: number }>(
    `SELECT ROUND(COALESCE(SUM(p.monto), 0), 2) AS total
       FROM pagos p
       JOIN rondas r ON r.id = p.ronda_id
       JOIN tandas t ON t.id = r.tanda_id
      WHERE t.usuario_id = ?`,
    [usuarioId]
  );
  return fila?.total ?? 0;
}

/**
 * Dinero que la CUENTA del usuario ya cobró: suma de las rondas CERRADAS
 * en las que él es el beneficiario (sin importar quién organiza la tanda).
 */
export async function totalCobrado(usuarioId: number): Promise<number> {
  const db = await obtenerDB();
  const fila = await db.getFirstAsync<{ total: number }>(
    `SELECT ROUND(COALESCE(SUM(pg.monto), 0), 2) AS total
       FROM pagos pg
       JOIN rondas r ON r.id = pg.ronda_id
       JOIN participantes pa ON pa.id = r.beneficiario_id
      WHERE r.cerrada = 1 AND pa.usuario_id = ?`,
    [usuarioId]
  );
  return fila?.total ?? 0;
}

export interface Ahorro {
  /** Cuotas que la CUENTA del usuario ha pagado, en cualquier tanda */
  pagado: number;
  /** Rondas CERRADAS que la cuenta del usuario ha ganado (cobrado), en cualquier tanda */
  ganado: number;
  /** pagado + ganado */
  total: number;
}

/**
 * AHORRO REAL del usuario en el cuchubal = cuotas que pagó + rondas que ganó (cerradas).
 * No depende de si organiza o no la tanda:
 *  - lo pagado sale de pagos.participante_id -> participantes.usuario_id (el que PAGA)
 *  - lo ganado sale de rondas.beneficiario_id -> participantes.usuario_id (el que COBRA),
 *    solo de rondas cerradas, sumando los pagos que entraron a esa ronda.
 * El organizador NO recibe el dinero de las rondas de otros: solo el beneficiario.
 * Los recargos por atraso no se cuentan (van aparte de la bolsa).
 */
export async function totalAhorrado(usuarioId: number): Promise<Ahorro> {
  const db = await obtenerDB();
  const fila = await db.getFirstAsync<{ pagado: number; ganado: number }>(
    `SELECT
       (SELECT ROUND(COALESCE(SUM(pg.monto), 0), 2)
          FROM pagos pg
          JOIN participantes pa ON pa.id = pg.participante_id
         WHERE pa.usuario_id = ?) AS pagado,
       (SELECT ROUND(COALESCE(SUM(pg.monto), 0), 2)
          FROM pagos pg
          JOIN rondas r ON r.id = pg.ronda_id
          JOIN participantes pb ON pb.id = r.beneficiario_id
         WHERE r.cerrada = 1 AND pb.usuario_id = ?) AS ganado`,
    [usuarioId, usuarioId]
  );
  const pagado = fila?.pagado ?? 0;
  const ganado = fila?.ganado ?? 0;
  return { pagado, ganado, total: redondear2(pagado + ganado) };
}

interface FilaTanda {
  id: number;
  nombre: string;
  cuota: number;
  frecuencia: Frecuencia;
  estado: 'activa' | 'finalizada';
  organizadorId: number;
}

/**
 * Tandas que el usuario puede ver: las que organiza y aquellas en las que
 * participa con su cuenta (vinculadas por usuario_id).
 */
export async function listarResumenPorUsuario(usuarioId: number): Promise<ResumenTanda[]> {
  const db = await obtenerDB();
  const tandas = await db.getAllAsync<FilaTanda>(
    `SELECT t.id, t.nombre, t.cuota, t.frecuencia, t.estado, t.usuario_id AS organizadorId
       FROM tandas t
      WHERE t.usuario_id = ?
         OR EXISTS (SELECT 1 FROM participantes p WHERE p.tanda_id = t.id AND p.usuario_id = ?)
      ORDER BY t.id`,
    [usuarioId, usuarioId]
  );

  const resumenes: ResumenTanda[] = [];
  for (const t of tandas) {
    const conteos = await db.getFirstAsync<{ total: number; cerradas: number; participantes: number }>(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(cerrada), 0) AS cerradas,
              (SELECT COUNT(*) FROM participantes WHERE tanda_id = ?) AS participantes
         FROM rondas WHERE tanda_id = ?`,
      [t.id, t.id]
    );

    const actual = await db.getFirstAsync<{
      id: number; numero: number; fecha: string; nombre: string; telefono: string;
      usuarioId: number | null; recolectado: number;
    }>(
      `SELECT r.id, r.numero, r.fecha,
              COALESCE(u.nombre, p.nombre) AS nombre,
              COALESCE(u.telefono, p.telefono) AS telefono,
              p.usuario_id AS usuarioId,
              (SELECT ROUND(COALESCE(SUM(monto), 0), 2) FROM pagos WHERE ronda_id = r.id) AS recolectado
         FROM rondas r
         JOIN participantes p ON p.id = r.beneficiario_id
         LEFT JOIN usuarios u ON u.id = p.usuario_id
        WHERE r.tanda_id = ? AND r.cerrada = 0
        ORDER BY r.numero
        LIMIT 1`,
      [t.id]
    );

    resumenes.push({
      ...t,
      participantesTotal: conteos?.participantes ?? 0,
      totalRondas: conteos?.total ?? 0,
      rondasCerradas: conteos?.cerradas ?? 0,
      rondaActual: actual
        ? {
            id: actual.id,
            numero: actual.numero,
            fecha: actual.fecha,
            beneficiarioNombre: actual.nombre,
            beneficiarioTelefono: actual.telefono,
            beneficiarioUsuarioId: actual.usuarioId,
            recolectado: actual.recolectado,
          }
        : null,
    });
  }
  return resumenes;
}

export interface CobroRecibido {
  rondaId: number;
  tandaId: number;
  tanda: string;
  numero: number;
  fecha: string;
  monto: number;
}

/** Cobros (rondas cerradas) en los que la cuenta del usuario fue la beneficiaria. */
export async function listarCobros(usuarioId: number, limite: number): Promise<CobroRecibido[]> {
  const db = await obtenerDB();
  return db.getAllAsync<CobroRecibido>(
    `SELECT r.id AS rondaId, t.id AS tandaId, t.nombre AS tanda, r.numero, r.fecha,
            (SELECT ROUND(COALESCE(SUM(monto), 0), 2) FROM pagos WHERE ronda_id = r.id) AS monto
       FROM rondas r
       JOIN participantes pa ON pa.id = r.beneficiario_id
       JOIN tandas t ON t.id = r.tanda_id
      WHERE r.cerrada = 1 AND pa.usuario_id = ?
      ORDER BY r.id DESC
      LIMIT ?`,
    [usuarioId, limite]
  );
}
