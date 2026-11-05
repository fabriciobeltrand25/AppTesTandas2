import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tema } from '../tema';
import { Icono } from './Icono';

export function CasillaAcepto({
  marcada,
  onCambio,
  children,
  error,
}: {
  marcada: boolean;
  onCambio: (v: boolean) => void;
  children: ReactNode;
  error?: string;
}) {
  return (
    <View>
      <Pressable
        onPress={() => onCambio(!marcada)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: marcada }}
        style={styles.fila}
      >
        <Icono
          name={marcada ? 'checkbox' : 'square-outline'}
          size={24}
          color={marcada ? tema.colores.primario : tema.colores.placeholder}
        />
        <Text style={styles.texto}>{children}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: tema.espacio.sm },
  texto: { flex: 1, ...tema.tipografia.cuerpo, color: tema.colores.textoSecundario },
  error: { ...tema.tipografia.cuerpoSm, color: tema.colores.error, marginTop: 4 },
});
