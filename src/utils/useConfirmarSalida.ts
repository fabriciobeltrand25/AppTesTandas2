import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useSesion } from '../context/SesionContext';

/** Devuelve una función que pregunta "¿Cerrar sesión?" y, si confirma, sale. */
export function useConfirmarSalida() {
  const { salir } = useSesion();
  return useCallback(() => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => salir() },
    ]);
  }, [salir]);
}
