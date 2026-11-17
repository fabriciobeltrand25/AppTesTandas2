import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
import { aISOLocal, desdeISOLocal } from '../utils/fechas';
import { fechaCompleta } from '../utils/formato';
import { Icono } from './Icono';

interface Props {
  etiqueta: string;
  /** YYYY-MM-DD */
  valor: string;
  onCambio: (iso: string) => void;
  /** YYYY-MM-DD: no se puede elegir antes de esta fecha */
  minimo?: string;
  /** YYYY-MM-DD: no se puede elegir después de esta fecha */
  maximo?: string;
  error?: string;
}

export function CampoFecha({ etiqueta, valor, onCambio, minimo, maximo, error }: Props) {
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
  const [abierto, setAbierto] = useState(false);

  const alElegir = (evento: DateTimePickerEvent, fecha?: Date) => {
    if (Platform.OS === 'android') setAbierto(false);
    if (evento.type === 'set' && fecha) onCambio(aISOLocal(fecha));
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Pressable
        onPress={() => setAbierto((v) => !v)}
        accessibilityRole="button"
        style={[styles.campo, { borderColor: error ? tema.colores.error : tema.colores.borde }]}
      >
        <Icono name="calendar-outline" size={20} color={tema.colores.primario} />
        <Text style={styles.valor}>{fechaCompleta(valor)}</Text>
        <Icono name="chevron-down" size={20} color={tema.colores.placeholder} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {abierto && (
        <DateTimePicker
          value={desdeISOLocal(valor)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimo ? desdeISOLocal(minimo) : undefined}
          maximumDate={maximo ? desdeISOLocal(maximo) : undefined}
          onChange={alElegir}
          accentColor={tema.colores.primario}
        />
      )}
    </View>
  );
}

const crearEstilos = (tema: Tema) => StyleSheet.create({
  contenedor: { marginBottom: tema.espacio.md },
  etiqueta: { ...tema.tipografia.etiqueta, color: tema.colores.texto, marginBottom: 6 },
  campo: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: tema.espacio.md,
    borderRadius: tema.radio.input, borderWidth: 1, backgroundColor: tema.colores.superficie,
  },
  valor: { flex: 1, ...tema.tipografia.cuerpoLg, color: tema.colores.texto },
  error: { ...tema.tipografia.cuerpoSm, color: tema.colores.error, marginTop: 4 },
});
