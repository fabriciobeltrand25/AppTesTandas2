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

export function esFechaISOValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const fecha = desdeISO(iso);
  return aISO(fecha) === iso;
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
