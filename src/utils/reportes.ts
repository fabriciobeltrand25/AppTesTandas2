/**
 * Genera un PDF a partir de HTML y lo comparte (WhatsApp, correo, guardar...).
 * Si compartir el archivo falla, usa el diálogo de impresión del sistema como respaldo
 * ("Guardar como PDF"), y si todo falla muestra el error real para poder corregirlo.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/** Escapa texto del usuario para que no rompa el HTML. */
export function esc(texto: string | number): string {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const ESTILOS_PDF = `
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #131b2e; padding: 24px; }
  h1 { color: #006948; margin: 0 0 4px; font-size: 24px; }
  h2 { color: #131b2e; font-size: 16px; margin: 22px 0 8px; border-bottom: 2px solid #6cf8bb; padding-bottom: 4px; }
  .sub { color: #3d4a42; font-size: 12px; margin-bottom: 14px; }
  .cajas { display: flex; gap: 10px; margin: 10px 0; }
  .caja { flex: 1; background: #f2f3ff; border-radius: 10px; padding: 10px 12px; }
  .caja b { display: block; font-size: 18px; color: #006948; }
  .caja span { font-size: 11px; color: #3d4a42; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; background: #006948; color: #fff; padding: 6px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e2e7ff; }
  tr:nth-child(even) td { background: #faf8ff; }
  .ok { color: #047857; font-weight: 700; }
  .mal { color: #b91c1c; font-weight: 700; }
  .cur { color: #c2410c; font-weight: 700; }
  .pie { margin-top: 24px; font-size: 10px; color: #6d7a72; text-align: center; }
`;

export function documentoHTML(cuerpo: string): string {
  return `<html><head><meta charset="utf-8"/><style>${ESTILOS_PDF}</style></head><body>${cuerpo}</body></html>`;
}

function mensajeDe(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

/**
 * 1) Genera el PDF como base64.
 * 2) Guarda el archivo directamente en cacheDirectory de la app con FileSystem.
 * 3) Abre el diálogo nativo de compartir (WhatsApp, correo, etc.).
 * 4) Si todo lo anterior falla, usa el diálogo de impresión como respaldo.
 */
export async function compartirPDF(html: string, titulo: string): Promise<'compartido' | 'impresion'> {
  let detalle = '';
  try {
    // 1. Pedir el PDF codificado en base64 para bypass de carpetas restringidas en Expo Go
    const { base64 } = await Print.printToFileAsync({ html, base64: true });

    if (base64) {
      // 2. Definir una ruta limpia en la raíz del cacheDirectory de la app
      const fileUri = `${FileSystem.cacheDirectory}Reporte_MisTandas_${Date.now()}.pdf`;

      // 3. Escribir los datos binarios directamente usando Base64
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 4. Verificar disponibilidad y compartir
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: titulo,
          UTI: 'com.adobe.pdf',
        });
        return 'compartido';
      }
      detalle = 'Compartir archivos no está disponible en este dispositivo';
    } else {
      detalle = 'No se pudo obtener el contenido base64 del PDF';
    }
  } catch (e) {
    detalle = mensajeDe(e);
    console.warn('Compartir PDF por archivo falló, intentando respaldo de impresión:', detalle);
  }

  // Respaldo de seguridad en caso de que compartir falle
  try {
    await Print.printAsync({ html });
    return 'impresion';
  } catch (e) {
    throw new Error(`${detalle} | Respaldo: ${mensajeDe(e)}`);
  }
}

let compartiendo = false;

/**
 * Para las pantallas: evita doble toque, genera el contenido y muestra el error si falla.
 */
export async function compartirReporte(generar: () => Promise<string | null>, titulo: string): Promise<void> {
  if (compartiendo) return;
  compartiendo = true;
  try {
    const html = await generar();
    if (!html) {
      Alert.alert('No se pudo compartir', 'No se encontró la información de esta tanda.');
      return;
    }
    await compartirPDF(html, titulo);
  } catch (e) {
    Alert.alert('No se pudo compartir', `No se pudo generar el PDF.\n\nDetalle: ${mensajeDe(e)}`);
  } finally {
    compartiendo = false;
  }
}
