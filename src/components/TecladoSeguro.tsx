/**
 * SOLUCIÓN GLOBAL AL TECLADO (Android APK + iOS).
 *
 * Por qué fallaba: en el APK moderno (edge-to-edge) Android ya NO redimensiona la ventana al abrir
 * el teclado, y `KeyboardAvoidingView` sin `behavior` en Android no hace nada. Resultado: el teclado
 * tapaba los campos y el scroll no llegaba.
 *
 * Esta solución funciona igual con o sin edge-to-edge y sin librerías nativas nuevas:
 *  - <PantallaTeclado>  : contenedor que mide cuánto lo tapa el teclado y se acorta ese tanto
 *                         (así también suben los botones fijos de abajo).
 *  - <ScrollTeclado>    : ScrollView que, al abrir el teclado o tocar otro campo, se desplaza solo
 *                         para dejar el campo enfocado visible. Además se puede hacer scroll hacia arriba.
 *
 * Uso típico:
 *   <SafeAreaView edges={['top','bottom']}>
 *     <Encabezado />
 *     <PantallaTeclado>
 *       <ScrollTeclado contentContainerStyle={...}> ...campos... </ScrollTeclado>
 *       <BotonFijoAbajo />      // opcional
 *     </PantallaTeclado>
 *   </SafeAreaView>
 */
import { createContext, forwardRef, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardEvent,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

const MARGEN = 24; // espacio libre que se deja entre el campo y el teclado

const EVENTO_MOSTRAR = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const EVENTO_OCULTAR = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/** Cuánto se acorta el contenedor por el teclado (0 si no hay teclado). */
const AlturaTecladoContexto = createContext(0);

export function PantallaTeclado({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<View>(null);
  const [tapado, setTapado] = useState(0);

  useEffect(() => {
    const medir = (e: KeyboardEvent) => {
      const topeTeclado = e.endCoordinates.screenY;
      // Se mide el borde inferior del contenedor DESPUÉS de que Android termine de acomodar la ventana
      setTimeout(() => {
        ref.current?.measureInWindow((_x, y, _w, h) => {
          // Con el teclado cerrado, h incluye ya el padding que pusimos, pero el borde inferior (y+h) no cambia.
          setTapado(Math.max(0, Math.round(y + h - topeTeclado)));
        });
      }, Platform.OS === 'ios' ? 0 : 60);
    };
    const a = Keyboard.addListener(EVENTO_MOSTRAR, medir);
    const b = Keyboard.addListener(EVENTO_OCULTAR, () => setTapado(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  return (
    <AlturaTecladoContexto.Provider value={tapado}>
      <View ref={ref} style={[{ flex: 1, paddingBottom: tapado }, style]} collapsable={false}>
        {children}
      </View>
    </AlturaTecladoContexto.Provider>
  );
}

/** ScrollView que mantiene visible el campo que se está escribiendo. */
export const ScrollTeclado = forwardRef<ScrollView, ScrollViewProps>(function ScrollTeclado(props, refExterna) {
  const interno = useRef<ScrollView>(null);
  const desplazamiento = useRef(0);
  const tecladoAbierto = useRef(false);
  const tapado = useContext(AlturaTecladoContexto);

  const asignarRef = useCallback(
    (nodo: ScrollView | null) => {
      (interno as React.MutableRefObject<ScrollView | null>).current = nodo;
      if (typeof refExterna === 'function') refExterna(nodo);
      else if (refExterna) (refExterna as React.MutableRefObject<ScrollView | null>).current = nodo;
    },
    [refExterna]
  );

  /** Si el campo enfocado queda tapado por el teclado (o por el borde de abajo), desplaza el scroll. */
  const asegurarVisible = useCallback(() => {
    const campo = TextInput.State.currentlyFocusedInput?.();
    const scroll = interno.current;
    if (!campo || !scroll) return;
    scroll.measureInWindow((_sx, sy, _sw, sh) => {
      campo.measureInWindow((_x, y, _w, h) => {
        const bordeInferior = sy + sh - MARGEN;
        const bordeSuperior = sy + MARGEN;
        if (y + h > bordeInferior) {
          scroll.scrollTo({ y: desplazamiento.current + (y + h - bordeInferior), animated: true });
        } else if (y < bordeSuperior) {
          scroll.scrollTo({ y: Math.max(0, desplazamiento.current - (bordeSuperior - y)), animated: true });
        }
      });
    });
  }, []);

  // Cuando el contenedor ya se acortó por el teclado, se centra el campo enfocado
  useEffect(() => {
    if (tapado > 0) {
      tecladoAbierto.current = true;
      const t = setTimeout(asegurarVisible, 120);
      return () => clearTimeout(t);
    }
    tecladoAbierto.current = false;
  }, [tapado, asegurarVisible]);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      {...props}
      ref={asignarRef}
      onScroll={(e) => {
        desplazamiento.current = e.nativeEvent.contentOffset.y;
        props.onScroll?.(e);
      }}
      // Al tocar otro campo con el teclado ya abierto no se dispara "keyboardShow": se revisa aquí
      onTouchEndCapture={(e) => {
        props.onTouchEndCapture?.(e);
        if (tecladoAbierto.current) setTimeout(asegurarVisible, 250);
      }}
    >
      {props.children}
    </ScrollView>
  );
});
