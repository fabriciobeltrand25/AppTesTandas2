import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tema } from '../tema';
import { Icono } from './Icono';

interface Props {
  etiqueta: string;
  nota?: string;
  valor: number;
  onCambio: (n: number) => void;
  min: number;
  max: number;
  unidad?: string;
  error?: string;
}

export function Contador({ etiqueta, nota, valor, onCambio, min, max, unidad = 'participantes', error }: Props) {
  const puedeBajar = valor > min;
  const puedeSubir = valor < max;
  return (
    <View style={styles.contenedor}>
      <View style={styles.filaEtiqueta}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
        {nota ? <Text style={styles.nota}>{nota}</Text> : null}
      </View>
      <View style={styles.caja}>
        <Pressable
          onPress={() => onCambio(valor - 1)}
          disabled={!puedeBajar}
          accessibilityLabel="Quitar uno"
          style={[styles.boton, styles.botonMenos, !puedeBajar && styles.inactivo]}
        >
          <Icono name="remove" size={24} color={tema.colores.texto} />
        </Pressable>
        <View style={styles.centro}>
          <Text style={styles.numero}>{valor}</Text>
          <Text style={styles.unidad}>{unidad}</Text>
        </View>
        <Pressable
          onPress={() => onCambio(valor + 1)}
          disabled={!puedeSubir}
          accessibilityLabel="Agregar uno"
          style={[styles.boton, styles.botonMas, !puedeSubir && styles.inactivo]}
        >
          <Icono name="add" size={24} color="#ffffff" />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginBottom: tema.espacio.sm },
  filaEtiqueta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  etiqueta: { ...tema.tipografia.etiqueta, color: tema.colores.texto },
  nota: { ...tema.tipografia.etiquetaSm, color: tema.colores.textoSecundario },
  caja: {
    flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: tema.radio.input,
    borderWidth: 1, borderColor: tema.colores.borde, backgroundColor: tema.colores.superficieBaja,
  },
  boton: { width: 48, height: 48, borderRadius: tema.radio.input, justifyContent: 'center', alignItems: 'center' },
  botonMenos: { backgroundColor: tema.colores.superficieAlta },
  botonMas: { backgroundColor: tema.colores.primarioContenedor },
  inactivo: { opacity: 0.4 },
  centro: { flex: 1, alignItems: 'center' },
  numero: { fontSize: 26, fontWeight: '800', color: tema.colores.texto, lineHeight: 30 },
  unidad: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  error: { ...tema.tipografia.cuerpoSm, color: tema.colores.error, marginTop: 4 },
});
