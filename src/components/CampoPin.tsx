/**
 * Campo de PIN con casillas (4 dígitos por defecto).
 * Usa un TextInput invisible encima de las casillas para abrir el teclado numérico.
 */
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { tema } from '../tema';
import { soloDigitos } from '../utils/formato';

interface Props {
  valor: string;
  onCambio: (pin: string) => void;
  longitud?: number;
  /** Muestra puntos en lugar de números */
  oculto?: boolean;
  error?: string;
}

export function CampoPin({ valor, onCambio, longitud = 4, oculto = true, error }: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const c = tema.colores;

  return (
    <View>
      <View style={styles.fila}>
        {Array.from({ length: longitud }, (_, i) => {
          const lleno = i < valor.length;
          const activo = enfocado && i === valor.length;
          return (
            <View
              key={i}
              style={[
                styles.casilla,
                lleno && styles.casillaLlena,
                activo && styles.casillaActiva,
                !!error && { borderColor: c.error },
              ]}
            >
              <Text style={styles.digito}>{lleno ? (oculto ? '●' : valor[i]) : ''}</Text>
            </View>
          );
        })}

        <TextInput
          style={styles.invisible}
          value={valor}
          onChangeText={(t) => onCambio(soloDigitos(t).slice(0, longitud))}
          keyboardType="number-pad"
          maxLength={longitud}
          caretHidden
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          accessibilityLabel={`PIN de ${longitud} dígitos`}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: tema.espacio.sm },
  casilla: {
    flex: 1,
    maxWidth: 76,
    aspectRatio: 1,
    borderRadius: tema.radio.input,
    borderWidth: 1.5,
    borderColor: tema.colores.borde,
    backgroundColor: tema.colores.superficie,
    justifyContent: 'center',
    alignItems: 'center',
  },
  casillaLlena: { borderColor: tema.colores.primario, backgroundColor: '#ecfdf5' },
  casillaActiva: { borderStyle: 'dashed', borderColor: tema.colores.primario, backgroundColor: tema.colores.superficieBaja },
  digito: { fontSize: 24, fontWeight: '800', color: tema.colores.primario },
  invisible: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 },
  error: { ...tema.tipografia.cuerpoSm, color: tema.colores.error, marginTop: 6 },
});
