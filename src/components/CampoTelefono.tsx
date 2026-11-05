import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { tema } from '../tema';
import { formatearTelefono, soloDigitos } from '../utils/formato';
import { BanderaHN } from './BanderaHN';
import { Icono } from './Icono';

interface Props {
  etiqueta?: string;
  nota?: string;
  /** Dígitos sin guion (ej. "98765432") */
  valor: string;
  onCambio: (digitos: string) => void;
  error?: string;
}

export function CampoTelefono({ etiqueta = 'Número de Teléfono', nota, valor, onCambio, error }: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const c = tema.colores;
  const colorBorde = error ? c.error : enfocado ? c.primario : c.borde;

  return (
    <View style={styles.contenedor}>
      <View style={styles.filaEtiqueta}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
        {nota ? <Text style={styles.nota}>{nota}</Text> : null}
      </View>

      <View style={styles.fila}>
        <View style={styles.prefijo}>
          <BanderaHN />
          <Text style={styles.prefijoTexto}>+504</Text>
        </View>

        <View style={[styles.campo, { borderColor: colorBorde, borderWidth: enfocado || error ? 2 : 1 }]}>
          <Icono name="call-outline" size={20} color={c.placeholder} />
          <TextInput
            style={styles.input}
            placeholder="9876-5432"
            placeholderTextColor={c.placeholder}
            keyboardType="phone-pad"
            maxLength={9}
            value={formatearTelefono(valor)}
            onChangeText={(t) => onCambio(soloDigitos(t).slice(0, 8))}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
          />
        </View>
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
  fila: { flexDirection: 'row', gap: tema.espacio.sm },
  prefijo: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: tema.radio.input,
    borderWidth: 1,
    borderColor: tema.colores.borde,
    backgroundColor: tema.colores.superficieBaja,
  },
  prefijoTexto: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: tema.radio.input,
    backgroundColor: tema.colores.superficie,
    paddingHorizontal: tema.espacio.md,
    gap: tema.espacio.sm,
  },
  input: { flex: 1, fontSize: 15, color: tema.colores.texto, height: '100%' },
  error: { ...tema.tipografia.cuerpoSm, color: tema.colores.error, marginTop: 4 },
});
