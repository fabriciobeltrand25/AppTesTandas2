import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { tema } from '../tema';
import { Icono, NombreIcono } from './Icono';

interface Props extends Omit<TextInputProps, 'style'> {
  etiqueta: string;
  /** Texto pequeño a la derecha de la etiqueta (ej. "Requerido") */
  nota?: string;
  icono?: NombreIcono;
  error?: string;
  /** true = campo de contraseña con botón de ojo */
  esPassword?: boolean;
  /** Elemento extra a la derecha dentro del campo (ej. un check) */
  derecha?: ReactNode;
}

export function CampoTexto({ etiqueta, nota, icono, error, esPassword, derecha, ...resto }: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);
  const c = tema.colores;

  const colorBorde = error ? c.error : enfocado ? c.primario : c.borde;

  return (
    <View style={styles.contenedor}>
      <View style={styles.filaEtiqueta}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
        {nota ? <Text style={styles.nota}>{nota}</Text> : null}
      </View>

      <View style={[styles.campo, { borderColor: colorBorde, borderWidth: enfocado || error ? 2 : 1 }]}>
        {icono && <Icono name={icono} size={20} color={c.placeholder} style={styles.icono} />}
        <TextInput
          {...resto}
          style={styles.input}
          placeholderTextColor={c.placeholder}
          secureTextEntry={esPassword && !visible}
          onFocus={(e) => {
            setEnfocado(true);
            resto.onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            resto.onBlur?.(e);
          }}
        />
        {esPassword && (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10} accessibilityLabel="Mostrar u ocultar contraseña">
            <Icono name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={c.placeholder} />
          </Pressable>
        )}
        {derecha}
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
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: tema.radio.input,
    backgroundColor: tema.colores.superficie,
    paddingHorizontal: tema.espacio.md,
    gap: tema.espacio.sm,
  },
  icono: { marginRight: 2 },
  input: { flex: 1, ...tema.tipografia.cuerpo, fontSize: 15, color: tema.colores.texto, height: '100%' },
  error: { ...tema.tipografia.cuerpoSm, color: tema.colores.error, marginTop: 4 },
});
