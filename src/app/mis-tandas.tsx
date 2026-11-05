/** Lista de todas las tandas del usuario (ruta "/mis-tandas"). */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarraInferior, type ClaveSeccion } from '../components/BarraInferior';
import { Boton } from '../components/Boton';
import { Icono } from '../components/Icono';
import { TarjetaTanda } from '../components/TarjetaTanda';
import { useSesion } from '../context/SesionContext';
import { obtenerResumenDashboard, type TandaConDetalle } from '../controllers/tandaController';
import { tema } from '../tema';


export default function MisTandasScreen() {
  const router = useRouter();
  const { usuario } = useSesion();
  const [tandas, setTandas] = useState<TandaConDetalle[]>([]);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const resumen = await obtenerResumenDashboard(usuario);
    setTandas(resumen.tandas);
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

  const nueva = () => router.push('/nueva-tanda' as never);

  const alSeleccionar = (clave: ClaveSeccion) => {
    if (clave === 'tandas') return;
    if (clave === 'inicio') return router.replace('/dashboard' as never);
    if (clave === 'perfil') return router.replace('/dashboard' as never);
  };

  return (
    <SafeAreaView style={styles.raiz} edges={['top']}>
      <View style={styles.encabezado}>
        <View style={styles.flex}>
          <Text style={styles.titulo}>Mis Tandas</Text>
          <Text style={styles.subtitulo}>
            {tandas.length === 0 ? 'Aún no has creado tandas' : `${tandas.length} ${tandas.length === 1 ? 'tanda' : 'tandas'} en total`}
          </Text>
        </View>
        <Pressable onPress={nueva} style={styles.agregar} accessibilityLabel="Nueva tanda">
          <Icono name="add" size={26} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={tema.colores.primario} />}
      >
        {tandas.length === 0 ? (
          <View style={[styles.vacio, tema.sombras.nivel1]}>
            <View style={styles.vacioIcono}>
              <Icono name="people-outline" size={32} color={tema.colores.primario} />
            </View>
            <Text style={styles.vacioTitulo}>Crea tu primer cuchubal</Text>
            <Text style={styles.vacioTexto}>
              Define la cuota, agrega a los participantes y el calendario de rondas se genera solo.
            </Text>
            <Boton titulo="Nueva Tanda" iconoIzquierda="add" onPress={nueva} estilo={styles.vacioBoton} />
          </View>
        ) : (
          <View style={styles.lista}>
            {tandas.map((t) => (
              <TarjetaTanda
                key={t.id}
                tanda={t}
                onPress={() => {}}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <BarraInferior activa="tandas" onSeleccionar={alSeleccionar} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  raiz: { flex: 1, backgroundColor: tema.colores.fondo },
  encabezado: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: tema.espacio.md, paddingVertical: 12,
    backgroundColor: tema.colores.superficie, borderBottomWidth: 1, borderBottomColor: tema.colores.superficieMedia,
  },
  titulo: { ...tema.tipografia.encabezadoLg, color: tema.colores.texto },
  subtitulo: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario },
  agregar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: tema.colores.primario,
    justifyContent: 'center', alignItems: 'center',
  },
  contenido: { padding: tema.espacio.md, gap: tema.espacio.md, paddingBottom: tema.espacio.xl },
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
});