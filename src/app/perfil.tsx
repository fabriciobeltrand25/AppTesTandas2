/** Perfil del usuario (ruta "/perfil"): editar nombre, correo y teléfono, y cerrar sesión. */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, StyleSheet, Text, View,
} from 'react-native';
import { PantallaTeclado, ScrollTeclado } from '../components/TecladoSeguro';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarraInferior } from '../components/BarraInferior';
import { Boton } from '../components/Boton';
import { CampoTelefono } from '../components/CampoTelefono';
import { CampoTexto } from '../components/CampoTexto';
import { EncabezadoPantalla } from '../components/EncabezadoPantalla';
import { Icono } from '../components/Icono';
import { useSesion } from '../context/SesionContext';
import { actualizarPerfil, type ErroresForm } from '../controllers/authController';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { iniciales } from '../utils/formato';
import { useConfirmarSalida } from '../utils/useConfirmarSalida';

export default function PerfilScreen() {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const router = useRouter();
  const { usuario, entrar } = useSesion();
  const confirmarSalida = useConfirmarSalida();

  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [correo, setCorreo] = useState(usuario?.correo ?? '');
  const [passwordActual, setPasswordActual] = useState('');
  const [errores, setErrores] = useState<ErroresForm>({});
  const [guardando, setGuardando] = useState(false);

  if (!usuario) return null;
  const c = tema.colores;

  const cambioTelefono = telefono !== usuario.telefono;
  const hayCambios =
    nombre.trim() !== usuario.nombre || cambioTelefono || correo.trim() !== (usuario.correo ?? '');

  const guardar = async () => {
    setGuardando(true);
    setErrores({});
    try {
      const r = await actualizarPerfil(usuario, { nombre, telefono, correo, passwordActual });
      if (r.ok) {
        entrar(r.usuario); // actualiza el nombre en toda la app
        setNombre(r.usuario.nombre);
        setTelefono(r.usuario.telefono);
        setCorreo(r.usuario.correo ?? '');
        setPasswordActual('');
        Alert.alert('Perfil actualizado', 'Tus datos se guardaron. Tus tandas, pagos y cobros siguen en tu cuenta.');
      } else {
        setErrores(r.errores);
      }
    } catch {
      setErrores({ general: 'No se pudo guardar. Intenta de nuevo.' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.raiz} edges={['top']}>
      <EncabezadoPantalla
        titulo="Mi Perfil"
        subtitulo="Tus datos de cuenta"
        onAtras={() => (router.canGoBack() ? router.back() : router.replace('/configuracion' as never))}
      />

      <PantallaTeclado>
        <ScrollTeclado contentContainerStyle={styles.contenido}>
          {/* Cabecera */}
          <View style={styles.cabecera}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{iniciales(nombre || usuario.nombre)}</Text>
            </View>
            <Text style={styles.nombreGrande} numberOfLines={1}>{usuario.nombre}</Text>
            <View style={styles.chipId}>
              <Icono name="finger-print-outline" size={14} color={c.primario} />
              <Text style={styles.chipIdTexto}>Cuenta #{usuario.id}</Text>
            </View>
          </View>

          {/* Formulario */}
          <View style={[styles.tarjeta, tema.sombras.nivel1]}>
            <CampoTexto
              etiqueta="Nombre completo"
              icono="person-outline"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
              error={errores.nombre}
            />
            <CampoTexto
              etiqueta="Correo electrónico (opcional)"
              icono="mail-outline"
              placeholder="correo@ejemplo.hn"
              value={correo}
              onChangeText={setCorreo}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errores.correo}
            />
            <CampoTelefono
              etiqueta="Número de teléfono"
              valor={telefono}
              onCambio={setTelefono}
              error={errores.telefono}
            />
            <Text style={styles.ayuda}>
              Es el número con el que inicias sesión y con el que te agregan a las tandas. Si lo cambias,
              te pediremos tu contraseña. Tus tandas, pagos y cobros no se pierden porque tu cuenta se
              identifica por su propio ID.
            </Text>

            {cambioTelefono && (
              <View style={styles.confirmar}>
                <CampoTexto
                  etiqueta="Contraseña actual"
                  icono="lock-closed-outline"
                  placeholder="••••••••"
                  esPassword
                  value={passwordActual}
                  onChangeText={setPasswordActual}
                  autoCapitalize="none"
                  error={errores.passwordActual}
                />
              </View>
            )}

            {errores.general ? <Text style={styles.errorGeneral}>{errores.general}</Text> : null}

            <Boton
              titulo="Guardar cambios"
              iconoIzquierda="checkmark-circle-outline"
              onPress={guardar}
              cargando={guardando}
              deshabilitado={!hayCambios}
              estilo={styles.boton}
            />
          </View>

          {/* Sesión */}
          <Boton
            titulo="Cerrar sesión"
            iconoIzquierda="log-out-outline"
            variante="secundario"
            onPress={confirmarSalida}
          />
        </ScrollTeclado>
      </PantallaTeclado>

      <BarraInferior activa="ajustes" />
    </SafeAreaView>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  flex: { flex: 1 },
  raiz: { flex: 1, backgroundColor: tema.colores.fondo },
  contenido: { padding: tema.espacio.md, gap: tema.espacio.md, paddingBottom: tema.espacio.xl },
  cabecera: { alignItems: 'center', gap: 8, paddingVertical: tema.espacio.sm },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: tema.colores.secundarioContenedor,
    borderWidth: 3, borderColor: tema.colores.primario, justifyContent: 'center', alignItems: 'center',
  },
  avatarTexto: { fontSize: 30, fontWeight: '800', color: tema.colores.primario },
  nombreGrande: { ...tema.tipografia.encabezadoMd, fontWeight: '800', color: tema.colores.texto },
  chipId: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: tema.radio.pildora, backgroundColor: tema.colores.pagadoFondo,
  },
  chipIdTexto: { ...tema.tipografia.etiqueta, color: tema.colores.primario },
  tarjeta: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.tarjeta, padding: tema.espacio.md,
    borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  ayuda: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginTop: -4, marginBottom: tema.espacio.md },
  confirmar: { padding: 12, borderRadius: tema.radio.input, backgroundColor: tema.colores.fondoNaranja, borderWidth: 1, borderColor: tema.colores.pendienteBorde, marginBottom: 4 },
  errorGeneral: { ...tema.tipografia.etiqueta, color: tema.colores.error, marginBottom: 8 },
  boton: { marginTop: 4 },
});
