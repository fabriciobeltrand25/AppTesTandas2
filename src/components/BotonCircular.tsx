import { Pressable, StyleSheet } from 'react-native';
import type { Tema } from '../tema';
import { useEstilos, useTema } from '../context/TemaContext';
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
  const tema = useTema();
  const styles = useEstilos(crearEstilos);
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

const crearEstilos = (tema: Tema) => StyleSheet.create({
  caja: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tema.colores.superficie,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
