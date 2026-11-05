/** Pantalla principal del cliente (ruta "/dashboard"). */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarraInferior, type ClaveSeccion } from '../components/BarraInferior';
import { Boton } from '../components/Boton';
import { Icono } from '../components/Icono';
import { ResumenAhorro } from '../components/ResumenAhorro';
import { TarjetaTanda } from '../components/TarjetaTanda';
import { useSesion } from '../context/SesionContext';
import {
  obtenerResumenDashboard,
  sembrarDatosDemo,
  type ResumenDashboard,
} from '../controllers/tandaController';
import { tema } from '../tema';
import { iniciales, primerNombre } from '../utils/formato';

const proximamente = (nombre: string) =>
  Alert.alert(nombre, 'Esta pantalla estará disponible muy pronto.');

export default function DashboardScreen() {
  const router = useRouter();
  const { usuario, salir } = useSesion();
  const [datos, setDatos] = useState<ResumenDashboard | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setDatos(await obtenerResumenDashboard(usuario));
  }, [usuario]);

  // Recarga cada vez que la pantalla vuelve a estar visible
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

  const confirmarSalida = () =>
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => salir() },
    ]);

  const cargarEjemplos = async () => {
    if (!usuario) return;
    await sembrarDatosDemo(usuario);
    await cargar();
  };

  const alSeleccionar = (clave: ClaveSeccion) => {
    if (clave === 'inicio') return;
    if (clave === 'tandas') return router.push('/mis-tandas' as never);
    if (clave === 'perfil') return confirmarSalida();
    proximamente({ calendario: 'Calendario', avisos: 'Avisos' }[clave] || 'Sección');
  };

  if (!usuario) return null;
  const tandas = datos?.tandas ?? [];

  return (
    <SafeAreaView style={styles.raiz} edges={['top']}>
      {/* Encabezado */}
      <View style={styles.encabezado}>
        <Pressable onPress={confirmarSalida} style={styles.avatar} accessibilityLabel="Cuenta y cierre de sesión">
          <Text style={styles.avatarTexto}>{iniciales(usuario.nombre)}</Text>
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.bienvenida}>Bienvenido de nuevo</Text>
          <Text style={styles.saludo} numberOfLines={1}>¡Hola, {primerNombre(usuario.nombre)}!</Text>
        </View>
        <Pressable onPress={() => proximamente('Avisos')} hitSlop={10} accessibilityLabel="Notificaciones">
          <Icono name="notifications-outline" size={26} color={tema.colores.texto} />
        </Pressable>
      </View>

      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.contenido}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={tema.colores.primario} />}
        >
          <ResumenAhorro
            total={datos?.totalRecolectado ?? 0}
            tandasActivas={tandas.filter((t) => t.estado === 'activa').length}
            proximoCobro={datos?.proximoCobro ?? null}
            onEstadisticas={() => proximamente('Estadísticas')}
            onCompartir={() => proximamente('Compartir')}
          />

          <View style={styles.tituloSeccion}>
            <View style={styles.filaTitulo}>
              <Text style={styles.seccion}>Tandas Activas</Text>
              <View style={styles.contador}>
                <Text style={styles.contadorTexto}>{tandas.length}</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push('/mis-tandas' as never)} style={styles.verTodas} hitSlop={8}>
              <Text style={styles.verTodasTexto}>Ver todas</Text>
              <Icono name="chevron-forward" size={16} color={tema.colores.primario} />
            </Pressable>
          </View>

          {tandas.length === 0 ? (
            <View style={[styles.vacio, tema.sombras.nivel1]}>
              <View style={styles.vacioIcono}>
                <Icono name="people-outline" size={32} color={tema.colores.primario} />
              </View>
              <Text style={styles.vacioTitulo}>Aún no tienes tandas</Text>
              <Text style={styles.vacioTexto}>Crea tu primer cuchubal y organiza turnos, cuotas y pagos en un solo lugar.</Text>
              {__DEV__ && (
                <Boton
                  titulo="Cargar datos de ejemplo"
                  variante="secundario"
                  iconoIzquierda="flask-outline"
                  onPress={cargarEjemplos}
                  estilo={styles.vacioBoton}
                />
              )}
            </View>
          ) : (
            <View style={styles.lista}>
              {tandas.map((t) => (
                <TarjetaTanda key={t.id} tanda={t} onPress={() => proximamente(t.nombre)} />
              ))}
            </View>
          )}

          <View style={styles.consejo}>
            <View style={styles.consejoIcono}>
              <Icono name="bulb-outline" size={20} color={tema.colores.primario} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.consejoTitulo}>Consejo de Transparencia</Text>
              <Text style={styles.consejoTexto}>
                Solicita el comprobante por WhatsApp o cárgalo directamente aquí para mantener las cuentas claras.
              </Text>
            </View>
          </View>
        </ScrollView>

        <Pressable
          onPress={() => router.push('/nueva-tanda' as never)}
          style={({ pressed }) => [styles.fab, tema.sombras.nivel2, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
        >
          <Icono name="add" size={26} color="#ffffff" />
          <Text style={styles.fabTexto}>Nueva Tanda</Text>
        </Pressable>
      </View>

      <BarraInferior activa="inicio" onSeleccionar={alSeleccionar} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  raiz: { flex: 1, backgroundColor: tema.colores.fondo },
  encabezado: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: tema.espacio.md, paddingVertical: 10,
    backgroundColor: tema.colores.superficie, borderBottomWidth: 1, borderBottomColor: tema.colores.superficieMedia,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: tema.colores.secundarioContenedor,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: tema.colores.primario,
  },
  avatarTexto: { ...tema.tipografia.etiquetaLg, fontWeight: '800', color: tema.colores.primario },
  bienvenida: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  saludo: { ...tema.tipografia.encabezadoMd, fontWeight: '800', color: tema.colores.primario },
  contenido: { padding: tema.espacio.md, paddingBottom: 110, gap: tema.espacio.md },
  tituloSeccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: tema.espacio.sm },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seccion: { ...tema.tipografia.encabezadoMd, fontWeight: '800', color: tema.colores.texto },
  contador: {
    minWidth: 24, height: 24, paddingHorizontal: 8, borderRadius: 12,
    backgroundColor: tema.colores.secundarioContenedor, justifyContent: 'center', alignItems: 'center',
  },
  contadorTexto: { ...tema.tipografia.etiqueta, fontWeight: '800', color: tema.colores.sobreSecundarioContenedor },
  verTodas: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verTodasTexto: { ...tema.tipografia.etiquetaLg, fontWeight: '700', color: tema.colores.primario },
  lista: { gap: tema.espacio.md },
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
  consejo: {
    flexDirection: 'row', gap: 12, padding: tema.espacio.md, borderRadius: tema.radio.tarjeta,
    backgroundColor: tema.colores.superficieBaja, borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  consejoIcono: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: tema.colores.secundarioContenedor,
    justifyContent: 'center', alignItems: 'center',
  },
  consejoTitulo: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto },
  consejoTexto: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginTop: 2 },
  fab: {
    position: 'absolute', right: tema.espacio.md, bottom: tema.espacio.md,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 56, paddingHorizontal: 22, borderRadius: 28, backgroundColor: tema.colores.primario,
  },
  fabTexto: { ...tema.tipografia.cuerpoLg, fontWeight: '800', color: '#ffffff' },
});