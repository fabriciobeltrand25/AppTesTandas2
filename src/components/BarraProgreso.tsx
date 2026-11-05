import { StyleSheet, View } from 'react-native';
import { tema } from '../tema';

/** porcentaje: 0 a 100 */
export function BarraProgreso({ porcentaje, alto = 8 }: { porcentaje: number; alto?: number }) {
  const p = Math.max(0, Math.min(100, porcentaje));
  return (
    <View style={[styles.pista, { height: alto, borderRadius: alto / 2 }]}>
      <View style={[styles.relleno, { width: `${p}%`, borderRadius: alto / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pista: { width: '100%', backgroundColor: tema.colores.superficieMedia, overflow: 'hidden' },
  relleno: { height: '100%', backgroundColor: tema.colores.primario },
});
