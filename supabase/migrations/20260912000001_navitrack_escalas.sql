-- ─── NaviTrack: historial de escalas (port calls) ────────────────────────────
--
-- Es el dato que al ERP le faltaba para contar el viaje completo: hasta ahora la
-- línea de tiempo solo tenía stacking, corte documental, zarpe y arribo, porque
-- las escalas intermedias no se registran en ninguna parte.
--
-- La consulta al proveedor es cara: su documentación se contradice entre 1 y 5
-- créditos, así que el sistema asume 5 y guarda el resultado. Las escalas además
-- cambian poco —un buque no toca puerto cada hora—, por lo que el caché vive
-- mucho más que el de posiciones.

CREATE TABLE IF NOT EXISTS public.navitrack_escalas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- IMO o MMSI tal como se envió al proveedor.
  identificador text NOT NULL,
  nave_id uuid REFERENCES public.naves(id) ON DELETE SET NULL,
  nave_nombre text,
  -- Nombre del puerto tal como lo entrega el proveedor ("Hamburg, Germany").
  puerto text,
  -- UN/LOCODE: DEHAM, CLSAI...
  locode text,
  arribo timestamptz,
  zarpe timestamptz,
  -- Momento de la consulta que trajo esta escala; define si el caché está viejo.
  consultado_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.navitrack_escalas IS
  'Escalas (port calls) de cada buque según el proveedor AIS. Alimenta la pestaña Escalas y la línea de tiempo.';

-- Una misma escala no debe duplicarse al volver a consultar.
CREATE UNIQUE INDEX IF NOT EXISTS navitrack_escalas_unica_idx
  ON public.navitrack_escalas (identificador, coalesce(locode, ''), coalesce(arribo, 'epoch'::timestamptz));

CREATE INDEX IF NOT EXISTS navitrack_escalas_ident_idx
  ON public.navitrack_escalas (identificador, arribo DESC);

ALTER TABLE public.navitrack_escalas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "navitrack_escalas_superadmin_all" ON public.navitrack_escalas;
CREATE POLICY "navitrack_escalas_superadmin_all" ON public.navitrack_escalas
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

DROP POLICY IF EXISTS "navitrack_escalas_staff_read" ON public.navitrack_escalas;
CREATE POLICY "navitrack_escalas_staff_read" ON public.navitrack_escalas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  );

GRANT SELECT, INSERT ON public.navitrack_escalas TO authenticated;
GRANT ALL ON public.navitrack_escalas TO service_role;

-- El registro de créditos ahora distingue también las consultas de escalas.
ALTER TABLE public.navitrack_ais_lecturas
  DROP CONSTRAINT IF EXISTS navitrack_ais_lecturas_tipo_check;

ALTER TABLE public.navitrack_ais_lecturas
  ADD CONSTRAINT navitrack_ais_lecturas_tipo_check
  CHECK (tipo IN ('posicion', 'busqueda', 'escalas'));

-- Verificación:
-- SELECT identificador, count(*) FROM public.navitrack_escalas GROUP BY identificador;
