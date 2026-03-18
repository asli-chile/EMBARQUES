-- ──────────────────────────────────────────────────────────────────────────────
-- Tabla: formatos_documentos
-- Almacena plantillas HTML reutilizables con etiquetas dinámicas ({{campo}})
-- que se reemplazan automáticamente con los datos reales del sistema.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.formatos_documentos (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre       TEXT        NOT NULL,
  tipo         TEXT        NOT NULL DEFAULT 'otro'
                           CHECK (tipo IN (
                             'factura', 'proforma', 'instructivo',
                             'conocimiento_embarque', 'packing_list',
                             'certificado_origen', 'otro'
                           )),
  descripcion  TEXT,
  contenido_html TEXT      NOT NULL DEFAULT '',
  activo       BOOLEAN     NOT NULL DEFAULT true,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION public.set_formatos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_formatos_documentos_updated_at
  BEFORE UPDATE ON public.formatos_documentos
  FOR EACH ROW EXECUTE FUNCTION public.set_formatos_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.formatos_documentos ENABLE ROW LEVEL SECURITY;

-- Superadmin y admin: acceso total
CREATE POLICY "formatos_superadmin_admin_all"
  ON public.formatos_documentos
  FOR ALL
  TO authenticated
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
CREATE POLICY "formatos_ejecutivo_operador_read"
  ON public.formatos_documentos
  FOR SELECT
  TO authenticated
  USING (
    activo = true
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('ejecutivo', 'operador')
        AND u.activo = true
    )
  );

-- ── Grants ────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.formatos_documentos TO authenticated;

GRANT ALL ON public.formatos_documentos TO service_role;
