/**
 * Tema claro / oscuro de la app.
 * - useTema()    -> colores y medidas del modo actual
 * - useEstilos() -> hoja de estilos que se vuelve a crear sola cuando cambia el modo
 * - useModoTema()-> modo actual y función para cambiarlo (se recuerda en el teléfono)
 */
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { crearTema, type Tema } from '../tema';

export type ModoTema = 'claro' | 'oscuro';

const CLAVE_MODO = 'tema_modo';

interface TemaContextoTipo {
  tema: Tema;
  modo: ModoTema;
  fijarModo: (modo: ModoTema) => void;
}

const TemaContexto = createContext<TemaContextoTipo>({
  tema: crearTema(false),
  modo: 'claro',
  fijarModo: () => {},
});

export function TemaProvider({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<ModoTema>('claro');
  const [listo, setListo] = useState(false);

  // Recupera el modo que el usuario eligió la última vez
  useEffect(() => {
    (async () => {
      try {
        if ((await SecureStore.getItemAsync(CLAVE_MODO)) === 'oscuro') setModo('oscuro');
      } catch {
        /* sin almacén seguro: se queda en claro */
      } finally {
        setListo(true);
      }
    })();
  }, []);

  const fijarModo = useCallback((nuevo: ModoTema) => {
    setModo(nuevo);
    SecureStore.setItemAsync(CLAVE_MODO, nuevo).catch(() => {});
  }, []);

  const tema = useMemo(() => crearTema(modo === 'oscuro'), [modo]);
  const valor = useMemo(() => ({ tema, modo, fijarModo }), [tema, modo, fijarModo]);

  // Evita un destello del modo equivocado mientras se lee la preferencia
  if (!listo) return null;
  return <TemaContexto.Provider value={valor}>{children}</TemaContexto.Provider>;
}

export function useTema(): Tema {
  return useContext(TemaContexto).tema;
}

export function useModoTema() {
  const { modo, fijarModo } = useContext(TemaContexto);
  return { modo, fijarModo, oscuro: modo === 'oscuro' };
}

/** Crea los estilos con el tema actual; se recalculan al cambiar de modo. */
export function useEstilos<T>(fabrica: (tema: Tema) => T): T {
  const tema = useTema();
  return useMemo(() => fabrica(tema), [fabrica, tema]);
}
