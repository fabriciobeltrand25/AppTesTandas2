/**
 * ComboBox de personas para "Agregar participante": lista desplegable que se muestra al tocar
 * el campo de nombre o teléfono. Muestra dos grupos:
 *   - Usuarios registrados (tienen cuenta)
 *   - Contactos de tus tandas (personas que ya agregaste antes sin cuenta, incluidos los datos de ejemplo)
 * Al tocar una persona se agrega como participante. Las que ya están en la tanda no se ofrecen.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { OpcionParticipante } from '../controllers/tandaController';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { formatearTelefono, iniciales, soloDigitos } from '../utils/formato';
import { Icono } from './Icono';

interface Props {
  opciones: OpcionParticipante[];
  /** Teléfonos que ya están en la tanda (no se vuelven a ofrecer) */
  yaAgregados: string[];
  /** Cuentas (ids) que ya están en la tanda */
  cuentasAgregadas?: number[];
  /** Texto escrito en el campo de nombre o teléfono para filtrar */
  filtro: string;
  onElegir: (opcion: OpcionParticipante) => void;
  onCerrar: () => void;
}

export function SelectorUsuarios({ opciones, yaAgregados, cuentasAgregadas = [], filtro, onElegir, onCerrar }: Props) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const texto = filtro.trim().toLowerCase();
  const digitos = soloDigitos(filtro);

  const disponibles = opciones.filter(
    (o) => !yaAgregados.includes(o.telefono) && !(o.usuarioId !== null && cuentasAgregadas.includes(o.usuarioId))
  );
  const visibles = disponibles.filter((o) => {
    if (!texto) return true;
    return o.nombre.toLowerCase().includes(texto) || (digitos.length > 0 && o.telefono.includes(digitos));
  });
  const cuentas = visibles.filter((o) => o.tipo === 'cuenta');
  const contactos = visibles.filter((o) => o.tipo === 'contacto');

  const fila = (o: OpcionParticipante) => (
    <Pressable
      key={`${o.tipo}-${o.telefono}`}
      onPress={() => onElegir(o)}
      style={({ pressed }) => [styles.fila, pressed && { backgroundColor: tema.colores.superficieMedia }]}
      accessibilityRole="button"
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarTexto}>{iniciales(o.nombre)}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.nombre} numberOfLines={1}>{o.nombre}</Text>
        <Text style={styles.telefono}>+504 {formatearTelefono(o.telefono)}</Text>
      </View>
      <Icono name="add-circle-outline" size={24} color={tema.colores.primario} />
    </Pressable>
  );

  return (
    <View style={styles.caja}>
      <View style={styles.cabecera}>
        <Icono name="people-circle-outline" size={20} color={tema.colores.primario} />
        <Text style={styles.titulo}>Elegir participante</Text>
        <Pressable onPress={onCerrar} hitSlop={10} accessibilityLabel="Cerrar lista">
          <Icono name="close" size={20} color={tema.colores.textoSecundario} />
        </Pressable>
      </View>

      {visibles.length === 0 ? (
        <Text style={styles.vacio}>
          {disponibles.length === 0
            ? 'Todas las personas guardadas ya están en la tanda. Puedes escribir los datos de alguien nuevo.'
            : 'Nadie coincide. Puedes escribir los datos completos para agregarlo.'}
        </Text>
      ) : (
        <ScrollView style={styles.lista} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {cuentas.length > 0 && <Text style={styles.grupo}>Usuarios registrados</Text>}
          {cuentas.map(fila)}
          {contactos.length > 0 && <Text style={styles.grupo}>Contactos de tus tandas</Text>}
          {contactos.map(fila)}
        </ScrollView>
      )}
    </View>
  );
}

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    flex: { flex: 1 },
    caja: {
      marginBottom: tema.espacio.md, borderRadius: tema.radio.input, borderWidth: 1.5, borderColor: tema.colores.primario,
      backgroundColor: tema.colores.superficie, overflow: 'hidden',
    },
    cabecera: {
      flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: tema.colores.fondoVerde, borderBottomWidth: 1, borderBottomColor: tema.colores.pagadoBorde,
    },
    titulo: { flex: 1, ...tema.tipografia.etiquetaLg, color: tema.colores.primario, fontWeight: '800' },
    lista: { maxHeight: 240 },
    grupo: {
      ...tema.tipografia.etiquetaSm, letterSpacing: 0.5, color: tema.colores.textoSecundario,
      paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, textTransform: 'uppercase',
    },
    fila: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: tema.colores.superficieMedia,
    },
    avatar: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: tema.colores.secundarioContenedor,
      justifyContent: 'center', alignItems: 'center',
    },
    avatarTexto: { ...tema.tipografia.etiquetaLg, fontWeight: '800', color: tema.colores.primario },
    nombre: { ...tema.tipografia.etiquetaLg, fontSize: 15, color: tema.colores.texto },
    telefono: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
    vacio: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, padding: 14 },
  });
