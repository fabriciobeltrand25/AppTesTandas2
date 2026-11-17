/**
 * CONTROLADOR de autenticación: validaciones + reglas de negocio.
 * Las pantallas llaman aquí; este archivo llama a los modelos.
 * Todo funciona sin internet (cuentas guardadas en SQLite del teléfono).
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import {
  actualizarPassword,
  actualizarPerfilAtomico,
  buscarPorId,
  buscarPorTelefono,
  crearUsuario,
  obtenerConClaves,
  reclamarParticipaciones,
  type Usuario,
  type UsuarioConClaves,
} from '../models/usuarioModel';
import { leerIntentos, limpiarIntentos, sumarFallo } from '../models/seguridadModel';
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

/** Sal + hash de una contraseña y de un PIN (mismo método que usan registrar / iniciarSesion / verificarPin). */
export async function prepararClaves(password: string, pin: string) {
  const passwordSal = generarSal();
  const pinSal = generarSal();
  return {
    passwordSal,
    passwordHash: await hashear(password, passwordSal),
    pinSal,
    pinHash: await hashear(pin, pinSal),
  };
}

/** Comparación de textos en tiempo constante (no revela cuántos caracteres coinciden). */
function igualesSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

// ───────────────────── Límite de intentos fallidos ─────────────────────
// El PIN de recuperación tiene solo 10,000 combinaciones: sin límite se adivina en minutos.
// Los fallos se guardan en SQLite, así que cerrar y abrir la app NO reinicia el contador.
const LIMITES = {
  login: { max: 5, bloqueoMs: 5 * 60_000 },
  pin: { max: 5, bloqueoMs: 30 * 60_000 },
  perfil: { max: 5, bloqueoMs: 5 * 60_000 },
} as const;
type TipoLimite = keyof typeof LIMITES;

function textoMinutos(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  return `${min} ${min === 1 ? 'minuto' : 'minutos'}`;
}

/** Devuelve el mensaje de bloqueo si esa clave está bloqueada ahora mismo; si no, null. */
async function mensajeDeBloqueo(clave: string): Promise<string | null> {
  const e = await leerIntentos(clave);
  const restante = e.bloqueadoHasta - Date.now();
  return restante > 0 ? `Demasiados intentos fallidos. Intenta de nuevo en ${textoMinutos(restante)}.` : null;
}

/** Registra un fallo y devuelve el mensaje a mostrar (con los intentos que quedan o el bloqueo). */
async function registrarFallo(clave: string, tipo: TipoLimite, mensajeBase: string): Promise<string> {
  const { max, bloqueoMs } = LIMITES[tipo];
  const e = await sumarFallo(clave, max, bloqueoMs, Date.now());
  if (e.bloqueadoHasta > Date.now()) {
    return `Demasiados intentos fallidos. Intenta de nuevo en ${textoMinutos(bloqueoMs)}.`;
  }
  const quedan = max - e.intentos;
  return `${mensajeBase}${quedan <= 2 ? ` Te ${quedan === 1 ? 'queda 1 intento' : `quedan ${quedan} intentos`}.` : ''}`;
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
  else if (d.nombre.trim().length > 60) errores.nombre = 'El nombre es demasiado largo (máximo 60)';
  const errTel = validarTelefono(telefono);
  if (errTel) errores.telefono = errTel;
  if (correo && (!REGEX_CORREO.test(correo) || correo.length > 80)) errores.correo = 'Correo no válido';
  if (d.password.length < 8) errores.password = 'Mínimo 8 caracteres';
  else if (d.password.length > 64) errores.password = 'La contraseña es demasiado larga (máximo 64)';
  if (d.confirmar !== d.password) errores.confirmar = 'Las contraseñas no coinciden';
  if (!/^\d{4}$/.test(d.pin)) errores.pin = 'El PIN debe tener 4 dígitos';
  if (!d.aceptaTerminos) errores.terminos = 'Debes aceptar los términos';
  if (Object.keys(errores).length) return { ok: false, errores };

  if (await buscarPorTelefono(telefono)) {
    return { ok: false, errores: { telefono: 'Este teléfono ya tiene una cuenta' } };
  }

  const passwordSal = generarSal();
  const pinSal = generarSal();
  let id: number;
  try {
    id = await crearUsuario({
      nombre: d.nombre.trim(),
      telefono,
      correo: correo || null,
      passwordSal,
      passwordHash: await hashear(d.password, passwordSal),
      pinSal,
      pinHash: await hashear(d.pin, pinSal),
    });
  } catch {
    // Dos registros casi simultáneos con el mismo teléfono: gana el primero
    return { ok: false, errores: { telefono: 'Este teléfono ya tiene una cuenta' } };
  }

  // Si ya lo habían agregado a alguna tanda con este número, esas participaciones pasan a su cuenta
  await reclamarParticipaciones(id, telefono);

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

  const clave = `login:${telefono}`;
  const bloqueo = await mensajeDeBloqueo(clave);
  if (bloqueo) return { ok: false, errores: { general: bloqueo } };

  const u = await buscarPorTelefono(telefono);
  const hash = u ? await hashear(password, u.password_sal) : null;
  if (!u || !hash || !igualesSeguro(hash, u.password_hash)) {
    // Mismo mensaje exista o no la cuenta (no se revela qué teléfonos están registrados)
    return { ok: false, errores: { general: await registrarFallo(clave, 'login', 'Teléfono o contraseña incorrectos.') } };
  }
  await limpiarIntentos(clave);

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

  const clave = `pin:${telefono}`;
  const bloqueo = await mensajeDeBloqueo(clave);
  if (bloqueo) return { ok: false, errores: { general: bloqueo } };

  const u = await buscarPorTelefono(telefono);
  const hash = u ? await hashear(pin, u.pin_sal) : null;
  if (!u || !hash || !igualesSeguro(hash, u.pin_hash)) {
    return { ok: false, errores: { general: await registrarFallo(clave, 'pin', 'Teléfono o PIN incorrectos.') } };
  }
  await limpiarIntentos(clave);
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
  else if (nueva.length > 64) errores.password = 'La contraseña es demasiado larga (máximo 64)';
  if (confirmar !== nueva) errores.confirmar = 'Las contraseñas no coinciden';
  if (Object.keys(errores).length) return { ok: false, errores };

  const verificado = await verificarPin(telefono, pin);
  if (!verificado.ok) return verificado;

  const sal = generarSal();
  await actualizarPassword(verificado.usuario.id, sal, await hashear(nueva, sal));
  return verificado;
}


