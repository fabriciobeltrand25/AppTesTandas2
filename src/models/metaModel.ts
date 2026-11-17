/** MODELO: banderas internas de la app (tabla "meta"), p. ej. si ya se cargaron los datos de ejemplo. */
import { obtenerDB } from '../database/db';

export async function leerMeta(clave: string): Promise<string | null> {
  const db = await obtenerDB();
  const f = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM meta WHERE clave = ?', [clave]);
  return f?.valor ?? null;
}

export async function guardarMeta(clave: string, valor: string): Promise<void> {
  const db = await obtenerDB();
  await db.runAsync(
    'INSERT INTO meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
    [clave, valor]
  );
}
