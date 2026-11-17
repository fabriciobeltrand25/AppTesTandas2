import { Pressable, StyleSheet, Text } from 'react-native';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { Icono, NombreIcono } from './Icono';

export function OpcionPago({
  texto,
  icono,
  activa,
  onPress,
}: {
  texto: string;
  icono: NombreIcono;
  activa: boolean;
  onPress: () => void;
}) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: activa }}
      style={[styles.caja, activa && styles.cajaActiva]}
    >
      <Icono name={icono} size={26} color={activa ? tema.colores.primario : tema.colores.textoSecundario} />
      <Text style={[styles.texto, activa && styles.textoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  caja: {
    width: '48%', minHeight: 84, borderRadius: tema.radio.tarjeta, borderWidth: 1.5, borderColor: tema.colores.borde,
    backgroundColor: tema.colores.superficieBaja, justifyContent: 'center', alignItems: 'center', gap: 6, padding: 8,
  },
  cajaActiva: { borderColor: tema.colores.primario, backgroundColor: tema.colores.fondoVerde, borderWidth: 2 },
  texto: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto, textAlign: 'center' },
  textoActivo: { color: tema.colores.primario, fontWeight: '800' },
});
