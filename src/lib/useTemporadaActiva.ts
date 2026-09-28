import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Temporada activa del sistema. Los módulos operativos muestran solo las
 * operaciones de esta temporada; el histórico completo se consulta en Registros,
 * que tiene su propio selector.
 *
 * El valor se cachea en memoria para que cada módulo no repita la consulta al
 * navegar. `invalidarTemporadaActiva()` limpia la caché cuando se cambia la
 * temporada activa desde Configuración.
 */
let cache: { nombre: string | null } | null = null;
let enCurso: Promise<string | null> | null = null;

/**
 * Temporada fija por empresa (`empresas.temporada_fija`), cacheada en memoria
 * por nombre de empresa. Un cliente con temporada fija (p. ej. ASLI) la usa
 * siempre en su propio dashboard en vez de la temporada activa global: así
 * sus operaciones quedan fuera de los indicadores generales (temporada
 * distinta de la activa) pero completas al entrar con su propia cuenta.
 */
const cacheFijaPorEmpresa = new Map<string, string | null>();

async function obtenerTemporadaFijaEmpresa(nombreEmpresa: string): Promise<string | null> {
  if (cacheFijaPorEmpresa.has(nombreEmpresa)) return cacheFijaPorEmpresa.get(nombreEmpresa)!;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("empresas")
      .select("temporada_fija")
      .eq("nombre", nombreEmpresa)
      .maybeSingle();
    const valor = (data?.temporada_fija as string | null | undefined) ?? null;
    cacheFijaPorEmpresa.set(nombreEmpresa, valor);
    return valor;
  } catch {
    return null;
  }
}

export async function obtenerTemporadaActiva(): Promise<string | null> {
  if (cache) return cache.nombre;
  if (!enCurso) {
    enCurso = (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("temporadas")
          .select("nombre")
          .eq("activa", true)
          .maybeSingle();
        const nombre = (data?.nombre as string | undefined) ?? null;
        cache = { nombre };
        return nombre;
      } catch {
        cache = { nombre: null };
        return null;
      } finally {
        enCurso = null;
      }
    })();
  }
  return enCurso;
}

export function invalidarTemporadaActiva() {
  cache = null;
}

export type TemporadaActiva = {
  /** Nombre de la temporada activa, o null si no hay ninguna definida. */
  temporadaActiva: string | null;
  /** Mientras es true no hay que consultar operaciones: se mostraría el histórico completo. */
  temporadaLoading: boolean;
};

type UseTemporadaActivaOptions = {
  /** Si false, no consulta Supabase (p. ej. visitante sin sesión). */
  enabled?: boolean;
};

export function useTemporadaActiva(options?: UseTemporadaActivaOptions): TemporadaActiva {
  const enabled = options?.enabled ?? true;
  const { isCliente, empresaNombres } = useAuth();
  const [temporadaGlobal, setTemporadaGlobal] = useState<string | null>(
    enabled ? (cache?.nombre ?? null) : null
  );
  const [globalLoading, setGlobalLoading] = useState(enabled && !cache);

  useEffect(() => {
    if (!enabled) {
      setTemporadaGlobal(null);
      setGlobalLoading(false);
      return;
    }
    if (cache) {
      setTemporadaGlobal(cache.nombre);
      setGlobalLoading(false);
      return;
    }
    let vigente = true;
    void obtenerTemporadaActiva().then((nombre) => {
      if (!vigente) return;
      setTemporadaGlobal(nombre);
      setGlobalLoading(false);
    });
    return () => {
      vigente = false;
    };
  }, [enabled]);

  /* Solo se resuelve para un cliente con una única empresa asignada: con
     varias empresas sería ambiguo cuál temporada fija aplicar, y se usa la
     activa global como antes. */
  const empresaConTemporadaFija = enabled && isCliente && empresaNombres.length === 1 ? empresaNombres[0] : null;
  const [temporadaFija, setTemporadaFija] = useState<string | null>(null);
  const [fijaLoading, setFijaLoading] = useState(!!empresaConTemporadaFija);

  useEffect(() => {
    if (!empresaConTemporadaFija) {
      setTemporadaFija(null);
      setFijaLoading(false);
      return;
    }
    let vigente = true;
    setFijaLoading(true);
    void obtenerTemporadaFijaEmpresa(empresaConTemporadaFija).then((nombre) => {
      if (!vigente) return;
      setTemporadaFija(nombre);
      setFijaLoading(false);
    });
    return () => {
      vigente = false;
    };
  }, [empresaConTemporadaFija]);

  return {
    temporadaActiva: temporadaFija ?? temporadaGlobal,
    temporadaLoading: globalLoading || fijaLoading,
  };
}
