import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { tema } from '../tema';

interface Props {
  etiqueta: string;
  nota?: string;
  valor: string;
  onCambio: (texto: string) => void;
  error?: string;
}

/** Deja solo números y un punto decimal (máx. 2 decimales). */
function limpiarMonto(t: string): string {
  const limpio = t.replace(',', '.').replace(/[^0-9.]/g, '');
  const [entero, ...resto] = limpio.split('.');
  if (resto.length === 0) return entero.slice(0, 7);
  return `${entero.slice(0, 7)}.${resto.join('').slice(0, 2)}`;
}

export function CampoMonto({ etiqueta, nota, valor, onCambio, error }: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const c = tema.colores;
  const colorBorde = error ? c.error : enfocado ? c.primario : c.borde;

  return (
    <View style={styles.contenedor}>
      <View style={styles.filaEtiqueta}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
        {nota ? <Text style={styles.nota}>{nota}</Text> : null}
      </View>
      <View style={[styles.campo, { borderColor: colorBorde, borderWidth: enfocado || error ? 2 : 1 }]}>
        <Text style={styles.prefijo}>L</Text>
        <TextInput
          style={styles.input}
          value={valor}
          onChangeText={(t) => onCambio(limpiarMonto(t))}
          placeholder="500"
          placeholderTextColor={c.placeholder}
          keyboardType="decimal-pad"
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
        />
        <Text style={styles.sufijo}>HNL</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginBottom: tema.espacio.md },
  filaEtiqueta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  etiqueta: { ...tema.tipografia.etiqueta, color: tema.colores.texto },
  nota: { ...tema.tipografia.cuerpoSm, color: tema.colores.placeholder },
  campo: {
    flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: tema.radio.input,
    backgroundColor: tema.colores.superficie, paddingHorizontal: tema.espacio.md, gap: 10,
  },
  prefijo: { fontSize: 20, fontWeight: '800', color: tema.colores.textoSecundario },
  input: { flex: 1, fontSize: 22, fontWeight: '700', color: tema.colores.texto, height: '100%' },
  sufijo: { ...tema.tipografia.etiqueta, color: tema.colores.placeholder },
  error: { ...tema.tipografia.cuerpoSm, color: tema.colores.error, marginTop: 4 },
});
