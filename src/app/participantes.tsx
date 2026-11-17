/** Participantes de una tanda (ruta "/participantes?tandaId=..."): turnos y quién va al día. */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { EncabezadoPantalla } from '../components/EncabezadoPantalla';
import { Icono } from '../components/Icono';
import { InsigniaEstado } from '../components/InsigniaEstado';
import { useSesion } from '../context/SesionContext';
import {
  obtenerParticipantes, type ParticipanteVista, type ParticipantesVista,
} from '../controllers/participanteController';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { fechaCorta, formatearLempiras, formatearTelefono } from '../utils/formato';
import { mensajeCuotasAtrasadas, ofrecerRecordatorio } from '../utils/recordatorios';

export default function ParticipantesScreen() {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { usuario } = useSesion();
  const { tandaId } = useLocalSearchParams<{ tandaId?: string }>();
  const [datos, setDatos] = useState<ParticipantesVista | null>(null);
  const [cargado, setCargado] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario || !tandaId) return;
    try {
      setDatos(await obtenerParticipantes(Number(tandaId), usuario));
      setErrorCarga(false);
    } catch {
      // Antes la pantalla quedaba en blanco para siempre si la consulta fallaba
      setErrorCarga(true);
    } finally {
      setCargado(true);
    }
  }, [usuario, tandaId]);

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
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/mis-tandas' as never));

  const recordar = (p: ParticipanteVista) =>
    ofrecerRecordatorio(
      p.nombre,
      p.telefono,
      mensajeCuotasAtrasadas({
        nombre: p.nombre.split(' ')[0],
        tanda: datos?.tanda.nombre ?? '',
        cuotas: p.atrasadas,
        total: p.debe,
      })
    );

  return (
    <SafeAreaView style={styles.raiz} edges={['top', 'bottom']}>
      <EncabezadoPantalla titulo="Participantes" subtitulo={datos?.tanda.nombre} onAtras={volver} />

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.primario} />}
      >
        {cargado && !datos && (
          <Text style={styles.vacio}>
            {errorCarga ? 'No se pudo cargar la lista. Desliza hacia abajo para reintentar.' : 'No se encontró la tanda.'}
          </Text>
        )}

        {datos && (
          <>
            <View style={styles.resumen}>
              <View style={[styles.resumenCaja, { backgroundColor: tema.colores.fondoVerde, borderColor: c.pagadoBorde }]}>
                <Text style={styles.resumenNumero}>{datos.alDia}</Text>
                <Text style={styles.resumenTexto}>Al día</Text>
              </View>
              <View style={[styles.resumenCaja, { backgroundColor: tema.colores.fondoRojo, borderColor: c.atrasadoBorde }]}>
                <Text style={[styles.resumenNumero, datos.conDeuda > 0 && { color: c.atrasadoTexto }]}>
                  {datos.conDeuda}
                </Text>
                <Text style={styles.resumenTexto}>Con cuotas atrasadas</Text>
              </View>
            </View>

            {datos.items.map((p) => (
              <View key={p.id} style={[styles.tarjeta, tema.sombras.nivel1]}>
                <View style={styles.fila}>
                  <View style={[styles.turno, p.esAdmin && { backgroundColor: c.relleno }]}>
                    <Text style={[styles.turnoTexto, p.esAdmin && { color: '#ffffff' }]}>
                      {String(p.turno).padStart(2, '0')}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.nombreFila}>
                      <Text style={styles.nombre} numberOfLines={1}>{p.nombre}</Text>
                      {p.esAdmin && (
                        <View style={styles.chipAdmin}>
                          <Text style={styles.chipAdminTexto}>Tú (Admin)</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.detalleFila}>
                      <Icono name="call-outline" size={13} color={c.textoSecundario} />
                      <Text style={styles.detalle}>+504 {formatearTelefono(p.telefono)}</Text>
                    </View>
                    {p.rondaCobro !== null && p.fechaCobro && (
                      <View style={styles.detalleFila}>
                        <Icono
                          name={p.yaCobro ? 'checkmark-circle-outline' : 'calendar-outline'}
                          size={13}
                          color={p.yaCobro ? c.pagadoTexto : c.textoSecundario}
                        />
                        <Text style={[styles.detalle, p.yaCobro && { color: c.pagadoTexto }]}>
                          {p.yaCobro ? 'Ya cobró' : 'Cobra'} en la ronda #{p.rondaCobro} • {fechaCorta(p.fechaCobro)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <InsigniaEstado
                    estado={p.alDia ? 'pagado' : 'atrasado'}
                    texto={p.alDia ? 'Al día' : `Debe ${formatearLempiras(p.debe)}`}
                  />
                </View>

                {!p.alDia && (
                  <View style={styles.accion}>
                    <Text style={styles.accionTexto}>
                      {p.atrasadas} {p.atrasadas === 1 ? 'cuota atrasada' : 'cuotas atrasadas'}
                    </Text>
                    {datos.esOrganizador && (
                      <Boton
                        titulo="Recordar"
                        iconoIzquierda="chatbubble-ellipses-outline"
                        onPress={() => recordar(p)}
                        estilo={styles.botonRecordar}
                      />
                    )}
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  raiz: { flex: 1, backgroundColor: tema.colores.fondo },
  contenido: { padding: tema.espacio.md, gap: tema.espacio.md, paddingBottom: tema.espacio.xl },
  vacio: { ...tema.tipografia.cuerpoLg, color: tema.colores.textoSecundario, textAlign: 'center', paddingVertical: 32 },
  resumen: { flexDirection: 'row', gap: 12 },
  resumenCaja: { flex: 1, padding: 14, borderRadius: tema.radio.tarjeta, borderWidth: 1 },
  resumenNumero: { fontSize: 28, fontWeight: '800', color: tema.colores.primario },
  resumenTexto: { ...tema.tipografia.etiqueta, color: tema.colores.textoSecundario },
  tarjeta: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderWidth: 1, borderColor: tema.colores.bordeSuave, gap: 12,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  turno: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: tema.colores.superficieAlta,
    justifyContent: 'center', alignItems: 'center',
  },
  turnoTexto: { ...tema.tipografia.etiquetaLg, fontWeight: '800', color: tema.colores.textoSecundario },
  nombreFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nombre: { flexShrink: 1, ...tema.tipografia.encabezadoSm, fontSize: 16, color: tema.colores.texto },
  chipAdmin: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: tema.radio.pildora, backgroundColor: tema.colores.secundarioContenedor,
  },
  chipAdminTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.sobreSecundarioContenedor },
  detalleFila: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  detalle: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, flexShrink: 1 },
  accion: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: tema.colores.superficieMedia,
  },
  accionTexto: { ...tema.tipografia.etiquetaLg, color: tema.colores.atrasadoTexto, flex: 1 },
  botonRecordar: { minHeight: 44, paddingHorizontal: 16 },
});
