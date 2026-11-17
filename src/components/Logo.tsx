import { StyleSheet, View } from 'react-native';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { Icono } from './Icono';

export function Logo({ tamano = 56 }: { tamano?: number }) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
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

const crearEstilos = (tema: Tema) => StyleSheet.create({
  caja: {
    backgroundColor: tema.colores.relleno,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
