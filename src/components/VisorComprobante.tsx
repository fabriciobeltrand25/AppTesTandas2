/** Muestra la foto del comprobante a pantalla completa. */
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tema } from '../tema';
import { useEstilos } from '../context/TemaContext';
import { uriDeComprobante } from '../utils/imagenes';
import { Icono } from './Icono';

export function VisorComprobante({
  base64,
  titulo,
  onCerrar,
}: {
  /** null = visor cerrado */
  base64: string | null;
  titulo?: string;
  onCerrar: () => void;
}) {
  const styles = useEstilos(crearEstilos);
  return (
    <Modal visible={base64 !== null} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.fondo}>
        <View style={styles.barra}>
          <Text style={styles.titulo} numberOfLines={1}>{titulo ?? 'Comprobante'}</Text>
          <Pressable onPress={onCerrar} hitSlop={12} accessibilityLabel="Cerrar">
            <Icono name="close" size={28} color="#ffffff" />
          </Pressable>
        </View>
        {base64 && <Image source={{ uri: uriDeComprobante(base64) }} style={styles.imagen} resizeMode="contain" />}
      </View>
    </Modal>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', paddingTop: 48, paddingBottom: 24 },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: tema.espacio.md, marginBottom: 12 },
  titulo: { ...tema.tipografia.encabezadoSm, color: '#ffffff', flex: 1, marginRight: 12 },
  imagen: { flex: 1, width: '100%' },
});
