/** Bandera de Honduras dibujada con vistas (sin emojis ni imágenes). */
import { StyleSheet, View } from 'react-native';
import { tema } from '../tema';

export function BanderaHN({ ancho = 24 }: { ancho?: number }) {
  const alto = ancho * 0.6;
  const franja = alto / 3;
  return (
    <View style={[styles.marco, { width: ancho, height: alto }]}>
      <View style={{ height: franja, backgroundColor: tema.colores.banderaAzul }} />
      <View style={{ height: franja, backgroundColor: '#ffffff' }} />
      <View style={{ height: franja, backgroundColor: tema.colores.banderaAzul }} />
    </View>
  );
}

const styles = StyleSheet.create({
  marco: {
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tema.colores.borde,
  },
});
