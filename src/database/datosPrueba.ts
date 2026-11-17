/**
 * DATOS DE PRUEBA (SEEDERS) — aquí se editan los contactos reales.
 *
 * ► Cada contacto se crea como una CUENTA real (tabla usuarios) con:
 *     - contraseña de acceso  → PASSWORD_PRUEBA
 *     - PIN de recuperación   → PIN_PRUEBA
 *   Así puedes iniciar sesión con cualquiera de ellos y probar "Recuperar contraseña".
 *
 * ► Reemplaza cada "PENDIENTE" por el número real (8 dígitos, sin guion ni +504).
 *   Los contactos que sigan en "PENDIENTE" se ignoran. Mínimo 3 para armar tandas.
 *
 * ► IMPORTANTE: estos datos son SOLO para pruebas. Antes de publicar la app en Play Store,
 *   pon SEMBRAR_AUTOMATICO = false (o quita los números reales del repositorio).
 */

/** true = al abrir la app por primera vez se cargan solos los usuarios y tandas de ejemplo. */
export const SEMBRAR_AUTOMATICO = true;

/** Contraseña de acceso de TODAS las cuentas de prueba (cumple: 8+ caracteres, mayúscula, número y símbolo). */
export const PASSWORD_PRUEBA = 'Tandas#2026';

/** PIN de recuperación de TODAS las cuentas de prueba (4 dígitos). */
export const PIN_PRUEBA = '2468';

export interface ContactoPrueba {
  nombre: string;
  /** 8 dígitos. "PENDIENTE" = aún no asignado (se ignora). */
  telefono: string;
  correo?: string;
}

/** El PRIMER contacto es el administrador de pruebas: organiza las 3 tandas y participa en todas. */
/** aqui son de prueva recuerda que nos falta el correo asi que inventate unos y me los das tambien obvio*/
export const CONTACTOS_PRUEBA: ContactoPrueba[] = [
  { nombre: 'David Orellana',    telefono: '87376502' }, // 1[cite: 10]
  { nombre: 'Susan Aguilar',     telefono: '33375578' }, // 2[cite: 10]
  { nombre: 'Erick Bonilla',     telefono: '97534905' }, // 3[cite: 10]
  { nombre: 'Manuel Castro',     telefono: '96962937' }, // 4[cite: 10]
  { nombre: 'Luis',              telefono: '32973205' }, // 5[cite: 10]
  { nombre: 'Yasmin',            telefono: '92287202' }, // 6[cite: 10]
  { nombre: 'Bianca Romero',     telefono: '32253054' }, // 7[cite: 10]
  { nombre: 'besy xiomara',      telefono: '33401727' }, // 8[cite: 10]
  { nombre: 'Jony Osorio',       telefono: '87354444' }, // 9[cite: 10]
  { nombre: 'Valesca Aguilar',   telefono: '95734232' }, // 10[cite: 10]
  { nombre: 'Cristofer',         telefono: '95924438' }, // 11[cite: 10]
  { nombre: 'Pamela Beltrán',    telefono: '33641148' }, // 12[cite: 10]
  { nombre: 'Valeria Aguilar',   telefono: '93688804' }, // 13[cite: 10]
  { nombre: 'Antonio Romero Ap', telefono: '88301006' }, // 14[cite: 10]
  { nombre: 'Bryan Mijo HM',     telefono: '33406103' }, // 15[cite: 10]
];