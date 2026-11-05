/** Pantalla de inicio de sesión (ruta "/"). */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from '../components/Boton';
import { CampoTelefono } from '../components/CampoTelefono';
import { CampoTexto } from '../components/CampoTexto';
import { CasillaAcepto } from '../components/CasillaAcepto';
import { Logo } from '../components/Logo';
import { PantallaAuth } from '../components/PantallaAuth';
import { iniciarSesion, type ErroresForm } from '../controllers/authController';
import { useSesion } from '../context/SesionContext';
import { tema } from '../tema';

export default function LoginScreen() {
  const router = useRouter();
  const { entrar } = useSesion();
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(true);
  const [errores, setErrores] = useState<ErroresForm>({});
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async () => {
    setCargando(true);
    setErrores({});
    try {
      const r = await iniciarSesion(telefono, password, recordar);
      if (r.ok) entrar(r.usuario); // el guardia de _layout te lleva al dashboard
      else setErrores(r.errores);
    } catch {
      setErrores({ general: 'Ocurrió un error. Intenta de nuevo.' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <PantallaAuth centrado>
      <View style={styles.marca}>
        <View style={styles.logoExterior}>
          <Logo tamano={56} />
        </View>
        <Text style={styles.titulo}>Mis Tandas</Text>
        <Text style={styles.subtitulo}>Ahorro grupal transparente y organizado en comunidad</Text>
      </View>

      <View style={[styles.tarjeta, tema.sombras.nivel1]}>
        <Text style={styles.tarjetaTitulo}>¡Bienvenido de nuevo!</Text>
        <Text style={styles.tarjetaSubtitulo}>Ingresa para gestionar tus números y pagos</Text>

        <View style={styles.formulario}>
          <CampoTelefono valor={telefono} onCambio={setTelefono} error={errores.telefono} />
          <CampoTexto
            etiqueta="Contraseña"
            icono="lock-closed-outline"
            placeholder="••••••••"
            esPassword
            value={password}
            onChangeText={setPassword}
            error={errores.password}
            autoCapitalize="none"
          />
        </View>

        {errores.general ? <Text style={styles.errorGeneral}>{errores.general}</Text> : null}

        <View style={styles.filaOpciones}>
          <CasillaAcepto marcada={recordar} onCambio={setRecordar}>
            Recordar sesión
          </CasillaAcepto>
          <Pressable onPress={() => router.push('/recuperar' as never)} hitSlop={8}>
            <Text style={styles.enlace}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        </View>

        <Boton
          titulo="Iniciar Sesión"
          iconoDerecha="arrow-forward"
          onPress={manejarLogin}
          cargando={cargando}
          estilo={styles.boton}
        />
      </View>

      <View style={styles.pie}>
        <Text style={styles.pieTexto}>¿Nuevo en Mis Tandas? </Text>
        <Pressable onPress={() => router.push('/registro' as never)} hitSlop={8}>
          <Text style={styles.enlaceFuerte}>Regístrate aquí</Text>
        </Pressable>
      </View>
    </PantallaAuth>
  );
}

const styles = StyleSheet.create({
  marca: { alignItems: 'center', marginBottom: tema.espacio.lg },
  logoExterior: {
    width: 80, height: 80, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    backgroundColor: tema.colores.brilloVerde, borderWidth: 1, borderColor: tema.colores.secundarioContenedor,
    marginBottom: 14,
  },
  titulo: { ...tema.tipografia.encabezadoLg, color: tema.colores.primario, marginBottom: 4 },
  subtitulo: { ...tema.tipografia.cuerpo, color: tema.colores.textoSecundario, textAlign: 'center', paddingHorizontal: 20 },
  tarjeta: {
    backgroundColor: tema.colores.superficie, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  tarjetaTitulo: { ...tema.tipografia.encabezadoSm, color: tema.colores.texto },
  tarjetaSubtitulo: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginTop: 2 },
  formulario: { marginTop: tema.espacio.md },
  errorGeneral: { ...tema.tipografia.etiqueta, color: tema.colores.error, marginBottom: 8 },
  filaOpciones: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  enlace: { ...tema.tipografia.etiqueta, fontWeight: '700', color: tema.colores.primario },
  boton: { marginTop: tema.espacio.md },
  pie: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: tema.espacio.lg },
  pieTexto: { ...tema.tipografia.cuerpo, color: tema.colores.textoSecundario },
  enlaceFuerte: { ...tema.tipografia.etiquetaLg, fontWeight: '800', color: tema.colores.primario },
});
