import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

export function useTemporadaActiva(): TemporadaActiva {
  const [temporadaActiva, setTemporadaActiva] = useState<string | null>(cache?.nombre ?? null);
  const [temporadaLoading, setTemporadaLoading] = useState(!cache);

  useEffect(() => {
    if (cache) {
      setTemporadaActiva(cache.nombre);
      setTemporadaLoading(false);
      return;
    }
    let vigente = true;
    void obtenerTemporadaActiva().then((nombre) => {
      if (!vigente) return;
      setTemporadaActiva(nombre);
      setTemporadaLoading(false);
    });
    return () => {
      vigente = false;
    };
  }, []);

  return { temporadaActiva, temporadaLoading };
}
