/**
 * Pantalla de bienvenida con animación Lottie (Revenue.json).
 * Se muestra encima de todo al abrir la app. Termina cuando:
 *   1) la animación acaba (o el usuario la omite tocando la pantalla) Y
 *   2) la base de datos / sesión ya están listas (prop "listo").
 */
import LottieView from 'lottie-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { ANIMACION_INICIO } from '../config';
import { useEstilos } from '../context/TemaContext';
import type { Tema } from '../tema';

interface Props {
  /** true cuando la app ya terminó de cargar (BD + sesión) */
  listo: boolean;
  /** se llama una sola vez, cuando ya se puede quitar la animación */
  onTerminar: () => void;
}

export function AnimacionInicio({ listo, onTerminar }: Props) {
  const styles = useEstilos(crearEstilos);
  const opacidad = useRef(new Animated.Value(1)).current;
  const animacionTermino = useRef(false);
  const avisado = useRef(false);

  const intentarCerrar = useCallback(
    (terminoAnimacion: boolean, appLista: boolean) => {
      if (terminoAnimacion) animacionTermino.current = true;
      if (avisado.current || !animacionTermino.current || !appLista) return;
      avisado.current = true;
      Animated.timing(opacidad, { toValue: 0, duration: 350, useNativeDriver: true }).start(onTerminar);
    },
    [onTerminar, opacidad]
  );

  // Si la BD tardó más que la animación, se cierra en cuanto "listo" pase a true
  useEffect(() => {
    intentarCerrar(false, listo);
  }, [listo, intentarCerrar]);

  return (
    <Animated.View style={[styles.raiz, { opacity: opacidad }]} pointerEvents="auto">
      <Pressable
        style={styles.toque}
        disabled={!ANIMACION_INICIO.SE_PUEDE_OMITIR}
        onPress={() => intentarCerrar(true, listo)}
        accessibilityLabel="Omitir animación"
      >
        <LottieView
          source={require('../assets/lottie/revenue.json')}
          autoPlay
          loop={false}
          speed={ANIMACION_INICIO.VELOCIDAD}
          resizeMode="contain"
          style={styles.animacion}
          onAnimationFinish={(cancelado) => {
            if (!cancelado) intentarCerrar(true, listo);
          }}
        />
        {ANIMACION_INICIO.SE_PUEDE_OMITIR && <Text style={styles.omitir}>Toca para continuar</Text>}
      </Pressable>
    </Animated.View>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  raiz: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: tema.colores.fondo,
    zIndex: 1000, elevation: 1000,
  },
  toque: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  animacion: { width: '100%', height: '100%' },
  omitir: {
    position: 'absolute', bottom: 48, color: tema.colores.textoSecundario, fontSize: 13,
  },
});
