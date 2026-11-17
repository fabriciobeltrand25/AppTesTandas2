/**
 * Foto del comprobante de pago: se toma con la cámara o se elige de la galería,
 * se reduce a ~900 px y se guarda como texto (base64) dentro de la base de datos,
 * así viaja con los datos y no depende de archivos sueltos del teléfono.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export type OrigenFoto = 'camara' | 'galeria';

const ANCHO_MAXIMO = 900;

/** Devuelve la foto en base64 (JPEG), o null si el usuario cancela o no hay permiso. */
export async function elegirComprobante(origen: OrigenFoto): Promise<string | null> {
  try {
    if (origen === 'camara') {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso necesario', 'Permite el acceso a la cámara para tomar la foto del comprobante.');
        return null;
      }
    }

    const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const resultado =
      origen === 'camara'
        ? await ImagePicker.launchCameraAsync(opciones)
        : await ImagePicker.launchImageLibraryAsync(opciones);

    if (resultado.canceled || !resultado.assets?.[0]) return null;
    const foto = resultado.assets[0];

    const reducida = await ImageManipulator.manipulateAsync(
      foto.uri,
      foto.width > ANCHO_MAXIMO ? [{ resize: { width: ANCHO_MAXIMO } }] : [],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return reducida.base64 ?? null;
  } catch {
    Alert.alert('No se pudo cargar la foto', 'Intenta de nuevo.');
    return null;
  }
}

/** Convierte el base64 guardado en algo que <Image> puede mostrar. */
export const uriDeComprobante = (base64: string) => `data:image/jpeg;base64,${base64}`;
