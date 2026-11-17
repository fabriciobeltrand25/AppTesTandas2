/** Bandera de Honduras dibujada con vistas (sin emojis ni imágenes). */
import { StyleSheet, View } from 'react-native';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';

export function BanderaHN({ ancho = 24 }: { ancho?: number }) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
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

const crearEstilos = (tema: Tema) => StyleSheet.create({
  marco: {
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tema.colores.borde,
  },
});
