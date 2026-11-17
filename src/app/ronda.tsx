/** Detalle de una ronda (ruta "/ronda?rondaId=..."): bolsa, quién pagó, quién debe, cierre. */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarraProgreso } from '../components/BarraProgreso';
import { Boton } from '../components/Boton';
import { EncabezadoPantalla } from '../components/EncabezadoPantalla';
import { FilaPagoRonda } from '../components/FilaPagoRonda';
import { Icono } from '../components/Icono';
import { Segmentos } from '../components/Segmentos';
import { VisorComprobante } from '../components/VisorComprobante';
import { useSesion } from '../context/SesionContext';
import {
  cerrarRonda, obtenerComprobanteDePago, obtenerDetalleRonda, type DetalleRonda, type PagoVista,
} from '../controllers/rondaController';
import { reprogramar } from '../controllers/notificacionController';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { fechaCompleta, formatearLempiras, formatearTelefono, iniciales } from '../utils/formato';
import { mensajeCuotaRonda, ofrecerRecordatorio } from '../utils/recordatorios';

type Pestana = 'pendientes' | 'pagaron';

export default function RondaScreen() {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { usuario } = useSesion();
  const { rondaId } = useLocalSearchParams<{ rondaId?: string }>();

  const [detalle, setDetalle] = useState<DetalleRonda | null>(null);
  const [cargado, setCargado] = useState(false);
  const [pestana, setPestana] = useState<Pestana | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [comprobante, setComprobante] = useState<{ base64: string; titulo: string } | null>(null);

  const cargar = useCallback(async () => {
    if (!usuario || !rondaId) return;
    try {
      setDetalle(await obtenerDetalleRonda(Number(rondaId), usuario));
      setErrorCarga(false);
    } catch {
      // Antes la pantalla quedaba en blanco para siempre si la consulta fallaba
      setErrorCarga(true);
    } finally {
      setCargado(true);
    }
  }, [usuario, rondaId]);

  // Recarga al volver del modal de "Registrar pago"
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

  if (cargado && !detalle) {
    return (
      <SafeAreaView style={styles.raiz} edges={['top', 'bottom']}>
        <EncabezadoPantalla titulo="Ronda" onAtras={volver} />
        <View style={styles.centrado}>
          <Text style={styles.vacioTitulo}>
            {errorCarga ? 'No se pudo cargar la ronda. Intenta de nuevo.' : 'No se encontró la ronda'}
          </Text>
          {errorCarga && (
            <Boton titulo="Reintentar" onPress={cargar} estilo={{ marginTop: 16, alignSelf: 'stretch' }} />
          )}
          <Boton
            titulo="Volver"
            variante={errorCarga ? 'secundario' : 'primario'}
            onPress={volver}
            estilo={{ marginTop: 12, alignSelf: 'stretch' }}
          />
        </View>
      </SafeAreaView>
    );
  }
  if (!detalle) return <SafeAreaView style={styles.raiz} />;

  const { tanda, ronda } = detalle;
  const enCurso = ronda.estado === 'en_curso';
  const esOrganizador = tanda.esOrganizador;
  const cerrada = ronda.estado === 'cerrada';
  // Solo el organizador registra pagos y cierra rondas. En una ronda ya cerrada sigue pudiendo
  // registrar PAGOS TARDÍOS (se suman al cobro del beneficiario), pero no volver a cerrarla.
  const puedeRegistrar = esOrganizador && (enCurso || cerrada);
  const puedeCerrar = esOrganizador && enCurso;
  const pestanaActiva: Pestana = pestana ?? (detalle.pendientes.length > 0 ? 'pendientes' : 'pagaron');
  const lista = pestanaActiva === 'pendientes' ? detalle.pendientes : detalle.pagaron;

  const verComprobante = async (p: PagoVista) => {
    if (!p.pagoId) return;
    const foto = await obtenerComprobanteDePago(p.pagoId, usuario);
    if (foto) setComprobante({ base64: foto, titulo: `Comprobante de ${p.nombre}` });
    else Alert.alert('Sin comprobante', 'Este pago no tiene foto adjunta.');
  };

  const registrar = (p: PagoVista) =>
    router.push({
      pathname: '/registrar-pago',
      params: { rondaId: String(ronda.id), participanteId: String(p.participanteId) },
    } as never);

  const recordar = (p: PagoVista) =>
    ofrecerRecordatorio(
      p.nombre,
      p.telefono,
      mensajeCuotaRonda({
        nombre: p.nombre.split(' ')[0],
        tanda: tanda.nombre,
        ronda: ronda.numero,
        monto: tanda.cuota,
        fechaLimite: ronda.fecha,
      })
    );

  const ejecutarCierre = async (confirmado: boolean) => {
    setCerrando(true);
    try {
      const r = await cerrarRonda(usuario, ronda.id, confirmado);
      if (r.ok) {
        reprogramar(usuario);
        await cargar();
        Alert.alert(
          r.tandaFinalizada ? '¡Tanda finalizada!' : 'Ronda cerrada',
          r.tandaFinalizada
            ? 'Todas las rondas fueron entregadas. ¡Felicidades al grupo!'
            : `Se entregaron ${formatearLempiras(detalle.recolectado)} a ${ronda.beneficiarioNombre}.`,
          [{ text: 'Aceptar', onPress: volver }]
        );
      } else if (r.motivo === 'confirmar') {
        // Regla: no se cierra con cuotas pendientes sin confirmación explícita
        Alert.alert(
          'Hay cuotas pendientes',
          `Faltan ${r.pendientes} ${r.pendientes === 1 ? 'cuota' : 'cuotas'} (${formatearLempiras(r.monto)}). ` +
            `¿Cerrar la ronda de todas formas? Esta acción no se puede deshacer.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Cerrar con pendientes', style: 'destructive', onPress: () => ejecutarCierre(true) },
          ]
        );
      } else {
        Alert.alert('No se pudo cerrar', r.mensaje);
      }
    } catch {
      Alert.alert('No se pudo cerrar', 'No se pudo guardar el cierre de la ronda. Intenta de nuevo.');
    } finally {
      setCerrando(false);
    }
  };

  const pedirCierre = () =>
    Alert.alert(
      `Cerrar ronda #${ronda.numero}`,
      `Se entregarán ${formatearLempiras(detalle.recolectado)} a ${ronda.beneficiarioNombre}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: () => ejecutarCierre(false) },
      ]
    );

  const chipEstado = cerrada ? 'Cerrada' : enCurso ? 'En curso' : 'Pendiente';
  const atrasada = enCurso && ronda.dias < 0;

  return (
    <SafeAreaView style={styles.raiz} edges={['top', 'bottom']}>
      <EncabezadoPantalla
        titulo={`Ronda #${ronda.numero} de ${detalle.totalRondas}`}
        subtitulo={tanda.nombre}
        chip={chipEstado}
        onAtras={volver}
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.primario} />}
      >
        {/* Fecha límite */}
        <View style={[styles.limite, tema.sombras.nivel1, cerrada && { borderLeftColor: c.primario }]}>
          <View style={styles.limiteSuperior}>
            <Text style={styles.limiteEtiqueta}>{cerrada ? 'RONDA CERRADA' : 'FECHA LÍMITE DE PAGO'}</Text>
            {!cerrada && ronda.textoPlazo ? (
              <View style={[styles.limiteChip, atrasada && { backgroundColor: c.errorContenedor }]}>
                <Text style={[styles.limiteChipTexto, atrasada && { color: c.error }]}>{ronda.textoPlazo}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.limiteFecha}>{fechaCompleta(ronda.fecha)}</Text>
          {!esOrganizador && (
            <View style={styles.rolAviso}>
              <Icono name="eye-outline" size={16} color={c.textoSecundario} />
              <Text style={styles.rolAvisoTexto}>
                Eres participante: ves el avance, pero solo quien organiza la tanda registra pagos y cierra rondas.
              </Text>
            </View>
          )}
          <Text style={styles.limiteNota}>
            {cerrada
              ? detalle.pendientes.length > 0
                ? esOrganizador
                  ? `Ya se entregó a ${ronda.beneficiarioNombre}, pero ${detalle.pendientes.length === 1 ? 'falta 1 cuota' : `faltan ${detalle.pendientes.length} cuotas`} por pagar. Si se pagan ahora, se suman a su cobro.`
                  : `Ya se entregó a ${ronda.beneficiarioNombre}. Hay cuotas pendientes que el organizador puede registrar como pago tardío.`
                : 'La suma pactada ya fue entregada al beneficiario.'
              : enCurso
              ? 'La recaudación cierra en esta fecha para la entrega de la suma pactada en Lempiras.'
              : 'Esta ronda aún no está en curso. Primero deben cerrarse las anteriores.'}
          </Text>
        </View>

        {/* Beneficiario */}
        <View style={[styles.beneficiario, tema.sombras.nivel1]}>
          <View style={styles.chipBeneficiario}>
            <Icono name="star" size={13} color={c.sobreSecundarioContenedor} />
            <Text style={styles.chipBeneficiarioTexto}>Beneficiario de esta ronda</Text>
          </View>
          <View style={styles.beneficiarioFila}>
            <View>
              <View style={styles.avatarGrande}>
                <Text style={styles.avatarGrandeTexto}>{iniciales(ronda.beneficiarioNombre)}</Text>
              </View>
              <View style={styles.turnoInsignia}>
                <Text style={styles.turnoInsigniaTexto}>#{ronda.beneficiarioTurno}</Text>
              </View>
            </View>
            <View style={styles.flex}>
              <Text style={styles.beneficiarioNombre} numberOfLines={2}>
                {ronda.beneficiarioNombre}{ronda.esMia ? ' (Tú)' : ''}
              </Text>
              <View style={styles.telefonoFila}>
                <Icono name="call-outline" size={14} color={c.textoSecundario} />
                <Text style={styles.telefono}>+504 {formatearTelefono(ronda.beneficiarioTelefono)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.separador} />
          <View style={styles.beneficiarioPie}>
            <View>
              <Text style={styles.montoEtiqueta}>Monto total a recibir</Text>
              <View style={styles.filaMonto}>
                <Text style={styles.montoGrande}>{formatearLempiras(detalle.esperado)}</Text>
                <Text style={styles.montoMoneda}>HNL</Text>
              </View>
            </View>
            <View style={styles.chipCuotas}>
              <Icono name="cash-outline" size={16} color="#ffffff" />
              <Text style={styles.chipCuotasTexto}>
                {tanda.participantesTotal} cuotas de {formatearLempiras(tanda.cuota)}
              </Text>
            </View>
          </View>
        </View>

        {/* Progreso de la bolsa */}
        <View style={[styles.bolsa, tema.sombras.nivel1]}>
          <View style={styles.bolsaSuperior}>
            <View>
              <Text style={styles.bolsaEtiqueta}>Progreso de la bolsa</Text>
              <View style={styles.filaMonto}>
                <Text style={styles.bolsaMonto}>{formatearLempiras(detalle.recolectado)}</Text>
                <Text style={styles.bolsaDe}>/ {formatearLempiras(detalle.esperado)}</Text>
              </View>
            </View>
            <View style={styles.porcentaje}>
              <Text style={styles.porcentajeNumero}>{detalle.porcentaje}%</Text>
              <Text style={styles.porcentajeNota}>Completado</Text>
            </View>
          </View>
          <BarraProgreso porcentaje={detalle.porcentaje} alto={10} />
          {detalle.recargosCobrados > 0 && (
            <View style={styles.recargosFila}>
              <Icono name="alarm-outline" size={16} color={c.terciario} />
              <Text style={styles.recargosTexto}>
                Recargos por atraso cobrados: {formatearLempiras(detalle.recargosCobrados)} (aparte de la bolsa)
              </Text>
            </View>
          )}
          <View style={styles.cajas}>
            <View style={[styles.caja, styles.cajaPagados]}>
              <Icono name="checkmark-circle" size={26} color={c.primario} />
              <Text style={styles.cajaNumero}>{detalle.pagaron.length}</Text>
              <Text style={styles.cajaTitulo}>Pagados</Text>
              <Text style={styles.cajaNota}>{formatearLempiras(detalle.recolectado)} cobrados</Text>
            </View>
            <View style={[styles.caja, styles.cajaPendientes]}>
              <Icono name="time" size={26} color={c.terciario} />
              <Text style={styles.cajaNumero}>{detalle.pendientes.length}</Text>
              <Text style={styles.cajaTitulo}>Pendientes</Text>
              <Text style={styles.cajaNota}>{formatearLempiras(detalle.montoPendiente)} por cobrar</Text>
            </View>
          </View>
        </View>

        {/* Pendientes / Pagaron */}
        <Segmentos
          opciones={[
            { clave: 'pendientes', texto: 'Pendientes', cantidad: detalle.pendientes.length },
            { clave: 'pagaron', texto: 'Pagaron', cantidad: detalle.pagaron.length },
          ]}
          activa={pestanaActiva}
          onCambio={setPestana}
        />

        <View style={styles.listaPagos}>
          {lista.length === 0 ? (
            <Text style={styles.sinFilas}>
              {pestanaActiva === 'pendientes' ? '¡Todos pagaron esta ronda!' : 'Aún no hay pagos registrados.'}
            </Text>
          ) : (
            lista.map((p) => (
              <FilaPagoRonda
                key={p.participanteId}
                pago={p}
                cuota={tanda.cuota}
                numeroRonda={ronda.numero}
                accionable={puedeRegistrar}
                tardio={cerrada}
                onRegistrar={() => registrar(p)}
                onRecordar={() => recordar(p)}
                onVerComprobante={() => verComprobante(p)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <VisorComprobante base64={comprobante?.base64 ?? null} titulo={comprobante?.titulo} onCerrar={() => setComprobante(null)} />

      {puedeCerrar && (
        <View style={styles.pie}>
          <Boton
            titulo={`Cerrar ronda #${ronda.numero}`}
            iconoIzquierda="lock-closed-outline"
            onPress={pedirCierre}
            cargando={cerrando}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  raiz: { flex: 1, backgroundColor: tema.colores.fondo },
  centrado: { flex: 1, justifyContent: 'center', padding: tema.espacio.lg },
  vacioTitulo: { ...tema.tipografia.encabezadoSm, color: tema.colores.texto, textAlign: 'center' },
  contenido: { padding: tema.espacio.md, gap: tema.espacio.md, paddingBottom: tema.espacio.xl },
  limite: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderLeftWidth: 5, borderLeftColor: tema.colores.terciario, borderWidth: 1, borderColor: tema.colores.bordeSuave, gap: 4,
  },
  limiteSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  limiteEtiqueta: { ...tema.tipografia.etiquetaSm, letterSpacing: 0.5, color: tema.colores.terciario },
  limiteChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: tema.radio.pildora, backgroundColor: tema.colores.fondoNaranjaFuerte },
  limiteChipTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.terciario },
  limiteFecha: { ...tema.tipografia.encabezadoMd, fontWeight: '800', color: tema.colores.texto },
  rolAviso: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginVertical: 6,
    borderRadius: tema.radio.input, backgroundColor: tema.colores.superficieBaja,
  },
  rolAvisoTexto: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, flex: 1 },
  recargosFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recargosTexto: { ...tema.tipografia.etiqueta, color: tema.colores.terciario, flex: 1 },
  limiteNota: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  beneficiario: {
    backgroundColor: tema.colores.fondoVerde2, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderWidth: 1, borderColor: tema.colores.pagadoBorde, gap: 12,
  },
  chipBeneficiario: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: tema.radio.pildora, backgroundColor: tema.colores.secundarioContenedor,
  },
  chipBeneficiarioTexto: { ...tema.tipografia.etiqueta, color: tema.colores.sobreSecundarioContenedor },
  beneficiarioFila: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarGrande: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: tema.colores.secundarioContenedor,
    borderWidth: 3, borderColor: tema.colores.primario, justifyContent: 'center', alignItems: 'center',
  },
  avatarGrandeTexto: { fontSize: 24, fontWeight: '800', color: tema.colores.primario },
  turnoInsignia: {
    position: 'absolute', right: -4, bottom: -2, minWidth: 28, height: 24, borderRadius: 12, paddingHorizontal: 6,
    backgroundColor: tema.colores.relleno, borderWidth: 2, borderColor: tema.colores.fondoVerde2,
    justifyContent: 'center', alignItems: 'center',
  },
  turnoInsigniaTexto: { ...tema.tipografia.etiquetaSm, color: '#ffffff' },
  beneficiarioNombre: { ...tema.tipografia.encabezadoMd, fontWeight: '800', color: tema.colores.texto },
  telefonoFila: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  telefono: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  separador: { height: 1, backgroundColor: tema.colores.pagadoBorde },
  beneficiarioPie: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 },
  montoEtiqueta: { ...tema.tipografia.etiqueta, color: tema.colores.textoSecundario },
  filaMonto: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  montoGrande: { fontSize: 30, fontWeight: '800', color: tema.colores.primario },
  montoMoneda: { ...tema.tipografia.etiquetaLg, color: tema.colores.textoSecundario },
  chipCuotas: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: tema.radio.input, backgroundColor: tema.colores.primarioContenedor,
  },
  chipCuotasTexto: { ...tema.tipografia.etiqueta, fontWeight: '800', color: '#ffffff' },
  bolsa: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderWidth: 1, borderColor: tema.colores.bordeSuave, gap: 14,
  },
  bolsaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bolsaEtiqueta: { ...tema.tipografia.etiqueta, color: tema.colores.textoSecundario },
  bolsaMonto: { fontSize: 30, fontWeight: '800', color: tema.colores.texto },
  bolsaDe: { ...tema.tipografia.cuerpoLg, color: tema.colores.textoSecundario },
  porcentaje: { alignItems: 'flex-end' },
  porcentajeNumero: { fontSize: 26, fontWeight: '800', color: tema.colores.primario },
  porcentajeNota: { ...tema.tipografia.etiquetaSm, color: tema.colores.textoSecundario },
  cajas: { flexDirection: 'row', gap: 12 },
  caja: { flex: 1, padding: 12, borderRadius: tema.radio.tarjeta, gap: 2, borderWidth: 1 },
  cajaPagados: { backgroundColor: tema.colores.fondoVerde, borderColor: tema.colores.pagadoBorde },
  cajaPendientes: { backgroundColor: tema.colores.fondoNaranja, borderColor: tema.colores.pendienteBorde },
  cajaNumero: { fontSize: 26, fontWeight: '800', color: tema.colores.texto, lineHeight: 30, marginTop: 4 },
  cajaTitulo: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto },
  cajaNota: { ...tema.tipografia.etiquetaSm, color: tema.colores.textoSecundario },
  listaPagos: { gap: tema.espacio.md },
  sinFilas: { ...tema.tipografia.cuerpo, color: tema.colores.textoSecundario, textAlign: 'center', paddingVertical: 24 },
  pie: {
    padding: tema.espacio.md, backgroundColor: tema.colores.superficie,
    borderTopWidth: 1, borderTopColor: tema.colores.superficieMedia,
  },
});