// ───────────────────────── Perfil ─────────────────────────

export interface DatosPerfil {
  nombre: string;
  telefono: string;
  correo: string;
  /** Contraseña actual: obligatoria solo si se cambia el teléfono (es el dato con el que se inicia sesión) */
  passwordActual: string;
}

/**
 * Actualiza nombre, correo y/o teléfono de la cuenta. La cuenta se identifica por su ID,
 * así que todo lo demás (tandas, pagos, cobros) sigue siendo suyo aunque cambie estos datos.
 */
export async function actualizarPerfil(actual: Usuario, d: DatosPerfil): Promise<ResultadoAuth> {
  const errores: ErroresForm = {};
  const telefono = soloDigitos(d.telefono);
  const correo = d.correo.trim();
  const nombre = d.nombre.trim();

  if (nombre.length < 3) errores.nombre = 'Escribe tu nombre completo';
  else if (nombre.length > 60) errores.nombre = 'El nombre es demasiado largo (máximo 60)';
  const errTel = validarTelefono(telefono);
  if (errTel) errores.telefono = errTel;
  if (correo && (!REGEX_CORREO.test(correo) || correo.length > 80)) errores.correo = 'Correo no válido';
  if (Object.keys(errores).length) return { ok: false, errores };

  const cambioTelefono = telefono !== actual.telefono;
  if (cambioTelefono) {
    const existente = await buscarPorTelefono(telefono);
    if (existente && existente.id !== actual.id) {
      return { ok: false, errores: { telefono: 'Ese teléfono ya pertenece a otra cuenta' } };
    }
    const clave = `perfil:${actual.id}`;
    const bloqueo = await mensajeDeBloqueo(clave);
    if (bloqueo) return { ok: false, errores: { passwordActual: bloqueo } };
    const claves = await obtenerConClaves(actual.id);
    if (!d.passwordActual) {
      return { ok: false, errores: { passwordActual: 'Ingresa tu contraseña para cambiar el teléfono' } };
    }
    const hash = claves ? await hashear(d.passwordActual, claves.password_sal) : null;
    if (!claves || !hash || !igualesSeguro(hash, claves.password_hash)) {
      return { ok: false, errores: { passwordActual: await registrarFallo(clave, 'perfil', 'Contraseña incorrecta.') } };
    }
    await limpiarIntentos(clave);
  }

  // Perfil + vinculación de participaciones en una sola transacción (todo o nada)
  try {
    await actualizarPerfilAtomico(actual.id, { nombre, telefono, correo: correo || null }, cambioTelefono);
  } catch {
    return { ok: false, errores: { general: 'No se pudo guardar el perfil. Intenta de nuevo.' } };
  }

  return { ok: true, usuario: { id: actual.id, nombre, telefono, correo: correo || null } };
}
