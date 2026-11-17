import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { fechaCorta, formatearTelefono } from '../utils/formato';
import { Icono } from './Icono';

interface Props {
  /** Posición en la lista (0 = primero) */
  indice: number;
  nombre: string;
  telefono: string;
  esAdmin?: boolean;
  /** Si es false (sorteo pendiente) se muestra un signo de pregunta en vez del turno */
  mostrarTurno: boolean;
  /** Fecha estimada de cobro (ISO), solo si se muestra el turno */
  fecha?: string;
  /** Muestra flechas para reordenar (modo manual) */
  reordenable?: boolean;
  puedeSubir?: boolean;
  puedeBajar?: boolean;
  onSubir?: () => void;
  onBajar?: () => void;
  onQuitar?: () => void;
}

export function FilaParticipante(p: Props) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const c = tema.colores;
  const numero = String(p.indice + 1).padStart(2, '0');
  return (
    <View style={[styles.fila, p.esAdmin && styles.filaAdmin]}>
      <View style={[styles.insignia, p.esAdmin && styles.insigniaAdmin]}>
        <Text style={[styles.insigniaTexto, p.esAdmin && { color: '#ffffff' }]}>
          {p.mostrarTurno ? numero : '?'}
        </Text>
      </View>

      <View style={styles.flex}>
        <View style={styles.filaNombre}>
          <Text style={styles.nombre} numberOfLines={1}>{p.nombre}</Text>
          {p.esAdmin && (
            <View style={styles.chipAdmin}>
              <Text style={styles.chipAdminTexto}>Tú (Admin)</Text>
            </View>
          )}
        </View>
        <View style={styles.filaTelefono}>
          <Icono name="call-outline" size={13} color={c.textoSecundario} />
          <Text style={styles.telefono}>+504 {formatearTelefono(p.telefono)}</Text>
        </View>
      </View>

      {p.mostrarTurno && (
        <View style={styles.derecha}>
          <Text style={styles.turno}>Turno {p.indice + 1}</Text>
          {p.fecha ? <Text style={styles.fecha}>{fechaCorta(p.fecha)}</Text> : null}
        </View>
      )}

      {p.reordenable && (
        <View style={styles.flechas}>
          <Pressable onPress={p.onSubir} disabled={!p.puedeSubir} hitSlop={6} accessibilityLabel="Subir turno">
            <Icono name="chevron-up" size={20} color={p.puedeSubir ? c.texto : c.borde} />
          </Pressable>
          <Pressable onPress={p.onBajar} disabled={!p.puedeBajar} hitSlop={6} accessibilityLabel="Bajar turno">
            <Icono name="chevron-down" size={20} color={p.puedeBajar ? c.texto : c.borde} />
          </Pressable>
        </View>
      )}

      {!p.esAdmin && p.onQuitar && (
        <Pressable onPress={p.onQuitar} hitSlop={8} accessibilityLabel="Quitar participante">
          <Icono name="close" size={22} color={c.textoSecundario} />
        </Pressable>
      )}
    </View>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: tema.radio.tarjeta,
    backgroundColor: tema.colores.superficieBaja, borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  filaAdmin: { backgroundColor: tema.colores.fondoVerde2, borderColor: tema.colores.pagadoBorde },
  insignia: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: tema.colores.superficieAlta,
    justifyContent: 'center', alignItems: 'center',
  },
  insigniaAdmin: { backgroundColor: tema.colores.relleno },
  insigniaTexto: { ...tema.tipografia.etiquetaLg, fontWeight: '800', color: tema.colores.textoSecundario },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nombre: { flexShrink: 1, ...tema.tipografia.etiquetaLg, fontSize: 15, color: tema.colores.texto },
  chipAdmin: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: tema.radio.pildora,
    backgroundColor: tema.colores.secundarioContenedor,
  },
  chipAdminTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.sobreSecundarioContenedor },
  filaTelefono: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  telefono: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  derecha: { alignItems: 'flex-end' },
  turno: { ...tema.tipografia.etiqueta, fontWeight: '700', color: tema.colores.texto },
  fecha: { ...tema.tipografia.etiquetaSm, color: tema.colores.textoSecundario },
  flechas: { gap: 2 },
});
