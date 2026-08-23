-- Historial de cambios manuales sobre operaciones (quién / qué / cuándo)
CREATE TABLE IF NOT EXISTS public.operaciones_cambios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacion_id uuid NOT NULL REFERENCES public.operaciones(id) ON DELETE CASCADE,
  campo text NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  usuario_auth_id uuid,
  usuario_nombre text,
  usuario_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operaciones_cambios_operacion_id_idx
  ON public.operaciones_cambios (operacion_id, created_at DESC);

CREATE INDEX IF NOT EXISTS operaciones_cambios_usuario_auth_id_idx
  ON public.operaciones_cambios (usuario_auth_id, created_at DESC);

COMMENT ON TABLE public.operaciones_cambios IS
  'Auditoría de ediciones manuales (p. ej. inline en Mis reservas): campo, valor previo/nuevo y autor.';

ALTER TABLE public.operaciones_cambios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff y ejecutivo leen cambios operaciones" ON public.operaciones_cambios;
CREATE POLICY "Staff y ejecutivo leen cambios operaciones"
  ON public.operaciones_cambios FOR SELECT TO authenticated
  USING (
    private.is_admin_or_staff()
    OR (
      private.is_ejecutivo()
      AND EXISTS (
        SELECT 1 FROM public.operaciones o
        WHERE o.id = operaciones_cambios.operacion_id
          AND o.cliente IS NOT NULL
          AND o.cliente = ANY (private.get_cliente_nombres_for_user())
      )
    )
  );

DROP POLICY IF EXISTS "Staff y ejecutivo insertan cambios operaciones" ON public.operaciones_cambios;
CREATE POLICY "Staff y ejecutivo insertan cambios operaciones"
  ON public.operaciones_cambios FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin_or_staff()
    OR (
      private.is_ejecutivo()
      AND EXISTS (
        SELECT 1 FROM public.operaciones o
        WHERE o.id = operaciones_cambios.operacion_id
          AND o.cliente IS NOT NULL
          AND o.cliente = ANY (private.get_cliente_nombres_for_user())
      )
    )
  );

GRANT SELECT, INSERT ON public.operaciones_cambios TO authenticated;
