/** Barra de navegación inferior (Inicio · Mis Tandas · Calendario · Avisos · Perfil). */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tema } from '../tema';
import { Icono, NombreIcono } from './Icono';

export type ClaveSeccion = 'inicio' | 'tandas' | 'calendario' | 'avisos' | 'perfil';

const SECCIONES: { clave: ClaveSeccion; etiqueta: string; icono: NombreIcono; iconoActivo: NombreIcono }[] = [
  { clave: 'inicio', etiqueta: 'Inicio', icono: 'home-outline', iconoActivo: 'home' },
  { clave: 'tandas', etiqueta: 'Mis Tandas', icono: 'people-outline', iconoActivo: 'people' },
  { clave: 'calendario', etiqueta: 'Calendario', icono: 'calendar-outline', iconoActivo: 'calendar' },
  { clave: 'avisos', etiqueta: 'Avisos', icono: 'notifications-outline', iconoActivo: 'notifications' },
  { clave: 'perfil', etiqueta: 'Perfil', icono: 'person-outline', iconoActivo: 'person' },
];

interface Props {
  activa: ClaveSeccion;
  onSeleccionar: (clave: ClaveSeccion) => void;
}

export function BarraInferior({ activa, onSeleccionar }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.barra, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {SECCIONES.map((s) => {
        const esActiva = s.clave === activa;
        return (
          <Pressable
            key={s.clave}
            onPress={() => onSeleccionar(s.clave)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: esActiva }}
          >
            <View style={[styles.circulo, esActiva && styles.circuloActivo]}>
              <Icono
                name={esActiva ? s.iconoActivo : s.icono}
                size={24}
                color={esActiva ? tema.colores.primario : tema.colores.textoSecundario}
              />
            </View>
            <Text style={[styles.etiqueta, esActiva && styles.etiquetaActiva]}>{s.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: tema.colores.superficie,
    borderTopWidth: 1,
    borderTopColor: tema.colores.superficieMedia,
    paddingTop: 8,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  circulo: { width: 48, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  circuloActivo: { backgroundColor: tema.colores.secundarioContenedor },
  etiqueta: { ...tema.tipografia.etiquetaSm, fontWeight: '600', color: tema.colores.textoSecundario },
  etiquetaActiva: { color: tema.colores.primario, fontWeight: '800' },
});
