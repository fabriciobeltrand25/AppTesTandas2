/**
 * Manejo de fechas del calendario de rondas.
 * Las fechas se guardan como texto ISO "YYYY-MM-DD" (sin hora) para evitar
 * errores de zona horaria. Todo el cálculo se hace en UTC.
 */
export type Frecuencia = 'semanal' | 'quincenal' | 'mensual';

const pad = (n: number) => String(n).padStart(2, '0');

export function aISO(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function desdeISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Fecha de HOY según el reloj del teléfono (hora local), en formato ISO. */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Suma k periodos a una fecha. k puede ser negativo.
 *  - semanal   = 7 días
 *  - quincenal = 15 días
 *  - mensual   = mismo día del mes siguiente (si no existe, usa el último día)
 */
export function sumarPeriodos(inicioISO: string, frecuencia: Frecuencia, k: number): string {
  const base = desdeISO(inicioISO);
  if (frecuencia === 'mensual') {
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth() + k;
    const ultimoDia = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return aISO(new Date(Date.UTC(y, m, Math.min(base.getUTCDate(), ultimoDia))));
  }
  const dias = (frecuencia === 'semanal' ? 7 : 15) * k;
  base.setUTCDate(base.getUTCDate() + dias);
  return aISO(base);
}

/** Genera N rondas (una por participante) a partir de la fecha de inicio. */
export function generarCalendario(inicioISO: string, frecuencia: Frecuencia, n: number) {
  return Array.from({ length: n }, (_, i) => ({
    numero: i + 1,
    fecha: sumarPeriodos(inicioISO, frecuencia, i),
  }));
}

/** Date (hora local, como la entrega el selector de fecha) -> "YYYY-MM-DD" */
export function aISOLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" -> Date a medianoche local (para el selector de fecha) */
export function desdeISOLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Días de diferencia entre dos fechas ISO (positivo si "hasta" es posterior). */
export function diferenciaDias(desde: string, hasta: string): number {
  return Math.round((desdeISO(hasta).getTime() - desdeISO(desde).getTime()) / 86400000);
}

/** true si el texto es una fecha real en formato YYYY-MM-DD (rechaza 2026-13-45, 0000-00-00, etc.). */
export function esFechaISOValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [y, m, d] = texto.split('-').map(Number);
  if (y < 2000 || y > 2100) return false;
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}
