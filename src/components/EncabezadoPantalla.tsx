import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { Icono } from './Icono';

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Si se pasa, se muestra la flecha de regreso */
  onAtras?: () => void;
  /** Texto pequeño junto al título (ej. "En curso") */
  chip?: string;
  derecha?: ReactNode;
}

export function EncabezadoPantalla({ titulo, subtitulo, onAtras, chip, derecha }: Props) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.caja}>
      {onAtras && (
        <Pressable onPress={onAtras} hitSlop={10} accessibilityLabel="Volver" style={styles.atras}>
          <Icono name="arrow-back" size={24} color={tema.colores.texto} />
        </Pressable>
      )}
      <View style={styles.flex}>
        <View style={styles.filaTitulo}>
          <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
          {chip ? (
            <View style={styles.chip}>
              <Text style={styles.chipTexto}>{chip}</Text>
            </View>
          ) : null}
        </View>
        {subtitulo ? <Text style={styles.subtitulo} numberOfLines={1}>{subtitulo}</Text> : null}
      </View>
      {derecha}
    </View>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  caja: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: tema.espacio.md, paddingVertical: 12,
    backgroundColor: tema.colores.superficie, borderBottomWidth: 1, borderBottomColor: tema.colores.superficieMedia,
  },
  atras: { padding: 2 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titulo: { ...tema.tipografia.encabezadoMd, fontWeight: '800', color: tema.colores.texto, flexShrink: 1 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: tema.radio.pildora,
    backgroundColor: tema.colores.secundarioContenedor,
  },
  chipTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.sobreSecundarioContenedor },
  subtitulo: { ...tema.tipografia.cuerpoSm, color: tema.colores.primario, fontWeight: '600' },
});
