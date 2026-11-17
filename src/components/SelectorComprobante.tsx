import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { elegirComprobante, uriDeComprobante, type OrigenFoto } from '../utils/imagenes';
import { Icono } from './Icono';

interface Props {
  /** Foto actual en base64 (o null) */
  valor: string | null;
  onCambio: (base64: string | null) => void;
}

export function SelectorComprobante({ valor, onCambio }: Props) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const [cargando, setCargando] = useState(false);

  const elegir = async (origen: OrigenFoto) => {
    setCargando(true);
    const foto = await elegirComprobante(origen);
    setCargando(false);
    if (foto) onCambio(foto);
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.filaTitulo}>
        <Text style={styles.titulo}>Comprobante de depósito o transferencia</Text>
        <Text style={styles.opcional}>Opcional</Text>
      </View>

      <View style={styles.caja}>
        {cargando ? (
          <View style={styles.centro}>
            <ActivityIndicator color={tema.colores.primario} />
            <Text style={styles.nota}>Procesando foto...</Text>
          </View>
        ) : valor ? (
          <View style={styles.previa}>
            <Image source={{ uri: uriDeComprobante(valor) }} style={styles.imagen} resizeMode="cover" />
            <View style={styles.flex}>
              <View style={styles.cargado}>
                <Icono name="checkmark-circle" size={18} color={tema.colores.primario} />
                <Text style={styles.cargadoTexto}>1 archivo cargado</Text>
              </View>
              <View style={styles.acciones}>
                <Pressable onPress={() => elegir('galeria')} hitSlop={8}>
                  <Text style={styles.enlace}>Cambiar</Text>
                </Pressable>
                <Pressable onPress={() => onCambio(null)} hitSlop={8}>
                  <Text style={[styles.enlace, { color: tema.colores.error }]}>Quitar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.centro}>
            <Icono name="image-outline" size={30} color={tema.colores.placeholder} />
            <Text style={styles.nota}>Adjunta la foto del comprobante para tener respaldo del pago.</Text>
            <View style={styles.botones}>
              <Pressable onPress={() => elegir('camara')} style={styles.boton} accessibilityRole="button">
                <Icono name="camera-outline" size={20} color={tema.colores.primario} />
                <Text style={styles.botonTexto}>Tomar foto</Text>
              </Pressable>
              <Pressable onPress={() => elegir('galeria')} style={styles.boton} accessibilityRole="button">
                <Icono name="images-outline" size={20} color={tema.colores.primario} />
                <Text style={styles.botonTexto}>Galería</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  contenedor: { gap: 8 },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  titulo: { ...tema.tipografia.encabezadoSm, fontWeight: '800', color: tema.colores.texto, flex: 1, fontSize: 16 },
  opcional: { ...tema.tipografia.cuerpoSm, color: tema.colores.placeholder },
  caja: {
    borderRadius: tema.radio.tarjeta, borderWidth: 2, borderStyle: 'dashed', borderColor: tema.colores.borde,
    backgroundColor: tema.colores.superficieBaja, padding: tema.espacio.md,
  },
  centro: { alignItems: 'center', gap: 8 },
  nota: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, textAlign: 'center' },
  botones: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 4 },
  boton: {
    flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: tema.radio.input, borderWidth: 1.5, borderColor: tema.colores.primario, backgroundColor: tema.colores.superficie,
  },
  botonTexto: { ...tema.tipografia.etiquetaLg, color: tema.colores.primario, fontWeight: '800' },
  previa: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  imagen: { width: 84, height: 84, borderRadius: tema.radio.input, backgroundColor: tema.colores.superficieAlta },
  cargado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cargadoTexto: { ...tema.tipografia.etiquetaLg, color: tema.colores.primario },
  acciones: { flexDirection: 'row', gap: 20, marginTop: 10 },
  enlace: { ...tema.tipografia.etiquetaLg, color: tema.colores.primario, fontWeight: '800' },
});
