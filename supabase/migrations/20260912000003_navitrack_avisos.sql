-- ─── Avisos enviados por el chequeo diario ───────────────────────────────────
--
-- El cron revisa todos los días si el destino que declara el buque sigue
-- calzando con el POD comprometido. Sin registrar lo avisado, una desviación que
-- dura dos semanas generaría catorce correos idénticos.
--
-- Una fila por operación y tipo de aviso: si el dato que la motivó cambia (el
-- buque declara otro destino distinto), se vuelve a avisar.

CREATE TABLE IF NOT EXISTS public.navitrack_avisos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operacion_id uuid NOT NULL REFERENCES public.operaciones(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('desvio', 'retraso', 'arribo')),
  -- Valor que gatilló el aviso (ej. el destino declarado). Si cambia, se reenvía.
  detalle text,
  enviado_a text,
  enviado_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operacion_id, tipo, detalle)
);

COMMENT ON TABLE public.navitrack_avisos IS
  'Avisos ya enviados por el chequeo diario de NaviTrack. Evita repetir el mismo correo día tras día.';

CREATE INDEX IF NOT EXISTS navitrack_avisos_operacion_idx
  ON public.navitrack_avisos (operacion_id, tipo, enviado_at DESC);

ALTER TABLE public.navitrack_avisos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "navitrack_avisos_superadmin_all" ON public.navitrack_avisos;
CREATE POLICY "navitrack_avisos_superadmin_all" ON public.navitrack_avisos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'superadmin' AND u.activo = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'superadmin' AND u.activo = true
    )
  );

DROP POLICY IF EXISTS "navitrack_avisos_staff_read" ON public.navitrack_avisos;
CREATE POLICY "navitrack_avisos_staff_read" ON public.navitrack_avisos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  );

GRANT SELECT, INSERT ON public.navitrack_avisos TO authenticated;
GRANT ALL ON public.navitrack_avisos TO service_role;

-- Verificación:
-- SELECT o.ref_asli, a.tipo, a.detalle, a.enviado_at
--   FROM public.navitrack_avisos a JOIN public.operaciones o ON o.id = a.operacion_id
--  ORDER BY a.enviado_at DESC;
