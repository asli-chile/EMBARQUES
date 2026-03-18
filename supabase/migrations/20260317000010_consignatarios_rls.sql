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

-- Superadmin y admin: acceso total
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignatarios TO authenticated;
