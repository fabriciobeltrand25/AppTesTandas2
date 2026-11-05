import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SesionProvider, useSesion } from '../context/SesionContext';
import { tema } from '../tema';

/** Rutas que solo se pueden ver con la sesión iniciada. */
const RUTAS_PRIVADAS = ['dashboard'];

function Navegacion() {
  const { usuario, cargando } = useSesion();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    const primero = segmentos[0] as string | undefined;
    const enRutaPrivada = !!primero && RUTAS_PRIVADAS.includes(primero);

    if (!usuario && enRutaPrivada) router.replace('/' as never); // sin sesión → login
    else if (usuario && !enRutaPrivada) router.replace('/dashboard' as never); // con sesión → inicio
  }, [usuario, cargando, segmentos, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false, // usamos nuestros propios encabezados
          contentStyle: { backgroundColor: tema.colores.fondo },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="registro" />
        <Stack.Screen name="recuperar" />
        {/* Cliente: sin gesto de "atrás" para no volver al login con la sesión abierta */}
        <Stack.Screen name="dashboard" options={{ gestureEnabled: false }} />
      </Stack>

      {cargando && (
        <View style={styles.cargando}>
          <ActivityIndicator size="large" color={tema.colores.primario} />
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SesionProvider>
        <Navegacion />
      </SesionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  cargando: {
    ...StyleSheet.absoluteFill,
    backgroundColor: tema.colores.fondo,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
