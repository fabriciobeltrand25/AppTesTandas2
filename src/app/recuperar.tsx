/** Recuperar contraseña (ruta "/recuperar"), sin internet: teléfono + PIN de 4 dígitos. */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Boton } from '../components/Boton';
import { BotonCircular } from '../components/BotonCircular';
import { CampoPin } from '../components/CampoPin';
import { CampoTelefono } from '../components/CampoTelefono';
import { CampoTexto } from '../components/CampoTexto';
import { Icono } from '../components/Icono';
import { PantallaAuth } from '../components/PantallaAuth';
import { restablecerPassword, verificarPin, type ErroresForm } from '../controllers/authController';
import { tema } from '../tema';

export default function RecuperarScreen() {
  const router = useRouter();
  const [fase, setFase] = useState<'verificar' | 'nueva'>('verificar');
  const [telefono, setTelefono] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errores, setErrores] = useState<ErroresForm>({});
  const [cargando, setCargando] = useState(false);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/' as never));

  const verificar = async () => {
    setCargando(true);
    setErrores({});
    try {
      const r = await verificarPin(telefono, pin);
      if (r.ok) setFase('nueva');
      else setErrores(r.errores);
    } finally {
      setCargando(false);
    }
  };

  const guardar = async () => {
    setCargando(true);
    setErrores({});
    try {
      const r = await restablecerPassword(telefono, pin, password, confirmar);
      if (r.ok) {
        Alert.alert('Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.', [
          { text: 'Ir al inicio de sesión', onPress: () => router.replace('/' as never) },
        ]);
      } else {
        setErrores(r.errores);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <PantallaAuth>
      <View style={styles.encabezado}>
        <BotonCircular icono="arrow-back" etiqueta="Volver" onPress={volver} />
        <Text style={styles.encabezadoTitulo}>Seguridad de Cuenta</Text>
        <BotonCircular icono="help-circle-outline" etiqueta="Ayuda" />
      </View>

      <View style={styles.hero}>
        <View style={styles.iconoCaja}>
          <Icono name="lock-open-outline" size={44} color={tema.colores.primario} />
          <View style={styles.escudo}>
            <Icono name="shield-checkmark" size={14} color="#ffffff" />
          </View>
        </View>
        <Text style={styles.titulo}>Recuperar Contraseña</Text>
        <Text style={styles.subtitulo}>
          {fase === 'verificar'
            ? 'Ingresa tu teléfono registrado y el PIN de 4 dígitos que creaste al registrarte.'
            : 'Identidad verificada. Elige tu nueva contraseña.'}
        </Text>
      </View>

      {fase === 'verificar' ? (
        <>
          <View style={[styles.tarjeta, tema.sombras.nivel1]}>
            <CampoTelefono
              etiqueta="Número de Teléfono Registrado"
              nota="Honduras"
              valor={telefono}
              onCambio={setTelefono}
              error={errores.telefono}
            />
          </View>

          <View style={[styles.tarjeta, tema.sombras.nivel1]}>
            <View style={styles.filaPin}>
              <Icono name="keypad-outline" size={20} color={tema.colores.textoSecundario} />
              <Text style={styles.pinTitulo}>Ingresa tu PIN de 4 dígitos</Text>
            </View>
            <CampoPin valor={pin} onCambio={setPin} oculto={false} error={errores.pin} />
          </View>

          {errores.general ? <Text style={styles.errorGeneral}>{errores.general}</Text> : null}

          <Boton
            titulo="Verificar y Continuar"
            iconoDerecha="arrow-forward"
            onPress={verificar}
            cargando={cargando}
            estilo={styles.boton}
          />
        </>
      ) : (
        <>
          <View style={[styles.tarjeta, tema.sombras.nivel1]}>
            <CampoTexto
              etiqueta="Nueva contraseña"
              icono="lock-closed-outline"
              placeholder="Mínimo 8 caracteres"
              esPassword
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              error={errores.password}
            />
            <CampoTexto
              etiqueta="Confirmar contraseña"
              icono="refresh-circle-outline"
              placeholder="••••••••"
              esPassword
              value={confirmar}
              onChangeText={setConfirmar}
              autoCapitalize="none"
              error={errores.confirmar}
            />
          </View>

          {errores.general ? <Text style={styles.errorGeneral}>{errores.general}</Text> : null}

          <Boton
            titulo="Guardar nueva contraseña"
            iconoDerecha="checkmark"
            onPress={guardar}
            cargando={cargando}
            estilo={styles.boton}
          />
        </>
      )}

      <View style={styles.sello}>
        <Icono name="shield-checkmark-outline" size={14} color={tema.colores.textoSecundario} />
        <Text style={styles.selloTexto}>Recuperación segura • Funciona sin internet</Text>
      </View>
    </PantallaAuth>
  );
}

const styles = StyleSheet.create({
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  encabezadoTitulo: { ...tema.tipografia.etiquetaLg, fontSize: 16, color: tema.colores.texto },
  hero: { alignItems: 'center', marginVertical: tema.espacio.lg },
  iconoCaja: {
    width: 96, height: 96, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    backgroundColor: tema.colores.brilloVerde, borderWidth: 1, borderColor: tema.colores.secundarioContenedor,
  },
  escudo: {
    position: 'absolute', right: -8, bottom: -8, width: 30, height: 30, borderRadius: 15,
    backgroundColor: tema.colores.primario, borderWidth: 3, borderColor: tema.colores.fondo,
    justifyContent: 'center', alignItems: 'center',
  },
  titulo: { ...tema.tipografia.encabezadoLg, color: tema.colores.texto, marginTop: tema.espacio.md, textAlign: 'center' },
  subtitulo: { ...tema.tipografia.cuerpoLg, fontWeight: '400', color: tema.colores.textoSecundario, textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
  tarjeta: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.xl, padding: 20,
    borderWidth: 1, borderColor: tema.colores.bordeSuave, marginBottom: tema.espacio.md,
  },
  filaPin: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  pinTitulo: { ...tema.tipografia.etiquetaLg, fontSize: 15, color: tema.colores.texto },
  errorGeneral: { ...tema.tipografia.etiqueta, color: tema.colores.error, marginBottom: 8, textAlign: 'center' },
  boton: { marginTop: 4 },
  sello: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: tema.espacio.lg, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: tema.radio.pildora,
    backgroundColor: tema.colores.superficieBaja, borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  selloTexto: { ...tema.tipografia.etiqueta, color: tema.colores.textoSecundario },
});
