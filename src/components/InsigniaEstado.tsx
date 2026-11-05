import { StyleSheet, Text, View } from 'react-native';
import { tema } from '../tema';
import { Icono } from './Icono';

type Estado = 'activa' | 'pagado' | 'pendiente' | 'atrasado';

export function InsigniaEstado({ estado, texto }: { estado: Estado; texto?: string }) {
  const c = tema.colores;
  const mapa = {
    activa: { fondo: c.pagadoFondo, color: c.pagadoTexto, borde: c.pagadoBorde, etiqueta: 'Activa' },
    pagado: { fondo: c.pagadoFondo, color: c.pagadoTexto, borde: c.pagadoBorde, etiqueta: 'Al día' },
    pendiente: { fondo: c.pendienteFondo, color: c.pendienteTexto, borde: c.pendienteBorde, etiqueta: 'Pendiente' },
    atrasado: { fondo: c.atrasadoFondo, color: c.atrasadoTexto, borde: c.atrasadoBorde, etiqueta: 'En mora' },
  }[estado];

  return (
    <View style={[styles.caja, { backgroundColor: mapa.fondo, borderColor: mapa.borde }]}>
      <Icono name="ellipse" size={8} color={mapa.color} />
      <Text style={[styles.texto, { color: mapa.color }]}>{texto ?? mapa.etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: tema.radio.pildora,
    borderWidth: 1,
  },
  texto: { ...tema.tipografia.etiqueta },
});
