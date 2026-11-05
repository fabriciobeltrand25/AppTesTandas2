import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { CampoTexto } from '../components/CampoTexto';
import { useSesion } from '../context/SesionContext';
import { crearTanda } from '../controllers/tandaController';
import { tema } from '../tema';

export default function NuevaTandaScreen() {
  const router = useRouter();
  const { usuario } = useSesion();

  const [nombre, setNombre] = useState('');
  const [cuota, setCuota] = useState('');
  const [frecuencia, setFrecuencia] = useState<'semanal' | 'quincenal' | 'mensual'>('quincenal');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!usuario) return;
    if (!nombre.trim() || !cuota.trim()) {
      Alert.alert('Campos incompletos', 'Por favor ingresa el nombre de la tanda y el monto de la cuota.');
      return;
    }

    const montoNumerico = parseFloat(cuota);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa una cuota mayor a cero.');
      return;
    }

    try {
      setGuardando(true);
      await crearTanda(usuario.id, {
        nombre: nombre.trim(),
        cuota: montoNumerico,
        frecuencia,
        fechaInicio,
      });

      Alert.alert('¡Éxito!', 'Tanda creada correctamente.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar la tanda en la base de datos.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.raiz} edges={['top', 'bottom']}>
      <View style={styles.encabezado}>
        <Text style={styles.tituloEncabezado}>Crear Nueva Tanda</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formulario} showsVerticalScrollIndicator={false}>
        <CampoTexto
          etiqueta="Nombre de la Tanda"
          placeholder="Ej. Tanda Familiar Diciembre"
          value={nombre}
          onChangeText={setNombre}
        />

        <CampoTexto
          etiqueta="Cuota por participante (Lps.)"
          placeholder="0.00"
          value={cuota}
          onChangeText={setCuota}
          keyboardType="numeric"
        />

        <View style={styles.grupoSelector}>
          <Text style={styles.etiquetaCampo}>Frecuencia de pago</Text>
          <View style={styles.filaFrecuencias}>
            {(['semanal', 'quincenal', 'mensual'] as const).map((freq) => (
              <Boton
                key={freq}
                titulo={freq.charAt(0).toUpperCase() + freq.slice(1)}
                variante={frecuencia === freq ? 'primario' : 'secundario'}
                onPress={() => setFrecuencia(freq)}
                estilo={styles.botonFrecuencia}
              />
            ))}
          </View>
        </View>

        <CampoTexto
          etiqueta="Fecha de inicio (YYYY-MM-DD)"
          placeholder="2026-11-01"
          value={fechaInicio}
          onChangeText={setFechaInicio}
        />

        <View style={styles.contenedorBotones}>
          <Boton
            titulo="Guardar Tanda"
            onPress={guardar}
            cargando={guardando}
            estilo={styles.botonGuardar}
          />
          <Boton
            titulo="Cancelar"
            variante="secundario"
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: tema.colores.fondo },
  encabezado: {
    paddingHorizontal: tema.espacio.md,
    paddingVertical: 14,
    backgroundColor: tema.colores.superficie,
    borderBottomWidth: 1,
    borderBottomColor: tema.colores.superficieMedia,
  },
  tituloEncabezado: { ...tema.tipografia.encabezadoMd, fontWeight: '800', color: tema.colores.primario },
  formulario: { padding: tema.espacio.md, gap: tema.espacio.md },
  grupoSelector: { gap: 6 },
  etiquetaCampo: { ...tema.tipografia.etiquetaLg, color: tema.colores.texto },
  filaFrecuencias: { flexDirection: 'row', gap: 8 },
  botonFrecuencia: { flex: 1 },
  contenedorBotones: { marginTop: tema.espacio.md, gap: 10 },
  botonGuardar: { backgroundColor: tema.colores.primario },
});