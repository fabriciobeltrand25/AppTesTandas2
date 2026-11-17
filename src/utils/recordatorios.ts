/**
 * Recordatorios por WhatsApp o mensaje de texto (SMS).
 * Solo abre la app de mensajes del teléfono con el texto ya escrito: el usuario da "enviar".
 */
import { Alert, Linking, Platform } from 'react-native';
import { formatearLempiras, fechaLarga } from './formato';

export function mensajeCuotaRonda(p: {
  nombre: string;
  tanda: string;
  ronda: number;
  monto: number;
  fechaLimite: string;
}): string {
  return (
    `Hola ${p.nombre}, te recordamos tu cuota de ${formatearLempiras(p.monto)} ` +
    `de la tanda "${p.tanda}" (ronda #${p.ronda}). Fecha límite: ${fechaLarga(p.fechaLimite)}. ¡Gracias!`
  );
}

export function mensajeCuotasAtrasadas(p: {
  nombre: string;
  tanda: string;
  cuotas: number;
  total: number;
}): string {
  return (
    `Hola ${p.nombre}, tienes ${p.cuotas} ${p.cuotas === 1 ? 'cuota atrasada' : 'cuotas atrasadas'} ` +
    `en la tanda "${p.tanda}" por un total de ${formatearLempiras(p.total)}. ¿Puedes ponerte al día? ¡Gracias!`
  );
}

async function abrir(url: string, errorTexto: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No se pudo abrir', errorTexto);
  }
}

export function abrirWhatsApp(telefono: string, mensaje: string) {
  return abrir(
    `https://wa.me/504${telefono}?text=${encodeURIComponent(mensaje)}`,
    'Verifica que tengas WhatsApp instalado.'
  );
}

export function abrirSMS(telefono: string, mensaje: string) {
  const separador = Platform.OS === 'ios' ? '&' : '?';
  return abrir(
    `sms:+504${telefono}${separador}body=${encodeURIComponent(mensaje)}`,
    'No se encontró una app de mensajes.'
  );
}

/** Pregunta por qué canal enviar el recordatorio. */
export function ofrecerRecordatorio(nombre: string, telefono: string, mensaje: string) {
  Alert.alert(`Recordar a ${nombre}`, 'Elige cómo enviar el recordatorio:', [
    { text: 'WhatsApp', onPress: () => abrirWhatsApp(telefono, mensaje) },
    { text: 'Mensaje de texto', onPress: () => abrirSMS(telefono, mensaje) },
    { text: 'Cancelar', style: 'cancel' },
  ]);
}
