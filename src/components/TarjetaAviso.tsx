import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Aviso } from '../controllers/avisoController';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { Icono, NombreIcono } from './Icono';

const estilosPorNivel = (tema: Tema): Record<Aviso['nivel'], { icono: NombreIcono; fondo: string; color: string }> => ({
  alerta: { icono: 'alert-circle-outline', fondo: tema.colores.atrasadoFondo, color: tema.colores.atrasadoTexto },
  info: { icono: 'time-outline', fondo: tema.colores.pendienteFondo, color: tema.colores.pendienteTexto },
  exito: { icono: 'checkmark-circle-outline', fondo: tema.colores.pagadoFondo, color: tema.colores.pagadoTexto },
});

export function TarjetaAviso({ aviso, onPress }: { aviso: Aviso; onPress?: () => void }) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const e = estilosPorNivel(tema)[aviso.nivel];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.tarjeta, tema.sombras.nivel1, pressed && { opacity: 0.9 }]}
    >
      <View style={[styles.icono, { backgroundColor: e.fondo }]}>
        <Icono name={e.icono} size={24} color={e.color} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.titulo}>{aviso.titulo}</Text>
        <Text style={styles.detalle}>{aviso.detalle}</Text>
      </View>
      {aviso.marca ? <Text style={[styles.marca, { color: e.color }]}>{aviso.marca}</Text> : null}
    </Pressable>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: tema.espacio.md,
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.tarjeta,
    borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  icono: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  titulo: { ...tema.tipografia.etiquetaLg, fontSize: 15, fontWeight: '800', color: tema.colores.texto },
  detalle: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginTop: 2 },
  marca: { ...tema.tipografia.etiqueta, fontWeight: '800', maxWidth: 90, textAlign: 'right' },
});
