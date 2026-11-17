import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AnimacionInicio } from '../components/AnimacionInicio';
import { ANIMACION_INICIO } from '../config';
import { SesionProvider, useSesion } from '../context/SesionContext';
import { alTocarNotificacion, configurarManejador } from '../controllers/notificacionController';
import type { Tema } from '../tema';
import { TemaProvider, useEstilos, useTema } from '../context/TemaContext';

// Cómo se muestran las notificaciones si la app está abierta
configurarManejador();

/** Rutas que solo se pueden ver con la sesión iniciada. */
const RUTAS_PRIVADAS = [
  'dashboard', 'mis-tandas', 'nueva-tanda', 'calendario', 'ronda', 'registrar-pago', 'participantes',
  'avisos', 'estadisticas', 'perfil', 'configuracion',
];

function Navegacion() {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const { usuario, cargando } = useSesion();
  const segmentos = useSegments();
  const router = useRouter();
  // La animación Lottie solo se muestra al abrir la app (este componente vive toda la sesión)
  const [animacionVisible, setAnimacionVisible] = useState<boolean>(ANIMACION_INICIO.ACTIVA);
  const quitarAnimacion = useCallback(() => setAnimacionVisible(false), []);

  useEffect(() => {
    if (cargando) return;
    const primero = segmentos[0] as string | undefined;
    const enRutaPrivada = !!primero && RUTAS_PRIVADAS.includes(primero);

    if (!usuario && enRutaPrivada) router.replace('/' as never); // sin sesión → login
    else if (usuario && !enRutaPrivada) router.replace('/dashboard' as never); // con sesión → inicio
  }, [usuario, cargando, segmentos, router]);

  // Al tocar una notificación se abre la ronda correspondiente (no hace nada si están desactivadas)
  useEffect(() => {
    if (!usuario) return;
    return alTocarNotificacion((rondaId) =>
      router.push({ pathname: '/ronda', params: { rondaId: String(rondaId) } } as never)
    );
  }, [usuario, router]);

  return (
    <>
      <StatusBar style={tema.oscuro ? 'light' : 'dark'} />
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
        <Stack.Screen name="mis-tandas" options={{ gestureEnabled: false }} />
        <Stack.Screen name="nueva-tanda" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="calendario" options={{ gestureEnabled: false }} />
        <Stack.Screen name="ronda" />
        <Stack.Screen name="registrar-pago" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="participantes" />
        <Stack.Screen name="avisos" options={{ gestureEnabled: false }} />
        <Stack.Screen name="estadisticas" />
        <Stack.Screen name="configuracion" options={{ gestureEnabled: false }} />
        <Stack.Screen name="perfil" />
      </Stack>

      {/* Animación de bienvenida (Lottie): cubre la pantalla mientras carga la BD y la sesión */}
      {animacionVisible && <AnimacionInicio listo={!cargando} onTerminar={quitarAnimacion} />}
      {/* Si la animación está desactivada en config.ts, se usa el indicador de carga normal */}
      {!animacionVisible && cargando && (
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
      <TemaProvider>
        <SesionProvider>
          <Navegacion />
        </SesionProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  cargando: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: tema.colores.fondo,
    justifyContent: 'center', alignItems: 'center',
  },
});
