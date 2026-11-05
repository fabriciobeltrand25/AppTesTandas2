/** Utilidades de formato (moneda, fechas, teléfonos, nombres). */

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** 24500 -> "L 24,500"   |   1250.5 -> "L 1,250.50" */
export function formatearLempiras(valor: number): string {
  const redondeado = Math.round(valor * 100) / 100;
  const [entera, decimal] = redondeado.toFixed(2).split('.');
  const conComas = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimal === '00' ? `L ${conComas}` : `L ${conComas}.${decimal}`;
}

/** "2026-10-15" -> "15 Oct." */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES_CORTOS[m - 1]}.`;
}

/** "2026-10-15" -> "15 de Octubre" */
export function fechaLarga(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES_LARGOS[m - 1]}`;
}

/** "Carlos Pérez" -> "CP" */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const a = partes[0][0] ?? '';
  const b = partes.length > 1 ? partes[1][0] : '';
  return (a + b).toUpperCase();
}

export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? '';
}

export function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

export function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** "98765432" -> "9876-5432" (mientras se escribe también funciona) */
export function formatearTelefono(digitos: string): string {
  const d = soloDigitos(digitos).slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
}

export function etiquetaFrecuencia(f: string): string {
  switch (f) {
    case 'semanal': return 'Semanal';
    case 'quincenal': return 'Quincenal';
    case 'mensual': return 'Mensual';
    default: return f;
  }
}
