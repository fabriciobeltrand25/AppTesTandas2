/** Contenedor común de login / registro / recuperar: fondo, teclado y scroll. */
import { StatusBar } from 'expo-status-bar';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { PantallaTeclado, ScrollTeclado } from './TecladoSeguro';

export function PantallaAuth({ children, centrado = false }: { children: ReactNode; centrado?: boolean }) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <SafeAreaView style={styles.raiz} edges={['top', 'bottom']}>
      <StatusBar style={tema.oscuro ? 'light' : 'dark'} />
      <View pointerEvents="none" style={styles.brilloArriba} />
      <View pointerEvents="none" style={styles.brilloMedio} />
      <PantallaTeclado>
        <ScrollTeclado contentContainerStyle={[styles.contenido, centrado && styles.centrado]}>
          <View style={styles.columna}>{children}</View>
        </ScrollTeclado>
      </PantallaTeclado>
    </SafeAreaView>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  raiz: { flex: 1, backgroundColor: tema.colores.fondo },
  contenido: { flexGrow: 1, alignItems: 'center', padding: tema.espacio.md },
  centrado: { justifyContent: 'center' },
  columna: { width: '100%', maxWidth: 420 },
  brilloArriba: {
    position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: 100,
    backgroundColor: tema.colores.brilloVerde,
  },
  brilloMedio: {
    position: 'absolute', top: 300, left: -40, width: 180, height: 180, borderRadius: 90,
    backgroundColor: tema.colores.brilloAzul,
  },
});
