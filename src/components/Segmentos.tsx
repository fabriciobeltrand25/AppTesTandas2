import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tema } from '../tema';
import { useEstilos } from '../context/TemaContext';

interface Opcion<T extends string> {
  clave: T;
  texto: string;
  cantidad?: number;
}

interface Props<T extends string> {
  opciones: Opcion<T>[];
  activa: T;
  onCambio: (clave: T) => void;
}

/** Pestañas tipo "Pendientes (3) | Pagaron (7)". */
export function Segmentos<T extends string>({ opciones, activa, onCambio }: Props<T>) {
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.caja}>
      {opciones.map((o) => {
        const esActiva = o.clave === activa;
        return (
          <Pressable
            key={o.clave}
            onPress={() => onCambio(o.clave)}
            accessibilityRole="tab"
            accessibilityState={{ selected: esActiva }}
            style={[styles.opcion, esActiva && styles.opcionActiva]}
          >
            <Text style={[styles.texto, esActiva && styles.textoActivo]}>{o.texto}</Text>
            {o.cantidad !== undefined && (
              <View style={[styles.contador, esActiva && styles.contadorActivo]}>
                <Text style={[styles.contadorTexto, esActiva && { color: '#ffffff' }]}>{o.cantidad}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  caja: { flexDirection: 'row', padding: 4, borderRadius: tema.radio.input, backgroundColor: tema.colores.superficieMedia, gap: 4 },
  opcion: {
    flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: tema.radio.md,
  },
  opcionActiva: { backgroundColor: tema.colores.superficie },
  texto: { ...tema.tipografia.etiquetaLg, color: tema.colores.textoSecundario },
  textoActivo: { color: tema.colores.primario, fontWeight: '800' },
  contador: {
    minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11,
    backgroundColor: tema.colores.superficieAlta, justifyContent: 'center', alignItems: 'center',
  },
  contadorActivo: { backgroundColor: tema.colores.terciarioRelleno },
  contadorTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.textoSecundario },
});
