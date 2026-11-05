/** MODELO: acceso a tandas, participantes, rondas y pagos. Solo SQL. */
import { obtenerDB } from '../database/db';
import type { Frecuencia } from '../utils/fechas';

export type RecargoTipo = 'ninguno' | 'fijo' | 'porcentaje';

export interface Ahorro {
  ganado: number;
}

export interface ProximoCobro {
  tandaId: number;
  tandaNombre: string;
  fecha: string;
  monto: number;
  rondaNumero: number;
}

export interface RondaActual {
  id: number;
  numero: number;
  fecha: string;
  beneficiarioNombre: string;
  beneficiarioTelefono: string;
  beneficiarioUsuarioId: number | null;
  recolectado: number;
}

export interface ResumenTanda {
  id: number;
  organizadorId: number;
  nombre: string;
  cuota: number;
  frecuencia: Frecuencia;
  estado: 'activa' | 'finalizada';
  participantesTotal: number;
  totalRondas: number;
  rondasCerradas: number;
  rondaActual: RondaActual | null;
}

export interface DatosTanda {
  usuarioId: number;
  nombre: string;
  cuota: number;
  frecuencia: Frecuencia;
  fechaInicio: string;
  /** El orden del arreglo define el turno: el primero cobra en la ronda 1, etc. */
  participantes: { nombre: string; telefono: string }[];
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
      'INSERT INTO tandas (usuario_id, nombre, cuota, frecuencia, fecha_inicio) VALUES (?, ?, ?, ?, ?)',
      [d.usuarioId, d.nombre, d.cuota, d.frecuencia, d.fechaInicio]
    );
    resultado.tandaId = t.lastInsertRowId;

    for (let i = 0; i < d.participantes.length; i++) {
      const p = d.participantes[i];
      const r = await db.runAsync(
        'INSERT INTO participantes (tanda_id, nombre, telefono, turno) VALUES (?, ?, ?, ?)',
        [resultado.tandaId, p.nombre, p.telefono, i + 1]
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
  fechaPago: string
): Promise<void> {
  const db = await obtenerDB();
  await db.runAsync(
    'INSERT INTO pagos (ronda_id, participante_id, monto, fecha_pago) VALUES (?, ?, ?, ?)',
    [rondaId, participanteId, monto, fechaPago]
  );
}

export async function totalAhorrado(usuarioId: number): Promise<Ahorro> {
  return { ganado: await totalRecolectado(usuarioId) };
}

export async function obtenerProximoCobro(usuarioId: number): Promise<ProximoCobro | null> {
  const db = await obtenerDB();
  return db.getFirstAsync<ProximoCobro>(
    `SELECT t.id AS tandaId, t.nombre AS tandaNombre, r.fecha,
            t.cuota * (SELECT COUNT(*) FROM participantes WHERE tanda_id = t.id) AS monto,
            r.numero AS rondaNumero
       FROM tandas t
       JOIN rondas r ON r.tanda_id = t.id
       JOIN participantes p ON p.id = r.beneficiario_id
      WHERE t.usuario_id = ? AND r.cerrada = 0
      ORDER BY r.fecha, r.numero
      LIMIT 1`,
    [usuarioId]
  );
}

export async function cerrarRonda(rondaId: number): Promise<void> {
  const db = await obtenerDB();
  await db.runAsync('UPDATE rondas SET cerrada = 1 WHERE id = ?', [rondaId]);
}

/** Suma de todos los pagos registrados en las tandas del usuario. */
export async function totalRecolectado(usuarioId: number): Promise<number> {
  const db = await obtenerDB();
  const fila = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(p.monto), 0) AS total
       FROM pagos p
       JOIN rondas r ON r.id = p.ronda_id
       JOIN tandas t ON t.id = r.tanda_id
      WHERE t.usuario_id = ?`,
    [usuarioId]
  );
  return fila?.total ?? 0;
}

interface FilaTanda {
  id: number;
  organizadorId: number;
  nombre: string;
  cuota: number;
  frecuencia: Frecuencia;
  estado: 'activa' | 'finalizada';
}

/** Lista las tandas del usuario con el avance de cada una. */
export async function listarResumenPorUsuario(usuarioId: number): Promise<ResumenTanda[]> {
  const db = await obtenerDB();
  const tandas = await db.getAllAsync<FilaTanda>(
    'SELECT id, usuario_id AS organizadorId, nombre, cuota, frecuencia, estado FROM tandas WHERE usuario_id = ? ORDER BY id',
    [usuarioId]
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
      beneficiarioUsuarioId: number | null; recolectado: number;
    }>(
      `SELECT r.id, r.numero, r.fecha, p.nombre, p.telefono,
              (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE ronda_id = r.id) AS recolectado
         FROM rondas r
         JOIN participantes p ON p.id = r.beneficiario_id
         LEFT JOIN usuarios u ON u.telefono = p.telefono
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
            beneficiarioUsuarioId: actual.beneficiarioUsuarioId,
            recolectado: actual.recolectado,
          }
        : null,
    });
  }
  return resumenes;
}
