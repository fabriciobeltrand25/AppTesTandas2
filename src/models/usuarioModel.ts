/** MODELO: acceso a la tabla "usuarios". Solo SQL, nada de validaciones. */
import { obtenerDB } from '../database/db';

export interface Usuario {
  id: number;
  nombre: string;
  telefono: string; // 8 dígitos, sin guion
  correo: string | null;
}

export interface UsuarioConClaves extends Usuario {
  password_sal: string;
  password_hash: string;
  pin_sal: string;
  pin_hash: string;
}

export interface NuevoUsuario {
  nombre: string;
  telefono: string;
  correo: string | null;
  passwordSal: string;
  passwordHash: string;
  pinSal: string;
  pinHash: string;
  /** true = cuenta de prueba creada por el seeder */
  esDemo?: boolean;
}

export async function crearUsuario(u: NuevoUsuario): Promise<number> {
  const db = await obtenerDB();
  const r = await db.runAsync(
    `INSERT INTO usuarios (nombre, telefono, correo, password_sal, password_hash, pin_sal, pin_hash, es_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [u.nombre, u.telefono, u.correo, u.passwordSal, u.passwordHash, u.pinSal, u.pinHash, u.esDemo ? 1 : 0]
  );
  return r.lastInsertRowId;
}

export async function buscarPorTelefono(telefono: string): Promise<UsuarioConClaves | null> {
  const db = await obtenerDB();
  return db.getFirstAsync<UsuarioConClaves>('SELECT * FROM usuarios WHERE telefono = ?', [telefono]);
}

export async function buscarPorId(id: number): Promise<Usuario | null> {
  const db = await obtenerDB();
  return db.getFirstAsync<Usuario>(
    'SELECT id, nombre, telefono, correo FROM usuarios WHERE id = ?',
    [id]
  );
}

export async function actualizarPassword(id: number, sal: string, hash: string): Promise<void> {
  const db = await obtenerDB();
  await db.runAsync('UPDATE usuarios SET password_sal = ?, password_hash = ? WHERE id = ?', [sal, hash, id]);
}

/** Lista de usuarios registrados (para elegir participantes). */
export async function listarUsuarios(): Promise<Usuario[]> {
  const db = await obtenerDB();
  return db.getAllAsync<Usuario>('SELECT id, nombre, telefono, correo FROM usuarios ORDER BY nombre COLLATE NOCASE');
}

export async function buscarIdPorTelefono(telefono: string): Promise<number | null> {
  const db = await obtenerDB();
  const f = await db.getFirstAsync<{ id: number }>('SELECT id FROM usuarios WHERE telefono = ?', [telefono]);
  return f?.id ?? null;
}

export async function obtenerConClaves(id: number): Promise<UsuarioConClaves | null> {
  const db = await obtenerDB();
  return db.getFirstAsync<UsuarioConClaves>('SELECT * FROM usuarios WHERE id = ?', [id]);
}

export async function actualizarPerfil(
  id: number,
  datos: { nombre: string; telefono: string; correo: string | null }
): Promise<void> {
  const db = await obtenerDB();
  await db.runAsync('UPDATE usuarios SET nombre = ?, telefono = ?, correo = ? WHERE id = ?', [
    datos.nombre,
    datos.telefono,
    datos.correo,
    id,
  ]);
}

/**
 * Vincula a la cuenta las participaciones "sueltas" que usan su número de teléfono
 * (por ejemplo, alguien que fue agregado a una tanda antes de crear su cuenta).
 */
export async function reclamarParticipaciones(usuarioId: number, telefono: string): Promise<number> {
  const db = await obtenerDB();
  // No se vincula en una tanda donde la cuenta YA participa (evitaría aparecer dos veces)
  const r = await db.runAsync(
    `UPDATE participantes SET usuario_id = ?
      WHERE telefono = ? AND usuario_id IS NULL
        AND tanda_id NOT IN (SELECT tanda_id FROM participantes WHERE usuario_id = ?)`,
    [usuarioId, telefono, usuarioId]
  );
  return r.changes;
}

/** Actualiza el perfil y, si cambió el teléfono, vincula sus participaciones: todo o nada. */
export async function actualizarPerfilAtomico(
  id: number,
  datos: { nombre: string; telefono: string; correo: string | null },
  reclamar: boolean
): Promise<void> {
  const db = await obtenerDB();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE usuarios SET nombre = ?, telefono = ?, correo = ? WHERE id = ?', [
      datos.nombre, datos.telefono, datos.correo, id,
    ]);
    if (reclamar) {
      await db.runAsync(
        `UPDATE participantes SET usuario_id = ?
          WHERE telefono = ? AND usuario_id IS NULL
            AND tanda_id NOT IN (SELECT tanda_id FROM participantes WHERE usuario_id = ?)`,
        [id, datos.telefono, id]
      );
    }
  });
}

export interface ContactoGuardado {
  nombre: string;
  telefono: string;
}

/**
 * Contactos de las tandas que el usuario organiza: personas que agregó SIN cuenta
 * (incluye los participantes de los datos de ejemplo). Sirven para volver a elegirlos
 * en el ComboBox sin escribirlos otra vez.
 */
export async function listarContactos(organizadorId: number): Promise<ContactoGuardado[]> {
  const db = await obtenerDB();
  return db.getAllAsync<ContactoGuardado>(
    `SELECT p.nombre AS nombre, p.telefono AS telefono, MAX(p.id) AS ultimo
       FROM participantes p
       JOIN tandas t ON t.id = p.tanda_id
      WHERE t.usuario_id = ?
        AND p.usuario_id IS NULL
        AND p.telefono NOT IN (SELECT telefono FROM usuarios)
      GROUP BY p.telefono
      ORDER BY p.nombre COLLATE NOCASE`,
    [organizadorId]
  );
}

/** Cuentas de prueba creadas por el seeder (en el orden en que se crearon). */
export async function listarUsuariosDemo(): Promise<Usuario[]> {
  const db = await obtenerDB();
  return db.getAllAsync<Usuario>(
    'SELECT id, nombre, telefono, correo FROM usuarios WHERE es_demo = 1 ORDER BY id'
  );
}
