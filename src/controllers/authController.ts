/**
 * CONTROLADOR de autenticación: validaciones + reglas de negocio.
 * Las pantallas llaman aquí; este archivo llama a los modelos.
 * Todo funciona sin internet (cuentas guardadas en SQLite del teléfono).
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import {
  actualizarPassword,
  buscarPorId,
  buscarPorTelefono,
  crearUsuario,
  type Usuario,
  type UsuarioConClaves,
} from '../models/usuarioModel';
import { soloDigitos } from '../utils/formato';

const CLAVE_SESION = 'sesion_usuario_id';

export type ErroresForm = Record<string, string>;
export type ResultadoAuth =
  | { ok: true; usuario: Usuario }
  | { ok: false; errores: ErroresForm };

// ───────────────────────── Seguridad ─────────────────────────

function generarSal(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashear(valor: string, sal: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sal}:${valor}`);
}

function limpiarUsuario(u: UsuarioConClaves): Usuario {
  return { id: u.id, nombre: u.nombre, telefono: u.telefono, correo: u.correo };
}

// ───────────────────────── Validaciones ─────────────────────────

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fuerza de la contraseña de 0 a 4 (para la barra de progreso). */
export function fuerzaPassword(p: string): number {
  let puntos = 0;
  if (p.length >= 8) puntos++;
  if (/\d/.test(p)) puntos++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) puntos++;
  if (/[^A-Za-z0-9]/.test(p)) puntos++;
  return puntos;
}

function validarTelefono(telefono: string): string | null {
  return /^\d{8}$/.test(soloDigitos(telefono)) ? null : 'Ingresa un teléfono de 8 dígitos';
}

// ───────────────────────── Sesión ─────────────────────────

async function guardarSesion(id: number) {
  await SecureStore.setItemAsync(CLAVE_SESION, String(id));
}

export async function restaurarSesion(): Promise<Usuario | null> {
  try {
    const id = await SecureStore.getItemAsync(CLAVE_SESION);
    if (!id) return null;
    return await buscarPorId(Number(id));
  } catch {
    return null;
  }
}

export async function cerrarSesion(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CLAVE_SESION);
  } catch {
    /* si falla, igual se limpia el estado en memoria */
  }
}

// ───────────────────────── Casos de uso ─────────────────────────

export interface DatosRegistro {
  nombre: string;
  telefono: string;
  correo: string;
  password: string;
  confirmar: string;
  pin: string;
  aceptaTerminos: boolean;
}

export async function registrar(d: DatosRegistro): Promise<ResultadoAuth> {
  const errores: ErroresForm = {};
  const telefono = soloDigitos(d.telefono);
  const correo = d.correo.trim();

  if (d.nombre.trim().length < 3) errores.nombre = 'Escribe tu nombre completo';
  const errTel = validarTelefono(telefono);
  if (errTel) errores.telefono = errTel;
  if (correo && !REGEX_CORREO.test(correo)) errores.correo = 'Correo no válido';
  if (d.password.length < 8) errores.password = 'Mínimo 8 caracteres';
  if (d.confirmar !== d.password) errores.confirmar = 'Las contraseñas no coinciden';
  if (!/^\d{4}$/.test(d.pin)) errores.pin = 'El PIN debe tener 4 dígitos';
  if (!d.aceptaTerminos) errores.terminos = 'Debes aceptar los términos';
  if (Object.keys(errores).length) return { ok: false, errores };

  if (await buscarPorTelefono(telefono)) {
    return { ok: false, errores: { telefono: 'Este teléfono ya tiene una cuenta' } };
  }

  const passwordSal = generarSal();
  const pinSal = generarSal();
  const id = await crearUsuario({
    nombre: d.nombre.trim(),
    telefono,
    correo: correo || null,
    passwordSal,
    passwordHash: await hashear(d.password, passwordSal),
    pinSal,
    pinHash: await hashear(d.pin, pinSal),
  });

  await guardarSesion(id);
  return { ok: true, usuario: { id, nombre: d.nombre.trim(), telefono, correo: correo || null } };
}

export async function iniciarSesion(
  telefonoTexto: string,
  password: string,
  recordar: boolean
): Promise<ResultadoAuth> {
  const telefono = soloDigitos(telefonoTexto);
  const errores: ErroresForm = {};
  const errTel = validarTelefono(telefono);
  if (errTel) errores.telefono = errTel;
  if (!password) errores.password = 'Ingresa tu contraseña';
  if (Object.keys(errores).length) return { ok: false, errores };

  const u = await buscarPorTelefono(telefono);
  const hash = u ? await hashear(password, u.password_sal) : null;
  if (!u || hash !== u.password_hash) {
    return { ok: false, errores: { general: 'Teléfono o contraseña incorrectos' } };
  }

  if (recordar) await guardarSesion(u.id);
  else await cerrarSesion();
  return { ok: true, usuario: limpiarUsuario(u) };
}

/** Paso 1 de recuperación: comprueba teléfono + PIN de 4 dígitos. */
export async function verificarPin(telefonoTexto: string, pin: string): Promise<ResultadoAuth> {
  const telefono = soloDigitos(telefonoTexto);
  const errTel = validarTelefono(telefono);
  if (errTel) return { ok: false, errores: { telefono: errTel } };
  if (!/^\d{4}$/.test(pin)) return { ok: false, errores: { pin: 'Ingresa los 4 dígitos' } };

  const u = await buscarPorTelefono(telefono);
  if (!u || (await hashear(pin, u.pin_sal)) !== u.pin_hash) {
    return { ok: false, errores: { general: 'Teléfono o PIN incorrectos' } };
  }
  return { ok: true, usuario: limpiarUsuario(u) };
}

/** Paso 2: vuelve a verificar el PIN y guarda la nueva contraseña. */
export async function restablecerPassword(
  telefono: string,
  pin: string,
  nueva: string,
  confirmar: string
): Promise<ResultadoAuth> {
  const errores: ErroresForm = {};
  if (nueva.length < 8) errores.password = 'Mínimo 8 caracteres';
  if (confirmar !== nueva) errores.confirmar = 'Las contraseñas no coinciden';
  if (Object.keys(errores).length) return { ok: false, errores };

  const verificado = await verificarPin(telefono, pin);
  if (!verificado.ok) return verificado;

  const sal = generarSal();
  await actualizarPassword(verificado.usuario.id, sal, await hashear(nueva, sal));
  return verificado;
}
