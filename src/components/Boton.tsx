import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { tema } from '../tema';
import { Icono, NombreIcono } from './Icono';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'urgente';
  iconoIzquierda?: NombreIcono;
  iconoDerecha?: NombreIcono;
  cargando?: boolean;
  deshabilitado?: boolean;
  estilo?: ViewStyle;
}

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  iconoIzquierda,
  iconoDerecha,
  cargando = false,
  deshabilitado = false,
  estilo,
}: Props) {
  const c = tema.colores;
  const esSecundario = variante === 'secundario';
  const fondo = variante === 'urgente' ? c.naranja : esSecundario ? c.superficie : c.primario;
  const colorTexto = esSecundario ? c.primario : c.sobrePrimario;
  const inactivo = deshabilitado || cargando;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: fondo },
        esSecundario && { borderWidth: 1.5, borderColor: c.primario },
        !esSecundario && tema.sombras.boton,
        { opacity: inactivo ? 0.6 : pressed ? 0.85 : 1 },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <>
          {iconoIzquierda && <Icono name={iconoIzquierda} size={20} color={colorTexto} />}
          <Text style={[styles.texto, { color: colorTexto }]}>{titulo}</Text>
          {iconoDerecha && <Icono name={iconoDerecha} size={20} color={colorTexto} />}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: tema.radio.input,
    paddingHorizontal: tema.espacio.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tema.espacio.sm,
  },
  texto: { ...tema.tipografia.cuerpoLg, fontWeight: '700' },
});
