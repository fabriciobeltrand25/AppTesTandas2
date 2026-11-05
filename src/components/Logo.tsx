import { StyleSheet, View } from 'react-native';
import { tema } from '../tema';
import { Icono } from './Icono';

export function Logo({ tamano = 56 }: { tamano?: number }) {
  return (
    <View
      style={[
        styles.caja,
        { width: tamano, height: tamano, borderRadius: tamano * 0.29 },
      ]}
    >
      <Icono name="wallet" size={tamano * 0.5} color={tema.colores.sobrePrimario} />
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    backgroundColor: tema.colores.primario,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
