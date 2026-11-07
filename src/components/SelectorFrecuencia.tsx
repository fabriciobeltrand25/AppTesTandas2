import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tema } from '../tema';
import type { Frecuencia } from '../utils/fechas';
import { Icono } from './Icono';

const OPCIONES: { valor: Frecuencia; texto: string }[] = [
  { valor: 'semanal', texto: 'Semanal' },
  { valor: 'quincenal', texto: 'Quincenal' },
  { valor: 'mensual', texto: 'Mensual' },
];

export function SelectorFrecuencia({
  etiqueta = 'Frecuencia de Aportación',
  valor,
  onCambio,
}: {
  etiqueta?: string;
  valor: Frecuencia;
  onCambio: (f: Frecuencia) => void;
}) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View style={styles.fila}>
        {OPCIONES.map((o) => {
          const activa = o.valor === valor;
          return (
            <Pressable
              key={o.valor}
              onPress={() => onCambio(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: activa }}
              style={[styles.opcion, activa && styles.opcionActiva]}
            >
              {activa && <Icono name="checkmark" size={16} color="#ffffff" />}
              <Text style={[styles.texto, activa && styles.textoActivo]}>{o.texto}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginBottom: tema.espacio.md },
  etiqueta: { ...tema.tipografia.etiqueta, color: tema.colores.texto, marginBottom: 6 },
  fila: { flexDirection: 'row', gap: tema.espacio.sm },
  opcion: {
    flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: tema.radio.input, borderWidth: 1, borderColor: tema.colores.borde, backgroundColor: tema.colores.superficie,
  },
  opcionActiva: { backgroundColor: tema.colores.primario, borderColor: tema.colores.primario },
  texto: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto },
  textoActivo: { color: '#ffffff', fontWeight: '800' },
});
