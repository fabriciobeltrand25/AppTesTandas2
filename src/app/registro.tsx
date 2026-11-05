/** Pantalla "Crea tu cuenta" (ruta "/registro"). */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from '../components/Boton';
import { BotonCircular } from '../components/BotonCircular';
import { CampoPin } from '../components/CampoPin';
import { CampoTelefono } from '../components/CampoTelefono';
import { CampoTexto } from '../components/CampoTexto';
import { CasillaAcepto } from '../components/CasillaAcepto';
import { Icono } from '../components/Icono';
import { Logo } from '../components/Logo';
import { PantallaAuth } from '../components/PantallaAuth';
import { fuerzaPassword, registrar, type ErroresForm } from '../controllers/authController';
import { useSesion } from '../context/SesionContext';
import { tema } from '../tema';

export default function RegistroScreen() {
  const router = useRouter();
  const { entrar } = useSesion();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [pin, setPin] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState<ErroresForm>({});
  const [cargando, setCargando] = useState(false);

  const fuerza = fuerzaPassword(password);
  const coinciden = confirmar.length > 0 && confirmar === password;

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/' as never));

  const manejarRegistro = async () => {
    setCargando(true);
    setErrores({});
    try {
      const r = await registrar({ nombre, telefono, correo, password, confirmar, pin, aceptaTerminos: acepta });
      if (r.ok) entrar(r.usuario); // el guardia de _layout te lleva al dashboard
      else setErrores(r.errores);
    } catch {
      setErrores({ general: 'No se pudo crear la cuenta. Intenta de nuevo.' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <PantallaAuth>
      <View style={styles.encabezado}>
        <BotonCircular icono="arrow-back" etiqueta="Volver" onPress={volver} />
        <View style={styles.marca}>
          <Logo tamano={40} />
          <View>
            <Text style={styles.marcaNombre}>Mis Tandas</Text>
            <Text style={styles.marcaPais}>HONDURAS</Text>
          </View>
        </View>
        <BotonCircular icono="shield-checkmark-outline" etiqueta="Seguridad" />
      </View>

      <View style={styles.insignia}>
        <Icono name="ellipse" size={8} color={tema.colores.primario} />
        <Text style={styles.insigniaTexto}>Cuchubales transparentes y seguros</Text>
      </View>

      <Text style={styles.titulo}>Crea tu cuenta</Text>
      <Text style={styles.subtitulo}>
        Empieza a administrar tus cuchubales y ahorros de forma segura en comunidad.
      </Text>

      <View style={[styles.tarjeta, tema.sombras.nivel1]}>
        <CampoTexto
          etiqueta="Nombre Completo"
          nota="Requerido"
          icono="person-outline"
          placeholder="Carmen Rodríguez"
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
          error={errores.nombre}
        />

        <CampoTelefono nota="Para avisos de turno" valor={telefono} onCambio={setTelefono} error={errores.telefono} />

        <CampoTexto
          etiqueta="Correo Electrónico (Opcional)"
          nota="Para comprobantes"
          icono="mail-outline"
          placeholder="carmen@correo.hn"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errores.correo}
        />

        <CampoTexto
          etiqueta="Crear Contraseña"
          icono="lock-closed-outline"
          placeholder="••••••••"
          esPassword
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          error={errores.password}
        />
        <View style={styles.fuerzaFila}>
          <View style={styles.fuerzaPista}>
            <View style={[styles.fuerzaRelleno, { width: `${(fuerza / 4) * 100}%` }]} />
          </View>
          <Text style={styles.fuerzaTexto}>Mínimo 8 caracteres</Text>
        </View>

        <CampoTexto
          etiqueta="Confirmar Contraseña"
          icono="refresh-circle-outline"
          placeholder="••••••••"
          esPassword
          value={confirmar}
          onChangeText={setConfirmar}
          autoCapitalize="none"
          error={errores.confirmar}
          derecha={coinciden ? <Icono name="checkmark-circle-outline" size={22} color={tema.colores.primario} /> : undefined}
        />

        <View style={styles.bloquePin}>
          <Text style={styles.pinTitulo}>PIN de recuperación</Text>
          <Text style={styles.pinAyuda}>
            4 dígitos que te pediremos si olvidas tu contraseña. Memorízalo, funciona sin internet.
          </Text>
          <CampoPin valor={pin} onCambio={setPin} error={errores.pin} />
        </View>

        <CasillaAcepto marcada={acepta} onCambio={setAcepta} error={errores.terminos}>
          Acepto los <Text style={styles.enlace}>Términos y Condiciones</Text> y la{' '}
          <Text style={styles.enlace}>Política de Privacidad</Text> de Mis Tandas HN.
        </CasillaAcepto>

        {errores.general ? <Text style={styles.errorGeneral}>{errores.general}</Text> : null}

        <Boton
          titulo="Crear Cuenta"
          iconoDerecha="arrow-forward"
          onPress={manejarRegistro}
          cargando={cargando}
          estilo={styles.boton}
        />
      </View>

      <View style={styles.pie}>
        <Text style={styles.pieTexto}>¿Ya tienes una cuenta? </Text>
        <Pressable onPress={volver} hitSlop={8}>
          <Text style={styles.enlaceFuerte}>Inicia Sesión</Text>
        </Pressable>
      </View>

      <View style={styles.sello}>
        <Icono name="lock-closed-outline" size={14} color={tema.colores.textoSecundario} />
        <Text style={styles.selloTexto}>Tus datos se guardan solo en este teléfono</Text>
      </View>
    </PantallaAuth>
  );
}

const styles = StyleSheet.create({
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: tema.espacio.md },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  marcaNombre: { ...tema.tipografia.encabezadoSm, fontWeight: '800', color: tema.colores.texto, lineHeight: 20 },
  marcaPais: { ...tema.tipografia.etiquetaSm, letterSpacing: 1.5, color: tema.colores.textoSecundario },
  insignia: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: tema.radio.pildora,
    backgroundColor: tema.colores.pagadoFondo, borderWidth: 1, borderColor: tema.colores.pagadoBorde,
  },
  insigniaTexto: { ...tema.tipografia.etiqueta, color: tema.colores.primario },
  titulo: { ...tema.tipografia.titulo, color: tema.colores.texto, marginTop: 12 },
  subtitulo: { ...tema.tipografia.cuerpoLg, fontWeight: '400', color: tema.colores.textoSecundario, marginTop: 8, marginBottom: tema.espacio.md },
  tarjeta: {
    backgroundColor: tema.colores.superficie, borderRadius: tema.radio.xl, padding: 20,
    borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  fuerzaFila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -8, marginBottom: tema.espacio.md },
  fuerzaPista: { flex: 1, height: 4, borderRadius: 2, backgroundColor: tema.colores.superficieAlta, overflow: 'hidden' },
  fuerzaRelleno: { height: '100%', backgroundColor: tema.colores.primario },
  fuerzaTexto: { ...tema.tipografia.etiquetaSm, color: tema.colores.textoSecundario },
  bloquePin: { marginBottom: tema.espacio.md },
  pinTitulo: { ...tema.tipografia.etiqueta, color: tema.colores.texto },
  pinAyuda: { ...tema.tipografia.cuerpoSm, color: tema.colores.textoSecundario, marginTop: 2, marginBottom: 10 },
  enlace: { fontWeight: '700', color: tema.colores.primario },
  errorGeneral: { ...tema.tipografia.etiqueta, color: tema.colores.error, marginTop: 8 },
  boton: { marginTop: tema.espacio.md },
  pie: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: tema.espacio.lg },
  pieTexto: { ...tema.tipografia.cuerpoLg, fontWeight: '400', color: tema.colores.textoSecundario },
  enlaceFuerte: { ...tema.tipografia.cuerpoLg, fontWeight: '800', color: tema.colores.primario },
  sello: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 12, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: tema.radio.pildora,
    backgroundColor: tema.colores.superficieBaja, borderWidth: 1, borderColor: tema.colores.bordeSuave,
  },
  selloTexto: { ...tema.tipografia.etiqueta, color: tema.colores.textoSecundario },
});
