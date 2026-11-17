/** Registrar el pago de una cuota (ruta modal "/registrar-pago?rondaId=..&participanteId=.."). */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { PantallaTeclado, ScrollTeclado } from '../components/TecladoSeguro';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { CampoFecha } from '../components/CampoFecha';
import { Icono, NombreIcono } from '../components/Icono';
import { InsigniaEstado } from '../components/InsigniaEstado';
import { OpcionPago } from '../components/OpcionPago';
import { SelectorComprobante } from '../components/SelectorComprobante';
import { useSesion } from '../context/SesionContext';
import {
  calcularRecargo, diasDeAtraso, METODOS_PAGO, obtenerDetalleRonda, registrarPagoCuota,
  type DetalleRonda, type MetodoPago,
} from '../controllers/rondaController';
import { reprogramar } from '../controllers/notificacionController';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { hoyISO } from '../utils/fechas';
import { fechaCorta, formatearLempirasExacto, formatearTelefono, iniciales } from '../utils/formato';

const ICONOS: Record<MetodoPago, NombreIcono> = {
  Efectivo: 'cash-outline',
  'Banco Atlántida': 'business-outline',
  'BAC Credomatic': 'card-outline',
  'Billetera Tengo': 'phone-portrait-outline',
};

export default function RegistrarPagoScreen() {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { usuario } = useSesion();
  const { rondaId, participanteId } = useLocalSearchParams<{ rondaId?: string; participanteId?: string }>();

  const [carga, setCarga] = useState<{
    rondaId?: string;
    participanteId?: string;
    usuarioId: number;
    detalle: DetalleRonda | null;
    error?: string;
  } | null>(null);
  const [metodo, setMetodo] = useState<MetodoPago | null>(null);
  const [fecha, setFecha] = useState(hoyISO());
  const [cobrarRecargo, setCobrarRecargo] = useState(true);
  const [comprobante, setComprobante] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    const contexto = { rondaId, participanteId, usuarioId: usuario.id };
    (async () => {
      try {
        const detalle = rondaId && participanteId ? await obtenerDetalleRonda(Number(rondaId), usuario) : null;
        if (vigente) setCarga({ ...contexto, detalle });
      } catch {
        if (vigente) setCarga({ ...contexto, detalle: null, error: 'No se pudo cargar el pago. Vuelve a intentarlo.' });
      }
    })();
    return () => { vigente = false; };
  }, [usuario, rondaId, participanteId]);

  if (!usuario) return null;
  const cargado = carga?.usuarioId === usuario.id && carga.rondaId === rondaId && carga.participanteId === participanteId;
  const detalle = cargado ? carga.detalle : null;
  const participante = detalle?.pendientes.find((p) => p.participanteId === Number(participanteId));
  const c = tema.colores;
  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/dashboard' as never));

  const guardar = async () => {
    if (!metodo) return setError('Elige el método de pago');
    setGuardando(true);
    setError('');
    try {
      const r = await registrarPagoCuota(usuario, {
        rondaId: Number(rondaId),
        participanteId: Number(participanteId),
        metodo,
        fechaPago: fecha,
        cobrarRecargo,
        comprobante,
      });
      if (r.ok) {
        reprogramar(usuario);
        cerrar();
      }
      else setError(r.error);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el pago. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const cuota = detalle?.tanda.cuota ?? 0;
  // Ronda ya cerrada: el pago es TARDÍO y se suma al cobro del beneficiario
  const tardio = detalle?.ronda.estado === 'cerrada';
  // Recargo por pagar después de la fecha de la ronda (según lo configurado en la tanda)
  const recargo = detalle ? calcularRecargo(detalle.tanda, detalle.ronda.fecha, fecha) : 0;
  const diasTarde = detalle ? diasDeAtraso(detalle.ronda.fecha, fecha) : 0;
  const total = cuota + (cobrarRecargo ? recargo : 0);

  return (
    <SafeAreaView style={styles.raiz} edges={['top', 'bottom']}>
      {/* Encabezado */}
      <View style={styles.encabezado}>
        <View style={styles.encabezadoIcono}>
          <Icono name="cash-outline" size={24} color={c.primario} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.titulo}>{tardio ? 'Registrar Pago Tardío' : 'Registrar Pago de Cuota'}</Text>
          <Text style={styles.subtitulo}>Cuchubal comunitario en Lempiras</Text>
        </View>
        <Pressable onPress={cerrar} hitSlop={10} accessibilityLabel="Cerrar">
          <Icono name="close" size={26} color={c.textoSecundario} />
        </Pressable>
      </View>

      {!detalle || !participante || !detalle.tanda.esOrganizador ? (
        <View style={styles.centrado}>
          <Text style={styles.sinDatos}>
            {!cargado
              ? 'Cargando...'
              : !detalle
              ? carga?.error ?? 'No se encontró la ronda o no tienes acceso.'
              : !detalle.tanda.esOrganizador
              ? 'Solo quien organiza la tanda puede registrar pagos.'
              : 'Esta cuota ya fue pagada o no está disponible.'}
          </Text>
          {cargado && <Boton titulo="Volver" onPress={cerrar} estilo={{ marginTop: 16, alignSelf: 'stretch' }} />}
        </View>
      ) : (
        <PantallaTeclado>
          <ScrollTeclado contentContainerStyle={styles.contenido}>
            {/* Tarjeta del participante */}
            <View style={styles.tarjeta}>
              <View style={styles.tarjetaFila}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTexto}>{iniciales(participante.nombre)}</Text>
                </View>
                <View style={styles.flex}>
                  <View style={styles.nombreFila}>
                    <Text style={styles.nombre} numberOfLines={2}>{participante.nombre}</Text>
                    <View style={styles.chipTurno}>
                      <Text style={styles.chipTurnoTexto}>Turno #{participante.turno}</Text>
                    </View>
                  </View>
                  <View style={styles.telefonoFila}>
                    <Icono name="call-outline" size={14} color={c.textoSecundario} />
                    <Text style={styles.telefono}>+504 {formatearTelefono(participante.telefono)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.separador} />
              <View style={styles.montoFila}>
                <Text style={styles.montoEtiqueta}>MONTO A COBRAR</Text>
                <Text style={styles.monto}>{formatearLempirasExacto(cuota)}</Text>
              </View>
              <View style={styles.separador} />

              <View style={styles.tandaFila}>
                <Icono name="people-outline" size={18} color={c.primario} />
                <Text style={styles.tandaTexto} numberOfLines={1}>
                  {detalle.tanda.nombre}  •  Ronda #{detalle.ronda.numero} de {detalle.totalRondas}
                </Text>
              </View>
              <InsigniaEstado
                estado={participante.estado === 'atrasado' ? 'atrasado' : 'pendiente'}
                texto={participante.estado === 'atrasado' ? 'Cuota atrasada' : 'Cuota pendiente'}
              />
            </View>

            {/* Aviso: pago tardío en una ronda ya cerrada */}
            {tardio && (
              <View style={styles.avisoTardio}>
                <Icono name="information-circle-outline" size={22} color={c.primario} />
                <Text style={styles.avisoTardioTexto}>
                  La ronda #{detalle.ronda.numero} ya se cerró y se entregó a {detalle.ronda.beneficiarioNombre}. Este pago se
                  suma a su cobro: {formatearLempirasExacto(detalle.ronda.recolectado)} →{' '}
                  {formatearLempirasExacto(detalle.ronda.recolectado + cuota)}.
                </Text>
              </View>
            )}

            {/* Método de pago */}
            <View style={styles.seccionFila}>
              <Text style={styles.seccion}>Método de Pago</Text>
              <Text style={styles.requerido}>Requerido</Text>
            </View>
            <View style={styles.metodos}>
              {METODOS_PAGO.map((m) => (
                <OpcionPago
                  key={m}
                  texto={m}
                  icono={ICONOS[m]}
                  activa={metodo === m}
                  onPress={() => {
                    setMetodo(m);
                    setError('');
                  }}
                />
              ))}
            </View>

            {/* Fecha */}
            <CampoFecha
              etiqueta="Fecha de recepción"
              valor={fecha}
              onCambio={setFecha}
              maximo={hoyISO()}
            />

            {/* Recargo por atraso */}
            {recargo > 0 && (
              <View style={styles.recargo}>
                <View style={styles.recargoFila}>
                  <Icono name="alarm-outline" size={22} color={c.terciario} />
                  <View style={styles.flex}>
                    <Text style={styles.recargoTitulo}>Recargo por atraso: {formatearLempirasExacto(recargo)}</Text>
                    <Text style={styles.recargoTexto}>
                      Pagó {diasTarde} {diasTarde === 1 ? 'día' : 'días'} después de la fecha de la ronda ({fechaCorta(detalle.ronda.fecha)}).
                    </Text>
                  </View>
                </View>
                <View style={styles.recargoFila}>
                  <Text style={[styles.recargoTexto, styles.flex]}>
                    {cobrarRecargo ? 'Se cobrará el recargo' : 'Se perdonará el recargo'}
                  </Text>
                  <Switch
                    value={cobrarRecargo}
                    onValueChange={setCobrarRecargo}
                    trackColor={{ true: c.primarioContenedor, false: c.superficieAlta }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>
            )}

            {/* Comprobante */}
            <SelectorComprobante valor={comprobante} onCambio={setComprobante} />

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollTeclado>

          <View style={styles.pie}>
            <Boton
              titulo={`${tardio ? 'Guardar Pago Tardío' : 'Guardar Pago'} (${formatearLempirasExacto(total)})`}
              iconoIzquierda="checkmark-circle-outline"
              onPress={guardar}
              cargando={guardando}
            />
            <Pressable onPress={cerrar} style={styles.cancelar} hitSlop={8}>
              <Text style={styles.cancelarTexto}>Cancelar y volver</Text>
            </Pressable>
          </View>
        </PantallaTeclado>
      )}
    </SafeAreaView>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  raiz: { flex: 1, backgroundColor: tema.colores.superficie },
  encabezado: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: tema.espacio.md,
    borderBottomWidth: 1, borderBottomColor: tema.colores.superficieMedia,
  },
  encabezadoIcono: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: tema.colores.secundarioContenedor,
    justifyContent: 'center', alignItems: 'center',
  },
  titulo: { ...tema.tipografia.encabezadoSm, fontWeight: '800', color: tema.colores.texto },
  subtitulo: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  centrado: { flex: 1, justifyContent: 'center', padding: tema.espacio.lg },
  sinDatos: { ...tema.tipografia.cuerpoLg, color: tema.colores.textoSecundario, textAlign: 'center' },
  contenido: { padding: tema.espacio.md, gap: tema.espacio.md, backgroundColor: tema.colores.fondo },
  tarjeta: {
    backgroundColor: tema.colores.superficieBaja, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderLeftWidth: 5, borderLeftColor: tema.colores.primario, borderWidth: 1, borderColor: tema.colores.bordeSuave, gap: 12,
  },
  tarjetaFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: tema.colores.secundarioContenedor,
    borderWidth: 2, borderColor: tema.colores.primario, justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { fontSize: 20, fontWeight: '800', color: tema.colores.primario },
  nombreFila: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  nombre: { ...tema.tipografia.encabezadoMd, fontWeight: '800', color: tema.colores.texto, flexShrink: 1 },
  chipTurno: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: tema.radio.pildora,
    backgroundColor: tema.colores.pagadoFondo, borderWidth: 1, borderColor: tema.colores.pagadoBorde,
  },
  chipTurnoTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.primario },
  telefonoFila: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  telefono: { ...tema.tipografia.cuerpo, color: tema.colores.textoSecundario },
  separador: { height: 1, backgroundColor: tema.colores.bordeSuave },
  montoFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  montoEtiqueta: { ...tema.tipografia.etiqueta, letterSpacing: 0.8, color: tema.colores.textoSecundario },
  monto: { fontSize: 34, fontWeight: '800', color: tema.colores.primario },
  tandaFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tandaTexto: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto, flexShrink: 1 },
  seccionFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  seccion: { ...tema.tipografia.encabezadoSm, fontWeight: '800', color: tema.colores.texto },
  requerido: { ...tema.tipografia.cuerpoSm, color: tema.colores.placeholder },
  metodos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  error: { ...tema.tipografia.etiquetaLg, color: tema.colores.error, textAlign: 'center' },
  avisoTardio: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: tema.espacio.md, borderRadius: tema.radio.tarjeta,
    backgroundColor: tema.colores.fondoVerde, borderWidth: 1, borderColor: tema.colores.pagadoBorde,
  },
  avisoTardioTexto: { ...tema.tipografia.cuerpoSm, color: tema.colores.texto, flex: 1 },
  recargo: {
    padding: tema.espacio.md, borderRadius: tema.radio.tarjeta, gap: 12, backgroundColor: tema.colores.fondoNaranja,
    borderWidth: 1, borderColor: tema.colores.pendienteBorde,
  },
  recargoFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recargoTitulo: { ...tema.tipografia.etiquetaLg, fontWeight: '800', color: tema.colores.terciario },
  recargoTexto: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  pie: {
    padding: tema.espacio.md, gap: 8, backgroundColor: tema.colores.superficie,
    borderTopWidth: 1, borderTopColor: tema.colores.superficieMedia,
  },
  cancelar: { alignItems: 'center', paddingVertical: 8 },
  cancelarTexto: { ...tema.tipografia.etiquetaLg, color: tema.colores.textoSecundario },
});
