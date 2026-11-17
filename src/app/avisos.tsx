/** Avisos: ajustes de recordatorios + bandeja de alertas y actividad reciente (ruta "/avisos"). */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarraInferior } from '../components/BarraInferior';
import { Boton } from '../components/Boton';
import { EncabezadoPantalla } from '../components/EncabezadoPantalla';
import { Icono } from '../components/Icono';
import { TarjetaAviso } from '../components/TarjetaAviso';
import { useSesion } from '../context/SesionContext';
import { obtenerAvisos, type Aviso, type BandejaAvisos } from '../controllers/avisoController';
import {
  contarProgramadas, enviarPrueba, estanActivadas, guardarActivadas, notificacionesDisponibles,
  pedirPermiso, permisoConcedido, reprogramar,
} from '../controllers/notificacionController';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';

export default function AvisosScreen() {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { usuario } = useSesion();
  const [bandeja, setBandeja] = useState<BandejaAvisos | null>(null);
  const [activadas, setActivadas] = useState(false);
  const [programadas, setProgramadas] = useState(0);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const [b, act, permiso] = await Promise.all([obtenerAvisos(usuario), estanActivadas(), permisoConcedido()]);
    setBandeja(b);
    setActivadas(act && permiso);
    setProgramadas(await contarProgramadas());
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

  const alternar = async (valor: boolean) => {
    if (valor) {
      const concedido = await pedirPermiso();
      if (!concedido) {
        Alert.alert(
          'Permiso necesario',
          'Para recibir recordatorios activa las notificaciones de Mis Tandas en los ajustes del teléfono.',
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    await guardarActivadas(valor);
    await reprogramar(usuario);
    await cargar();
  };

  const probar = async () => {
    const ok = await enviarPrueba();
    if (ok) Alert.alert('Prueba enviada', 'En unos segundos debe aparecer una notificación.');
    else Alert.alert('Sin permiso', 'Activa las notificaciones para poder enviar la prueba.');
  };

  const abrir = (a: Aviso) => a.ruta && router.push(a.ruta as never);

  return (
    <SafeAreaView style={styles.raiz} edges={['top']}>
      <EncabezadoPantalla titulo="Avisos" subtitulo="Recordatorios y actividad" />

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.primario} />}
      >
        {/* Ajustes de recordatorios */}
        {!notificacionesDisponibles() ? (
          <View style={[styles.ajustes, tema.sombras.nivel1]}>
            <View style={styles.ajustesFila}>
              <View style={styles.ajustesIcono}>
                <Icono name="construct-outline" size={22} color={c.primario} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.ajustesTitulo}>Recordatorios por notificación</Text>
                <Text style={styles.ajustesTexto}>Disponibles en la versión instalable (APK)</Text>
              </View>
            </View>
            <Text style={styles.ajustesNota}>
              Mientras tanto, aquí ves tus alertas importantes y la actividad reciente de tus tandas.
            </Text>
          </View>
        ) : (
        <View style={[styles.ajustes, tema.sombras.nivel1]}>
          <View style={styles.ajustesFila}>
            <View style={styles.ajustesIcono}>
              <Icono name="notifications" size={22} color={c.primario} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.ajustesTitulo}>Recordatorios de rondas</Text>
              <Text style={styles.ajustesTexto}>
                {activadas
                  ? `${programadas} ${programadas === 1 ? 'recordatorio programado' : 'recordatorios programados'}`
                  : 'Desactivados'}
              </Text>
            </View>
            <Switch
              value={activadas}
              onValueChange={alternar}
              trackColor={{ true: c.primarioContenedor, false: c.superficieAlta }}
              thumbColor="#ffffff"
            />
          </View>
          <Text style={styles.ajustesNota}>
            Te avisamos el día antes y el día de cada ronda, y cuando te toque cobrar. Funciona sin internet.
          </Text>
          <Boton
            titulo="Enviar notificación de prueba"
            iconoIzquierda="paper-plane-outline"
            variante="secundario"
            onPress={probar}
            estilo={styles.botonPrueba}
          />
        </View>
        )}

        {/* Importantes */}
        <Text style={styles.seccion}>Importante</Text>
        {bandeja && bandeja.importantes.length === 0 ? (
          <View style={styles.sinAvisos}>
            <Icono name="checkmark-done-circle-outline" size={28} color={c.primario} />
            <Text style={styles.sinAvisosTexto}>Todo en orden. No hay pendientes urgentes.</Text>
          </View>
        ) : (
          bandeja?.importantes.map((a) => <TarjetaAviso key={a.id} aviso={a} onPress={a.ruta ? () => abrir(a) : undefined} />)
        )}

        {/* Actividad */}
        <Text style={styles.seccion}>Actividad reciente</Text>
        {bandeja && bandeja.actividad.length === 0 ? (
          <Text style={styles.vacio}>Aún no hay pagos registrados.</Text>
        ) : (
          bandeja?.actividad.map((a) => <TarjetaAviso key={a.id} aviso={a} onPress={a.ruta ? () => abrir(a) : undefined} />)
        )}
      </ScrollView>

      <BarraInferior activa="avisos" />
    </SafeAreaView>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  raiz: { flex: 1, backgroundColor: tema.colores.fondo },
  contenido: { padding: tema.espacio.md, gap: tema.espacio.md, paddingBottom: tema.espacio.xl },
  ajustes: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderWidth: 1, borderColor: tema.colores.bordeSuave, gap: 12,
  },
  ajustesFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ajustesIcono: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: tema.colores.secundarioContenedor,
    justifyContent: 'center', alignItems: 'center',
  },
  ajustesTitulo: { ...tema.tipografia.etiquetaLg, fontSize: 16, fontWeight: '800', color: tema.colores.texto },
  ajustesTexto: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  ajustesNota: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  botonPrueba: { minHeight: 46 },
  seccion: { ...tema.tipografia.encabezadoSm, fontWeight: '800', color: tema.colores.texto, marginTop: 4 },
  sinAvisos: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: tema.espacio.md, borderRadius: tema.radio.tarjeta,
    backgroundColor: tema.colores.fondoVerde, borderWidth: 1, borderColor: tema.colores.pagadoBorde,
  },
  sinAvisosTexto: { ...tema.tipografia.etiquetaLg, color: tema.colores.primario, flex: 1 },
  vacio: { ...tema.tipografia.cuerpo, color: tema.colores.textoSecundario },
});
