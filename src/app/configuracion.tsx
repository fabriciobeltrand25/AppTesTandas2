/** Configuración (ruta "/configuracion"): acceso al perfil y cambio de modo claro/oscuro. */
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarraInferior } from '../components/BarraInferior';
import { Boton } from '../components/Boton';
import { EncabezadoPantalla } from '../components/EncabezadoPantalla';
import { Icono, NombreIcono } from '../components/Icono';
import { useEstilos, useModoTema, useTema } from '../context/TemaContext';
import { useSesion } from '../context/SesionContext';
import type { Tema } from '../tema';
import { formatearTelefono } from '../utils/formato';
import { useConfirmarSalida } from '../utils/useConfirmarSalida';

/** Una fila de opción: icono, título, texto de apoyo y algo a la derecha (flecha o interruptor). */
function Fila({
  icono,
  titulo,
  detalle,
  derecha,
  onPress,
}: {
  icono: NombreIcono;
  titulo: string;
  detalle?: string;
  derecha?: ReactNode;
  onPress?: () => void;
}) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.fila, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.icono}>
        <Icono name={icono} size={24} color={tema.colores.primario} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.titulo}>{titulo}</Text>
        {detalle ? <Text style={styles.detalle} numberOfLines={1}>{detalle}</Text> : null}
      </View>
      {derecha}
    </Pressable>
  );
}

export default function ConfiguracionScreen() {
  const router = useRouter();
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const { oscuro, fijarModo } = useModoTema();
  const { usuario } = useSesion();
  const confirmarSalida = useConfirmarSalida();

  if (!usuario) return null;
  const c = tema.colores;

  return (
    <SafeAreaView style={styles.raiz} edges={['top']}>
      <EncabezadoPantalla titulo="Configuración" subtitulo="Tu cuenta y la apariencia de la app" />

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <Text style={styles.seccion}>Cuenta</Text>
        <View style={[styles.tarjeta, tema.sombras.nivel1]}>
          <Fila
            icono="person-circle-outline"
            titulo="Configurar perfil"
            detalle={`${usuario.nombre} • +504 ${formatearTelefono(usuario.telefono)}`}
            onPress={() => router.push('/perfil' as never)}
            derecha={<Icono name="chevron-forward" size={20} color={c.placeholder} />}
          />
        </View>

        <Text style={styles.seccion}>Apariencia</Text>
        <View style={[styles.tarjeta, tema.sombras.nivel1]}>
          <Fila
            icono={oscuro ? 'moon' : 'sunny-outline'}
            titulo="Modo oscuro"
            detalle={oscuro ? 'Activado' : 'Desactivado (modo claro)'}
            onPress={() => fijarModo(oscuro ? 'claro' : 'oscuro')}
            derecha={
              <Switch
                value={oscuro}
                onValueChange={(v) => fijarModo(v ? 'oscuro' : 'claro')}
                trackColor={{ true: c.primarioContenedor, false: c.superficieAlta }}
                thumbColor="#ffffff"
              />
            }
          />
        </View>

        <View style={styles.salir}>
          <Boton titulo="Cerrar sesión" iconoIzquierda="log-out-outline" variante="secundario" onPress={confirmarSalida} />
        </View>
      </ScrollView>

      <BarraInferior activa="ajustes" />
    </SafeAreaView>
  );
}

const crearEstilos = (tema: Tema) =>
  StyleSheet.create({
    flex: { flex: 1 },
    raiz: { flex: 1, backgroundColor: tema.colores.fondo },
    contenido: { padding: tema.espacio.md, gap: tema.espacio.sm, paddingBottom: tema.espacio.xl },
    seccion: {
      ...tema.tipografia.etiquetaLg,
      color: tema.colores.textoSecundario,
      marginTop: tema.espacio.sm,
      marginLeft: 4,
    },
    tarjeta: {
      backgroundColor: tema.colores.superficie,
      borderRadius: tema.radio.tarjeta,
      borderWidth: 1,
      borderColor: tema.colores.bordeSuave,
      overflow: 'hidden',
    },
    fila: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: tema.espacio.md },
    icono: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: tema.colores.secundarioContenedor,
      justifyContent: 'center',
      alignItems: 'center',
    },
    titulo: { ...tema.tipografia.encabezadoSm, fontSize: 16, color: tema.colores.texto },
    detalle: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginTop: 2 },
    salir: { marginTop: tema.espacio.lg },
  });
