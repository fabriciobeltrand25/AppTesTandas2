/** MODELO: límite de intentos fallidos (login, PIN de recuperación, contraseña del perfil). */
import { obtenerDB } from '../database/db';

export interface EstadoIntentos {
  intentos: number;
  /** momento (ms) hasta el que está bloqueado; 0 si no lo está */
  bloqueadoHasta: number;
}

export async function leerIntentos(clave: string): Promise<EstadoIntentos> {
  const db = await obtenerDB();
  const f = await db.getFirstAsync<{ intentos: number; bloqueado_hasta: number }>(
    'SELECT intentos, bloqueado_hasta FROM seguridad_intentos WHERE clave = ?',
    [clave]
  );
  return { intentos: f?.intentos ?? 0, bloqueadoHasta: f?.bloqueado_hasta ?? 0 };
}

/**
 * Suma un fallo. Al llegar al máximo bloquea durante bloqueoMs y reinicia el contador.
 * Devuelve el estado resultante.
 */
export async function sumarFallo(clave: string, maxIntentos: number, bloqueoMs: number, ahora: number): Promise<EstadoIntentos> {
  const db = await obtenerDB();
  const actual = await leerIntentos(clave);
  const intentos = actual.intentos + 1;
  const bloquear = intentos >= maxIntentos;
  const nuevo: EstadoIntentos = { intentos: bloquear ? 0 : intentos, bloqueadoHasta: bloquear ? ahora + bloqueoMs : 0 };
  await db.runAsync(
    `INSERT INTO seguridad_intentos (clave, intentos, bloqueado_hasta) VALUES (?, ?, ?)
     ON CONFLICT(clave) DO UPDATE SET intentos = excluded.intentos, bloqueado_hasta = excluded.bloqueado_hasta`,
    [clave, nuevo.intentos, nuevo.bloqueadoHasta]
  );
  return nuevo;
}

export async function limpiarIntentos(clave: string): Promise<void> {
  const db = await obtenerDB();
  await db.runAsync('DELETE FROM seguridad_intentos WHERE clave = ?', [clave]);
}
