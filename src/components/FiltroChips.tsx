import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { Tema } from '../tema';
import { useEstilos } from '../context/TemaContext';

interface Props<T extends string> {
  opciones: { clave: T; texto: string }[];
  activa: T;
  onCambio: (clave: T) => void;
}

/** Fila horizontal de "píldoras" para filtrar o elegir. */
export function FiltroChips<T extends string>({ opciones, activa, onCambio }: Props<T>) {
  const styles = useEstilos(crearEstilos);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
      {opciones.map((o) => {
        const esActiva = o.clave === activa;
        return (
          <Pressable
            key={o.clave}
            onPress={() => onCambio(o.clave)}
            accessibilityRole="button"
            accessibilityState={{ selected: esActiva }}
            style={[styles.chip, esActiva && styles.chipActivo]}
          >
            <Text style={[styles.texto, esActiva && styles.textoActivo]}>{o.texto}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  fila: { gap: 8, paddingVertical: 2 },
  chip: {
    height: 38, paddingHorizontal: 16, borderRadius: tema.radio.pildora, justifyContent: 'center',
    backgroundColor: tema.colores.superficieBaja, borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  chipActivo: { backgroundColor: tema.colores.relleno, borderColor: tema.colores.primario },
  texto: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto },
  textoActivo: { color: '#ffffff', fontWeight: '800' },
});
