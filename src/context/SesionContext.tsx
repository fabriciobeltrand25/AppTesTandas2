/**
 * Mantiene al usuario en sesión en toda la app.
 * Al abrir la app: abre la base de datos y restaura la sesión guardada.
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cerrarSesion, restaurarSesion } from '../controllers/authController';
import { obtenerDB } from '../database/db';
import type { Usuario } from '../models/usuarioModel';

interface SesionContextoTipo {
  usuario: Usuario | null;
  cargando: boolean;
  /** Llamar después de un login/registro correcto */
  entrar: (usuario: Usuario) => void;
  salir: () => Promise<void>;
}

const SesionContexto = createContext<SesionContextoTipo | undefined>(undefined);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await obtenerDB();
        setUsuario(await restaurarSesion());
      } catch (e) {
        console.warn('No se pudo iniciar la base de datos', e);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const entrar = useCallback((u: Usuario) => setUsuario(u), []);
  const salir = useCallback(async () => {
    await cerrarSesion();
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, cargando, entrar, salir }), [usuario, cargando, entrar, salir]);
  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion(): SesionContextoTipo {
  const ctx = useContext(SesionContexto);
  if (!ctx) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return ctx;
}
