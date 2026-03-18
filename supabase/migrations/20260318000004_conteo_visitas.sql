-- ──────────────────────────────────────────────────────────────────────────────
-- Contador persistente de visitas a la página
-- Almacena el total acumulado de visitas (una por sesión de navegador).
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conteo_visitas (
  id         int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total      bigint NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.conteo_visitas (id, total) VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.conteo_visitas ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer el contador
CREATE POLICY "conteo_visitas_select_all" ON public.conteo_visitas
  FOR SELECT USING (true);

-- Solo la función RPC puede actualizar (via SECURITY DEFINER)
CREATE POLICY "conteo_visitas_update_none" ON public.conteo_visitas
  FOR UPDATE USING (false);

GRANT SELECT ON public.conteo_visitas TO anon, authenticated;

-- Función atómica para incrementar el contador y retornar el nuevo total
CREATE OR REPLACE FUNCTION public.incrementar_visitas()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE conteo_visitas
  SET total = total + 1,
      updated_at = now()
  WHERE id = 1
  RETURNING total;
$$;

GRANT EXECUTE ON FUNCTION public.incrementar_visitas() TO anon, authenticated;
