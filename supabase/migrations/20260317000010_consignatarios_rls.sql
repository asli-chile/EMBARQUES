-- ============================================================================
-- RLS para consignatarios
-- superadmin/admin: full access
-- ejecutivo/operador: solo lectura
-- cliente: sin acceso (los consignatarios son info interna de ASLI)
-- ============================================================================

ALTER TABLE public.consignatarios ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at (por si no existe)
CREATE OR REPLACE FUNCTION public.set_consignatarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS consignatarios_updated_at ON public.consignatarios;
CREATE TRIGGER consignatarios_updated_at
  BEFORE UPDATE ON public.consignatarios
  FOR EACH ROW EXECUTE FUNCTION public.set_consignatarios_updated_at();

-- ─── Políticas ──────────────────────────────────────────────────────────────

-- Lectura pública heredada: hay que QUITARLA, no basta con agregar las de abajo.
--
-- Esta línea faltaba y el archivo entero quedó sirviendo de coartada: se aplicó,
-- dejó RLS activo y tres políticas correctas, y la tabla siguió leyéndose entera
-- sin sesión con la anon key. Las políticas se **suman**: una sola con
-- `USING (true)` para el rol `public` anula a todas las demás.
--
-- Se repite acá y en 20260915000002 a propósito: el que corra este archivo solo
-- tiene que quedar con la tabla cerrada, sin depender de acordarse del otro.
DROP POLICY IF EXISTS "Lectura pública consignatarios" ON public.consignatarios;

-- Superadmin y admin: acceso total
DROP POLICY IF EXISTS "consignatarios_admin_all" ON public.consignatarios;
CREATE POLICY "consignatarios_admin_all"
  ON public.consignatarios
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin')
        AND u.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin')
        AND u.activo = true
    )
  );

-- Ejecutivo y operador: solo lectura
DROP POLICY IF EXISTS "consignatarios_ejecutivo_read" ON public.consignatarios;
CREATE POLICY "consignatarios_ejecutivo_read"
  ON public.consignatarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('ejecutivo', 'operador')
        AND u.activo = true
    )
  );

-- Grants
--
-- `anon` no debe tener ninguno: es la primera capa y PostgREST corta ahí, antes
-- de mirar RLS. Sin este REVOKE, la tabla queda dependiendo de que ninguna
-- política futura la exponga por descuido.
REVOKE ALL ON public.consignatarios FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignatarios TO authenticated;
