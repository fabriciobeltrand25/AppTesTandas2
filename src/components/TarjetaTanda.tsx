import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TandaVista } from '../controllers/tandaController';
import { tema } from '../tema';
import { etiquetaFrecuencia, fechaCorta, formatearLempiras, iniciales } from '../utils/formato';
import { BarraProgreso } from './BarraProgreso';
import { Icono } from './Icono';
import { InsigniaEstado } from './InsigniaEstado';

export function TarjetaTanda({ tanda, onPress }: { tanda: TandaVista; onPress?: () => void }) {
  const c = tema.colores;
  const ronda = tanda.rondaActual;
  const numeroRonda = ronda ? ronda.numero : tanda.totalRondas;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tarjeta,
        tanda.esMiTurno ? [styles.tarjetaDestacada, tema.sombras.nivel2] : tema.sombras.nivel1,
        pressed && { opacity: 0.92 },
      ]}
    >
      {tanda.esMiTurno && (
        <View style={styles.avisoTurno}>
          <Icono name="sparkles" size={16} color={c.terciario} />
          <Text style={styles.avisoTexto}>¡Esta ronda te toca cobrar!</Text>
        </View>
      )}

      <View style={styles.cuerpo}>
        <View style={styles.filaTitulo}>
          <Text style={styles.titulo} numberOfLines={2}>{tanda.nombre}</Text>
          <InsigniaEstado estado="activa" texto={tanda.estado === 'activa' ? 'Activa' : 'Finalizada'} />
        </View>

        <View style={styles.filaCuota}>
          <Icono name="cash-outline" size={18} color={c.textoSecundario} />
          <Text style={styles.cuota}>
            Cuota: <Text style={styles.cuotaMonto}>{formatearLempiras(tanda.cuota)}</Text> / {etiquetaFrecuencia(tanda.frecuencia)}
          </Text>
        </View>

        <View style={styles.filaProgreso}>
          <Text style={styles.progresoEtiqueta}>Progreso de entregas</Text>
          <Text style={styles.progresoValor}>
            Ronda {numeroRonda} de {tanda.totalRondas} ({tanda.porcentaje}%)
          </Text>
        </View>
        <BarraProgreso porcentaje={tanda.porcentaje} />
      </View>

      {ronda && (
        <View style={[styles.pie, tanda.esMiTurno && styles.pieDestacado]}>
          <View style={styles.avatar}>
            {tanda.esMiTurno ? (
              <Icono name="person" size={18} color={c.primario} />
            ) : (
              <Text style={styles.avatarTexto}>{iniciales(ronda.beneficiarioNombre)}</Text>
            )}
          </View>
          <View style={styles.flex}>
            <Text style={styles.pieEtiqueta}>{tanda.esMiTurno ? 'BENEFICIARIO ACTUAL' : 'PRÓXIMO COBRO'}</Text>
            <Text style={styles.pieNombre} numberOfLines={1}>
              {tanda.esMiTurno ? 'Tú' : ronda.beneficiarioNombre}
            </Text>
          </View>
          {tanda.esMiTurno ? (
            <View style={styles.derecha}>
              <Text style={styles.pieEtiqueta}>Monto a recibir:</Text>
              <Text style={styles.pieMonto}>{formatearLempiras(tanda.montoARecibir)}</Text>
            </View>
          ) : (
            <View style={styles.fecha}>
              <Icono name="calendar-outline" size={14} color={c.textoSecundario} />
              <Text style={styles.fechaTexto}>{fechaCorta(ronda.fecha)}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tarjeta: {
    backgroundColor: tema.colores.superficie,
    borderRadius: tema.radio.tarjeta,
    borderWidth: 1,
    borderColor: tema.colores.bordeSuave,
    overflow: 'hidden',
  },
  tarjetaDestacada: { borderColor: 'rgba(16, 185, 129, 0.35)', borderWidth: 1.5 },
  avisoTurno: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    marginTop: tema.espacio.md, marginLeft: tema.espacio.md,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: tema.radio.pildora,
    backgroundColor: '#fff4d6', borderWidth: 1, borderColor: '#fbd77a',
  },
  avisoTexto: { ...tema.tipografia.etiqueta, color: tema.colores.terciario },
  cuerpo: { padding: tema.espacio.md, gap: 10 },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  titulo: { flex: 1, ...tema.tipografia.encabezadoSm, fontWeight: '800', color: tema.colores.texto },
  filaCuota: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cuota: { ...tema.tipografia.cuerpo, color: tema.colores.textoSecundario },
  cuotaMonto: { fontWeight: '700', color: tema.colores.texto },
  filaProgreso: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progresoEtiqueta: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  progresoValor: { ...tema.tipografia.etiqueta, color: tema.colores.primario, fontWeight: '700' },
  pie: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: tema.espacio.md, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: tema.colores.superficieMedia,
  },
  pieDestacado: { backgroundColor: '#f0f7f3', borderTopWidth: 0 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: tema.colores.superficieAlta,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { ...tema.tipografia.etiqueta, fontWeight: '800', color: tema.colores.texto },
  pieEtiqueta: { ...tema.tipografia.etiquetaSm, color: tema.colores.textoSecundario },
  pieNombre: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto },
  derecha: { alignItems: 'flex-end' },
  pieMonto: { ...tema.tipografia.encabezadoSm, fontWeight: '800', color: tema.colores.primario },
  fecha: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: tema.radio.input, backgroundColor: tema.colores.superficieBaja,
  },
  fechaTexto: { ...tema.tipografia.etiqueta, color: tema.colores.texto },
});
