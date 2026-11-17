/** Calendario de rondas de una tanda (ruta "/calendario?tandaId=..."). */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarraInferior } from '../components/BarraInferior';
import { Boton } from '../components/Boton';
import { EncabezadoPantalla } from '../components/EncabezadoPantalla';
import { FiltroChips } from '../components/FiltroChips';
import { Icono } from '../components/Icono';
import { TarjetaRonda } from '../components/TarjetaRonda';
import { useSesion } from '../context/SesionContext';
import { obtenerCalendario, type CalendarioVista } from '../controllers/rondaController';
import { generarReporteTanda } from '../controllers/reporteController';
import { obtenerResumenDashboard, type TandaVista } from '../controllers/tandaController';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { compartirReporte } from '../utils/reportes';
import { etiquetaFrecuencia, fechaDMA, formatearLempiras } from '../utils/formato';

type Filtro = 'todas' | 'completadas' | 'curso' | 'pendientes';

export default function CalendarioScreen() {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { usuario } = useSesion();
  const { tandaId } = useLocalSearchParams<{ tandaId?: string }>();

  const [tandas, setTandas] = useState<TandaVista[] | null>(null);
  // El parámetro es la única fuente de selección, tanto para enlaces como para los chips.
  const seleccion = tandaId ? Number(tandaId) : null;
  const cargaActual = useRef(0);
  const [calendario, setCalendario] = useState<CalendarioVista | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const solicitud = ++cargaActual.current;
    try {
      const lista = (await obtenerResumenDashboard(usuario)).tandas;
      const id = seleccion && lista.some((t) => t.id === seleccion) ? seleccion : lista[0]?.id ?? null;
      const calendarioNuevo = id ? await obtenerCalendario(id, usuario) : null;
      if (solicitud !== cargaActual.current) return;
      setTandas(lista);
      setCalendario(calendarioNuevo);
    } catch {
      if (solicitud === cargaActual.current) {
        Alert.alert('No se pudo cargar', 'No se pudo cargar el calendario. Desliza hacia abajo para reintentar.');
      }
    }
  }, [usuario, seleccion]);

  useFocusEffect(
    useCallback(() => {
      cargar();
      return () => { cargaActual.current++; };
    }, [cargar])
  );

  const refrescar = async () => {
    setRefrescando(true);
    try {
      await cargar();
    } finally {
      setRefrescando(false);
    }
  };

  if (!usuario) return null;
  const c = tema.colores;
  const lista = tandas ?? [];

  const rondasFiltradas = (calendario?.rondas ?? []).filter((r) => {
    if (filtro === 'completadas') return r.estado === 'cerrada';
    if (filtro === 'curso') return r.estado === 'en_curso';
    if (filtro === 'pendientes') return r.estado === 'pendiente';
    return true;
  });

  const compartir = () => {
    if (!calendario) return Promise.resolve();
    return compartirReporte(() => generarReporteTanda(usuario, calendario.tanda.id), calendario.tanda.nombre);
  };

  const abrirRonda = (rondaId: number) =>
    router.push({ pathname: '/ronda', params: { rondaId: String(rondaId) } } as never);

  return (
    <SafeAreaView style={styles.raiz} edges={['top']}>
      <EncabezadoPantalla
        titulo="Calendario de Rondas"
        subtitulo={calendario ? `${calendario.tanda.nombre} • Honduras` : 'Honduras'}
        onAtras={tandaId ? () => (router.canGoBack() ? router.back() : router.replace('/dashboard')) : undefined}
        derecha={
          <Pressable
            onPress={compartir}
            hitSlop={10}
            accessibilityLabel="Compartir"
          >
            <Icono name="share-social-outline" size={24} color={c.primario} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.primario} />}
      >
        {tandas !== null && lista.length === 0 && (
          <View style={[styles.vacio, tema.sombras.nivel1]}>
            <View style={styles.vacioIcono}>
              <Icono name="calendar-outline" size={32} color={c.primario} />
            </View>
            <Text style={styles.vacioTitulo}>Aún no hay calendario</Text>
            <Text style={styles.vacioTexto}>Crea una tanda y el calendario de rondas se genera automáticamente.</Text>
            <Boton
              titulo="Nueva Tanda"
              iconoIzquierda="add"
              onPress={() => router.push('/nueva-tanda' as never)}
              estilo={styles.vacioBoton}
            />
          </View>
        )}

        {lista.length > 1 && (
          <FiltroChips
            opciones={lista.map((t) => ({ clave: String(t.id), texto: t.nombre }))}
            activa={String(calendario?.tanda.id ?? '')}
            onCambio={(clave) => {
              setFiltro('todas');
              router.setParams({ tandaId: clave });
            }}
          />
        )}

        {calendario && (
          <>
            {/* Resumen */}
            <View style={[styles.resumen, tema.sombras.nivel1]}>
              <View style={styles.resumenSuperior}>
                <View style={styles.flex}>
                  <View style={styles.etiquetaRondas}>
                    <Icono name="people" size={14} color={c.primario} />
                    <Text style={styles.etiquetaRondasTexto}>
                      {calendario.rondas.length} RONDAS {etiquetaFrecuencia(calendario.tanda.frecuencia).toUpperCase()}S
                    </Text>
                  </View>
                  <View style={styles.filaMonto}>
                    <Text style={styles.monto}>{formatearLempiras(calendario.montoPorCobro)}</Text>
                    <Text style={styles.montoNota}>por cobro</Text>
                  </View>
                </View>
                <View style={styles.iconoResumen}>
                  <Icono name="wallet" size={26} color={c.primario} />
                </View>
              </View>

              <View style={styles.separador} />

              <View style={styles.fechas}>
                <View style={styles.fechaItem}>
                  <View style={styles.fechaIcono}>
                    <Icono name="enter-outline" size={18} color={c.textoSecundario} />
                  </View>
                  <View>
                    <Text style={styles.fechaEtiqueta}>Fecha de inicio</Text>
                    <Text style={styles.fechaValor}>{fechaDMA(calendario.fechaInicio)}</Text>
                  </View>
                </View>
                <View style={styles.fechaItem}>
                  <View style={styles.fechaIcono}>
                    <Icono name="flag-outline" size={18} color={c.textoSecundario} />
                  </View>
                  <View>
                    <Text style={styles.fechaEtiqueta}>Fecha estimada fin</Text>
                    <Text style={styles.fechaValor}>{fechaDMA(calendario.fechaFin)}</Text>
                  </View>
                </View>
              </View>

              <Boton
                titulo="Ver participantes"
                iconoIzquierda="people-outline"
                variante="secundario"
                onPress={() =>
                  router.push({ pathname: '/participantes', params: { tandaId: String(calendario.tanda.id) } } as never)
                }
                estilo={styles.botonParticipantes}
              />
            </View>

            <FiltroChips
              opciones={[
                { clave: 'todas', texto: `Todas (${calendario.rondas.length})` },
                { clave: 'completadas', texto: `Completadas (${calendario.completadas})` },
                { clave: 'curso', texto: `En curso (${calendario.enCurso})` },
                { clave: 'pendientes', texto: `Pendientes (${calendario.rondas.length - calendario.completadas - calendario.enCurso})` },
              ]}
              activa={filtro}
              onCambio={setFiltro}
            />

            <View style={styles.lista}>
              {rondasFiltradas.length === 0 ? (
                <Text style={styles.sinRondas}>No hay rondas en esta categoría.</Text>
              ) : (
                rondasFiltradas.map((r) => (
                  <TarjetaRonda
                    key={r.id}
                    ronda={r}
                    total={calendario.tanda.participantesTotal}
                    onPress={() => abrirRonda(r.id)}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <BarraInferior activa="calendario" />
    </SafeAreaView>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  raiz: { flex: 1, backgroundColor: tema.colores.fondo },
  contenido: { padding: tema.espacio.md, gap: tema.espacio.md, paddingBottom: tema.espacio.xl },
  resumen: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderWidth: 1, borderColor: tema.colores.bordeSuave, gap: 14,
  },
  resumenSuperior: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  etiquetaRondas: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: tema.radio.pildora, backgroundColor: tema.colores.pagadoFondo,
  },
  etiquetaRondasTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.primario },
  filaMonto: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  monto: { fontSize: 34, fontWeight: '800', color: tema.colores.primario },
  montoNota: { ...tema.tipografia.cuerpo, color: tema.colores.textoSecundario },
  iconoResumen: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: tema.colores.secundarioContenedor,
    justifyContent: 'center', alignItems: 'center',
  },
  separador: { height: 1, backgroundColor: tema.colores.superficieMedia },
  fechas: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  fechaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fechaIcono: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: tema.colores.superficieMedia,
    justifyContent: 'center', alignItems: 'center',
  },
  fechaEtiqueta: { ...tema.tipografia.etiquetaSm, color: tema.colores.textoSecundario },
  fechaValor: { ...tema.tipografia.etiquetaLg, fontWeight: '800', color: tema.colores.texto },
  botonParticipantes: { minHeight: 46 },
  lista: { gap: tema.espacio.md },
  sinRondas: { ...tema.tipografia.cuerpo, color: tema.colores.textoSecundario, textAlign: 'center', paddingVertical: 24 },
  vacio: {
    alignItems: 'center', padding: tema.espacio.lg, borderRadius: tema.radio.tarjeta,
    backgroundColor: tema.colores.superficie, borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  vacioIcono: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: tema.colores.brilloVerde,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  vacioTitulo: { ...tema.tipografia.encabezadoSm, color: tema.colores.texto },
  vacioTexto: { ...tema.tipografia.cuerpo, color: tema.colores.textoSecundario, textAlign: 'center', marginTop: 4 },
  vacioBoton: { marginTop: tema.espacio.md, alignSelf: 'stretch' },
});
