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
}

export async function crearUsuario(u: NuevoUsuario): Promise<number> {
  const db = await obtenerDB();
  const r = await db.runAsync(
    `INSERT INTO usuarios (nombre, telefono, correo, password_sal, password_hash, pin_sal, pin_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [u.nombre, u.telefono, u.correo, u.passwordSal, u.passwordHash, u.pinSal, u.pinHash]
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

export async function buscarIdPorTelefono(telefono: string): Promise<number | null> {
  const usuario = await buscarPorTelefono(telefono);
  return usuario?.id ?? null;
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const db = await obtenerDB();
  return db.getAllAsync<Usuario>('SELECT id, nombre, telefono, correo FROM usuarios ORDER BY nombre');
}

export async function listarContactos(_usuarioId: number): Promise<Usuario[]> {
  return [];
}

export async function actualizarPassword(id: number, sal: string, hash: string): Promise<void> {
  const db = await obtenerDB();
  await db.runAsync('UPDATE usuarios SET password_sal = ?, password_hash = ? WHERE id = ?', [sal, hash, id]);
}
