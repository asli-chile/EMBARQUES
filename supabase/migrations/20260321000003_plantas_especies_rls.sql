-- =============================================================
-- PLANTAS y ESPECIES: grants + RLS
-- Ejecutar en Supabase SQL Editor
-- =============================================================

-- ---- PLANTAS ----
GRANT ALL ON public.plantas TO postgres;
GRANT ALL ON public.plantas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantas TO authenticated;
GRANT SELECT ON public.plantas TO anon;

ALTER TABLE public.plantas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plantas_select" ON public.plantas;
DROP POLICY IF EXISTS "plantas_write" ON public.plantas;

CREATE POLICY "plantas_select" ON public.plantas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.activo = true
    )
  );

CREATE POLICY "plantas_write" ON public.plantas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin', 'ejecutivo')
        AND u.activo = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin', 'ejecutivo')
        AND u.activo = true
    )
  );

-- ---- ESPECIES ----
GRANT ALL ON public.especies TO postgres;
GRANT ALL ON public.especies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.especies TO authenticated;
GRANT SELECT ON public.especies TO anon;

ALTER TABLE public.especies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "especies_select" ON public.especies;
DROP POLICY IF EXISTS "especies_write" ON public.especies;

CREATE POLICY "especies_select" ON public.especies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.activo = true
    )
  );

CREATE POLICY "especies_write" ON public.especies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin', 'ejecutivo')
        AND u.activo = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin', 'ejecutivo')
        AND u.activo = true
    )
  );
