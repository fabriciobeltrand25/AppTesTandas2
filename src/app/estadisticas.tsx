/** Estadísticas generales (ruta "/estadisticas"). */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarraProgreso } from '../components/BarraProgreso';
import { EncabezadoPantalla } from '../components/EncabezadoPantalla';
import { Icono, NombreIcono } from '../components/Icono';
import { useSesion } from '../context/SesionContext';
import { obtenerEstadisticas, type Estadisticas } from '../controllers/estadisticasController';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { formatearLempiras } from '../utils/formato';

function Kpi({ icono, valor, etiqueta, color }: { icono: NombreIcono; valor: string; etiqueta: string; color: string }) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <View style={[styles.kpi, tema.sombras.nivel1]}>
      <Icono name={icono} size={22} color={color} />
      <Text style={styles.kpiValor}>{valor}</Text>
      <Text style={styles.kpiEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

export default function EstadisticasScreen() {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { usuario } = useSesion();
  const [datos, setDatos] = useState<Estadisticas | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (usuario) setDatos(await obtenerEstadisticas(usuario));
  }, [usuario]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const refrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  if (!usuario) return null;
  const c = tema.colores;
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/dashboard' as never));

  return (
    <SafeAreaView style={styles.raiz} edges={['top', 'bottom']}>
      <EncabezadoPantalla titulo="Estadísticas" subtitulo="Resumen de todas tus tandas" onAtras={volver} />

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.primario} />}
      >
        {datos && (
          <>
            <View style={styles.kpis}>
              <Kpi icono="wallet-outline" valor={formatearLempiras(datos.totalAhorrado)} etiqueta="Total ahorrado" color={c.primario} />
              <Kpi icono="download-outline" valor={formatearLempiras(datos.totalCobrado)} etiqueta="Has cobrado" color={c.primario} />
              <Kpi icono="arrow-up-circle-outline" valor={formatearLempiras(datos.cuotasPagadasMonto)} etiqueta="Cuotas que pagaste" color={c.textoSecundario} />
              <Kpi icono="briefcase-outline" valor={formatearLempiras(datos.totalRecolectado)} etiqueta="Recolectado como organizador" color={c.textoSecundario} />
              <Kpi icono="checkmark-circle-outline" valor={String(datos.pagosRegistrados)} etiqueta="Pagos registrados" color={c.primario} />
              <Kpi icono="alarm-outline" valor={formatearLempiras(datos.recargosCobrados)} etiqueta="Recargos cobrados" color={c.terciario} />
              <Kpi icono="alert-circle-outline" valor={String(datos.cuotasAtrasadas)} etiqueta="Cuotas atrasadas" color={datos.cuotasAtrasadas ? c.atrasadoTexto : c.textoSecundario} />
              <Kpi icono="people-outline" valor={`${datos.tandasActivas} / ${datos.tandasFinalizadas}`} etiqueta="Activas / finalizadas" color={c.textoSecundario} />
            </View>

            <View style={[styles.tarjeta, tema.sombras.nivel1]}>
              <View style={styles.filaTitulo}>
                <Text style={styles.titulo}>Cumplimiento de pagos</Text>
                <Text style={styles.porcentaje}>{datos.cumplimiento}%</Text>
              </View>
              <BarraProgreso porcentaje={datos.cumplimiento} alto={10} />
              <Text style={styles.nota}>
                Cuotas pagadas frente a cuotas que ya debían estar pagadas.
              </Text>
            </View>

            <Text style={styles.seccion}>Avance por tanda</Text>
            {datos.tandas.length === 0 ? (
              <Text style={styles.vacio}>Aún no tienes tandas.</Text>
            ) : (
              datos.tandas.map((t) => (
                <View key={t.id} style={[styles.tarjeta, tema.sombras.nivel1]}>
                  <View style={styles.filaTitulo}>
                    <Text style={styles.titulo} numberOfLines={1}>{t.nombre}</Text>
                    <Text style={styles.porcentaje}>{t.porcentaje}%</Text>
                  </View>
                  <BarraProgreso porcentaje={t.porcentaje} />
                  <Text style={styles.nota}>
                    {t.rondasCerradas} de {t.totalRondas} rondas entregadas
                    {t.esperadoActual > 0 ? ` • Ronda actual: ${formatearLempiras(t.recolectadoActual)} / ${formatearLempiras(t.esperadoActual)}` : ''}
                  </Text>
                </View>
              ))
            )}

            <Text style={styles.seccion}>Pagos por método</Text>
            {datos.porMetodo.length === 0 ? (
              <Text style={styles.vacio}>Aún no hay pagos registrados.</Text>
            ) : (
              <View style={[styles.tarjeta, tema.sombras.nivel1]}>
                {datos.porMetodo.map((m) => (
                  <View key={m.metodo} style={styles.metodo}>
                    <View style={styles.filaTitulo}>
                      <Text style={styles.metodoNombre}>{m.metodo}</Text>
                      <Text style={styles.metodoDato}>
                        {m.cantidad} {m.cantidad === 1 ? 'pago' : 'pagos'} • {formatearLempiras(m.monto)}
                      </Text>
                    </View>
                    <BarraProgreso porcentaje={m.porcentaje} alto={8} />
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  raiz: { flex: 1, backgroundColor: tema.colores.fondo },
  contenido: { padding: tema.espacio.md, gap: tema.espacio.md, paddingBottom: tema.espacio.xl },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: {
    width: '47.8%', padding: tema.espacio.md, gap: 4, borderRadius: tema.radio.tarjeta,
    backgroundColor: tema.colores.superficie, borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  kpiValor: { fontSize: 22, fontWeight: '800', color: tema.colores.texto, marginTop: 4 },
  kpiEtiqueta: { ...tema.tipografia.etiqueta, color: tema.colores.textoSecundario },
  tarjeta: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderWidth: 1, borderColor: tema.colores.bordeSuave, gap: 10,
  },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  titulo: { ...tema.tipografia.etiquetaLg, fontSize: 15, fontWeight: '800', color: tema.colores.texto, flex: 1 },
  porcentaje: { ...tema.tipografia.encabezadoSm, fontWeight: '800', color: tema.colores.primario },
  nota: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  seccion: { ...tema.tipografia.encabezadoSm, fontWeight: '800', color: tema.colores.texto, marginTop: 4 },
  vacio: { ...tema.tipografia.cuerpo, color: tema.colores.textoSecundario },
  metodo: { gap: 6 },
  metodoNombre: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto },
  metodoDato: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
});
