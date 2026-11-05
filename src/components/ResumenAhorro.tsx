/** Tarjeta verde principal del dashboard: total recolectado y próximo cobro. */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import type { ProximoCobro } from '../controllers/tandaController';
import { tema } from '../tema';
import { fechaLarga, formatearLempiras } from '../utils/formato';
import { Boton } from './Boton';
import { Icono } from './Icono';

interface Props {
  total: number;
  tandasActivas: number;
  proximoCobro: ProximoCobro | null;
  onEstadisticas: () => void;
  onCompartir: () => void;
}

export function ResumenAhorro({ total, tandasActivas, proximoCobro, onEstadisticas, onCompartir }: Props) {
  const c = tema.colores;
  return (
    <LinearGradient
      colors={[c.primario, c.primarioContenedor]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.tarjeta, tema.sombras.nivel2]}
    >
      <View style={styles.filaSuperior}>
        <View style={styles.etiquetaTotal}>
          <Icono name="wallet-outline" size={16} color={c.secundarioContenedor} />
          <Text style={styles.etiquetaTexto}>TOTAL RECOLECTADO EN CURSO</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipTexto}>
            {tandasActivas} {tandasActivas === 1 ? 'Tanda activa' : 'Tandas activas'}
          </Text>
        </View>
      </View>

      <View style={styles.filaMonto}>
        <Text style={styles.monto}>{formatearLempiras(total)}</Text>
        <Text style={styles.moneda}>HNL</Text>
      </View>
      <Text style={styles.subtexto}>Suma de los pagos registrados en tus tandas</Text>

      {proximoCobro ? (
        <View style={styles.cobro}>
          <View style={styles.iconoCobro}>
            <Icono name="calendar-outline" size={22} color="#ffffff" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.cobroEtiqueta}>PRÓXIMO COBRO</Text>
            <Text style={styles.cobroFecha}>{fechaLarga(proximoCobro.fecha)}</Text>
          </View>
          <View style={styles.cobroDerecha}>
            <Text style={styles.cobroMonto}>{formatearLempiras(proximoCobro.monto)}</Text>
            <Text style={styles.cobroRonda}>Ronda #{proximoCobro.rondaNumero}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.filaBotones}>
        <Boton
          titulo="Ver estadísticas"
          iconoIzquierda="stats-chart"
          variante="secundario"
          onPress={onEstadisticas}
          estilo={styles.botonEstadisticas}
        />
        <Boton
          titulo=""
          iconoIzquierda="share-social-outline"
          onPress={onCompartir}
          estilo={styles.botonCompartir}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tarjeta: { borderRadius: 24, padding: tema.espacio.lg },
  filaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  etiquetaTotal: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  etiquetaTexto: { ...tema.tipografia.etiqueta, color: tema.colores.secundarioContenedor, flexShrink: 1 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: tema.radio.pildora,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  chipTexto: { ...tema.tipografia.etiqueta, color: '#ffffff' },
  filaMonto: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: tema.espacio.md },
  monto: { ...tema.tipografia.moneda, color: '#ffffff' },
  moneda: { ...tema.tipografia.etiquetaLg, color: 'rgba(255,255,255,0.8)' },
  subtexto: { ...tema.tipografia.cuerpoSm, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  cobro: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: tema.espacio.md,
    padding: 12, borderRadius: tema.radio.tarjeta,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  iconoCobro: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  cobroEtiqueta: { ...tema.tipografia.etiquetaSm, color: tema.colores.secundarioContenedor },
  cobroFecha: { ...tema.tipografia.encabezadoSm, color: '#ffffff' },
  cobroDerecha: { alignItems: 'flex-end' },
  cobroMonto: { ...tema.tipografia.etiquetaLg, fontWeight: '800', color: '#ffffff' },
  cobroRonda: { ...tema.tipografia.cuerpoSm, color: 'rgba(255,255,255,0.8)' },
  filaBotones: { flexDirection: 'row', gap: 12, marginTop: tema.espacio.md },
  botonEstadisticas: { flex: 1, borderWidth: 0 },
  botonCompartir: { width: 52, paddingHorizontal: 0, backgroundColor: 'rgba(255,255,255,0.18)' },
});
