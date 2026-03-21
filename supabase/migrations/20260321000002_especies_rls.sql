-- =============================================================
-- ESPECIES: permisos y RLS
-- Ejecutar en Supabase SQL Editor
-- =============================================================

-- 1. Grants base a todos los roles de Supabase
GRANT ALL ON public.especies TO postgres;
GRANT ALL ON public.especies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.especies TO authenticated;
GRANT SELECT ON public.especies TO anon;

-- 2. Habilitar RLS
ALTER TABLE public.especies ENABLE ROW LEVEL SECURITY;

-- 3. Borrar políticas previas si existen (por si acaso)
DROP POLICY IF EXISTS "especies_select" ON public.especies;
DROP POLICY IF EXISTS "especies_write" ON public.especies;

-- 4. Política de lectura: todos los usuarios activos
CREATE POLICY "especies_select" ON public.especies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.activo = true
    )
  );

-- 5. Política de escritura: superadmin, admin y ejecutivo
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
