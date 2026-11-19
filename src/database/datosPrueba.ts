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
  { nombre: 'David Orellana',    telefono: '87376502', correo: 'david.orellana@mistandas.hn' }, // 1 · organizador
  { nombre: 'Susan Aguilar',     telefono: '33375578', correo: 'susan.aguilar@mistandas.hn' },  // 2
  { nombre: 'Erick Bonilla',     telefono: '97534905', correo: 'erick.bonilla@mistandas.hn' },  // 3
  { nombre: 'Manuel Castro',     telefono: '96962937', correo: 'manuel.castro@mistandas.hn' },  // 4[cite: 1]
  { nombre: 'Luis',              telefono: '32973205', correo: 'luis@mistandas.hn' },           // 5[cite: 1]
  { nombre: 'Yasmin',            telefono: '92287202', correo: 'yasmin@mistandas.hn' },         // 6[cite: 1]
  { nombre: 'Bianca Romero',     telefono: '32253054', correo: 'bianca.romero@mistandas.hn' },  // 7[cite: 1]
  { nombre: 'besy xiomara',      telefono: '33401727', correo: 'besy.xiomara@mistandas.hn' },   // 8[cite: 1]
  { nombre: 'Jony Osorio',       telefono: '87354444', correo: 'jony.osorio@mistandas.hn' },    // 9[cite: 1]
  { nombre: 'Valesca Aguilar',   telefono: '95734232', correo: 'valesca.aguilar@mistandas.hn' },// 10[cite: 1]
  { nombre: 'Cristofer',         telefono: '95924438', correo: 'cristofer@mistandas.hn' },      // 11[cite: 1]
  { nombre: 'Pamela Beltrán',    telefono: '33641148', correo: 'pamela.beltran@mistandas.hn' }, // 12[cite: 1]
  { nombre: 'Valeria Aguilar',   telefono: '93688804', correo: 'valeria.aguilar@mistandas.hn' },// 13[cite: 1]
  { nombre: 'Antonio Romero Ap', telefono: '88301006', correo: 'antonio.romero@mistandas.hn' }, // 14[cite: 1]
  { nombre: 'Bryan Mijo HM',     telefono: '33406103', correo: 'bryan.mijo@mistandas.hn' },     // 15[cite: 1]
];