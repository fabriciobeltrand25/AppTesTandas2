import { Pressable, StyleSheet } from 'react-native';
import { tema } from '../tema';
import { Icono, NombreIcono } from './Icono';

export function BotonCircular({
  icono,
  onPress,
  etiqueta,
}: {
  icono: NombreIcono;
  onPress?: () => void;
  etiqueta: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [styles.caja, tema.sombras.nivel1, pressed && { opacity: 0.8 }]}
    >
      <Icono name={icono} size={22} color={tema.colores.texto} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caja: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tema.colores.superficie,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
