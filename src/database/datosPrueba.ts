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
export const CONTACTOS_PRUEBA: ContactoPrueba[] = [
  { nombre: 'Carlos Pérez',   telefono: 'PENDIENTE' }, // 1 · organizador
  { nombre: 'Miriam Flores',  telefono: 'PENDIENTE' }, // 2
  { nombre: 'Ana Mejía',      telefono: 'PENDIENTE' }, // 3
  { nombre: 'Luis Ordóñez',   telefono: 'PENDIENTE' }, // 4
  { nombre: 'Karla Reyes',    telefono: 'PENDIENTE' }, // 5
  { nombre: 'José Martínez',  telefono: 'PENDIENTE' }, // 6
  { nombre: 'Sofía Cárcamo',  telefono: 'PENDIENTE' }, // 7
  { nombre: 'Daniel Zelaya',  telefono: 'PENDIENTE' }, // 8
  { nombre: 'Gloria Núñez',   telefono: 'PENDIENTE' }, // 9
  { nombre: 'Pedro Aguilar',  telefono: 'PENDIENTE' }, // 10
  { nombre: 'Rosa Lagos',     telefono: 'PENDIENTE' }, // 11
  { nombre: 'Marvin Castro',  telefono: 'PENDIENTE' }, // 12
  { nombre: 'Elena Rivera',   telefono: 'PENDIENTE' }, // 13
  { nombre: 'Héctor Banegas', telefono: 'PENDIENTE' }, // 14
  { nombre: 'Lidia Paz',      telefono: 'PENDIENTE' }, // 15
];
