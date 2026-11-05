/**
 * TEMA CENTRAL DE "MIS TANDAS"
 * Todos los colores, espacios, radios y tipografías viven aquí.
 * Basado en el sistema de diseño "Prosperidad Compartida" (Stitch).
 * Para cambiar la apariencia de TODA la app, edita solo este archivo.
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colores = {
  // Marca
  primario: '#006948',
  primarioContenedor: '#00855d',
  sobrePrimario: '#ffffff',
  secundarioContenedor: '#6cf8bb',
  sobreSecundarioContenedor: '#00714d',
  primarioClaro: '#68dba9',

  // Urgencia / alertas
  terciario: '#994100',
  terciarioContenedor: '#c05400',
  naranja: '#f97316',
  error: '#ba1a1a',
  errorContenedor: '#ffdad6',
  rojo: '#ef4444',

  // Superficies
  fondo: '#faf8ff',
  superficie: '#ffffff',
  superficieBaja: '#f2f3ff',
  superficieMedia: '#eaedff',
  superficieAlta: '#e2e7ff',

  // Texto y bordes
  texto: '#131b2e',
  textoSecundario: '#3d4a42',
  placeholder: '#6d7a72',
  borde: '#bccac0',
  bordeSuave: 'rgba(188, 202, 192, 0.4)',

  // Brillos decorativos
  brilloVerde: 'rgba(108, 248, 187, 0.3)',
  brilloAzul: 'rgba(234, 237, 255, 0.8)',

  // Estados (chips)
  pagadoFondo: 'rgba(16, 185, 129, 0.12)',
  pagadoTexto: '#047857',
  pagadoBorde: 'rgba(16, 185, 129, 0.25)',
  pendienteFondo: 'rgba(249, 115, 22, 0.12)',
  pendienteTexto: '#c2410c',
  pendienteBorde: 'rgba(249, 115, 22, 0.25)',
  atrasadoFondo: 'rgba(239, 68, 68, 0.12)',
  atrasadoTexto: '#b91c1c',
  atrasadoBorde: 'rgba(239, 68, 68, 0.25)',

  // Bandera de Honduras
  banderaAzul: '#0073cf',
} as const;

export const espacio = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radio = {
  sm: 4,
  md: 8,
  input: 12,
  tarjeta: 16,
  xl: 24,
  pildora: 9999,
} as const;

export const tipografia = {
  titulo: { fontSize: 30, fontWeight: '800', lineHeight: 38 } as TextStyle,
  encabezadoLg: { fontSize: 26, fontWeight: '800', lineHeight: 34 } as TextStyle,
  encabezadoMd: { fontSize: 22, fontWeight: '700', lineHeight: 28 } as TextStyle,
  encabezadoSm: { fontSize: 18, fontWeight: '700', lineHeight: 24 } as TextStyle,
  cuerpoLg: { fontSize: 16, fontWeight: '500', lineHeight: 24 } as TextStyle,
  cuerpo: { fontSize: 14, fontWeight: '400', lineHeight: 20 } as TextStyle,
  cuerpoSm: { fontSize: 12, fontWeight: '400', lineHeight: 16 } as TextStyle,
  etiquetaLg: { fontSize: 14, fontWeight: '600', lineHeight: 18 } as TextStyle,
  etiqueta: { fontSize: 12, fontWeight: '600', lineHeight: 16 } as TextStyle,
  etiquetaSm: { fontSize: 10, fontWeight: '700', lineHeight: 14 } as TextStyle,
  moneda: { fontSize: 44, fontWeight: '800', lineHeight: 50 } as TextStyle,
};

export const sombras = {
  nivel1: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    },
    default: { elevation: 2 },
  }) as ViewStyle,
  nivel2: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
    default: { elevation: 5 },
  }) as ViewStyle,
  boton: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#006948',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    default: { elevation: 3 },
  }) as ViewStyle,
};

export const tema = { colores, espacio, radio, tipografia, sombras };
export type Tema = typeof tema;
export default tema;
