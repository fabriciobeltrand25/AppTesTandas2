/**
 * Interruptores de funciones de la app.
 *
 * NOTIFICACIONES_ACTIVAS
 *   - En Expo Go (Android) las notificaciones NO funcionan desde el SDK 53 y cargar
 *     'expo-notifications' hace que la app se cierre. Por eso se desactivan solas ahí.
 *   - En un Development Build / APK compilado se activan solas.
 *
 *   Si algún día quieres forzarlo a mano, cambia FORZAR a true (siempre activas)
 *   o a false (siempre desactivadas). Con null es automático.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';

const FORZAR: boolean | null = null;

const enExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const NOTIFICACIONES_ACTIVAS: boolean = FORZAR ?? !enExpoGo;

/**
 * Animación de bienvenida (Lottie) al abrir la app.
 *  - VELOCIDAD: la animación original dura 10 s (300 fotogramas a 30 fps).
 *    1 = original · 2 = 5 s · 2.5 = 4 s. Cámbialo a tu gusto.
 *  - SE_PUEDE_OMITIR: si es true, tocar la pantalla la salta.
 *  - ACTIVA: ponla en false para desactivarla sin borrar nada.
 */
export const ANIMACION_INICIO = {
  ACTIVA: true,
  VELOCIDAD: 2,
  SE_PUEDE_OMITIR: true,
} as const;
