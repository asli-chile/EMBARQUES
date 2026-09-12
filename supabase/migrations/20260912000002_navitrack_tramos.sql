-- ─── Tramos del viaje: soporte real de transbordo ────────────────────────────
--
-- `operaciones` guarda un solo buque (`nave`, `viaje`). Eso alcanza mientras la
-- carga viaja directo, pero no permite representar lo que realmente pasa en un
-- transbordo: primer tramo en el buque A hasta el puerto de conexión, segundo
-- tramo en el buque B hasta el destino final.
--
-- Esta tabla agrega esos tramos sin tocar `operaciones`, que está en producción
-- y la usan todos los módulos. La regla de lectura es:
--
--   sin filas aquí  -> viaje directo, vale lo que dice `operaciones`
--   con filas aquí  -> el viaje son estos tramos, en orden
--
-- El tramo 1 se crea copiando lo que ya hay en la operación, de modo que nada
-- se pierda al convertir un viaje directo en uno con transbordo.

CREATE TABLE IF NOT EXISTS public.navitrack_tramos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operacion_id uuid NOT NULL REFERENCES public.operaciones(id) ON DELETE CASCADE,
  -- 1 es el primer tramo desde el puerto de embarque.
  orden smallint NOT NULL CHECK (orden >= 1),

  nave text,
  nave_id uuid REFERENCES public.naves(id) ON DELETE SET NULL,
  viaje text,

  -- Puertos de ESTE tramo: el pod del tramo 1 es el puerto de conexión.
  pol text,
  pod text,
  etd date,
  eta date,

  /*
   * De dónde salió el tramo:
   *   erp     copiado de la operación al crear la cadena
   *   ais     deducido de la señal del buque (destino declarado distinto al POD)
   *   manual  lo cargó una persona
   */
  origen text NOT NULL DEFAULT 'manual' CHECK (origen IN ('erp', 'ais', 'manual')),
  -- El tramo ocurrió de verdad, frente a uno todavía por confirmar.
  confirmado boolean NOT NULL DEFAULT false,
  notas text,

  creado_at timestamptz NOT NULL DEFAULT now(),
  creado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,

  UNIQUE (operacion_id, orden)
);

COMMENT ON TABLE public.navitrack_tramos IS
  'Tramos del viaje de una operación. Sin filas = viaje directo; con filas = cadena de buques (transbordo).';

COMMENT ON COLUMN public.navitrack_tramos.pod IS
  'Puerto de descarga de este tramo. En un tramo intermedio es el puerto de conexión.';

CREATE INDEX IF NOT EXISTS navitrack_tramos_operacion_idx
  ON public.navitrack_tramos (operacion_id, orden);

CREATE INDEX IF NOT EXISTS navitrack_tramos_nave_idx
  ON public.navitrack_tramos (nave_id)
  WHERE nave_id IS NOT NULL;

ALTER TABLE public.navitrack_tramos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "navitrack_tramos_superadmin_all" ON public.navitrack_tramos;
CREATE POLICY "navitrack_tramos_superadmin_all" ON public.navitrack_tramos
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

-- El personal interno necesita leerlos: un transbordo cambia la fecha de llegada
-- que se le promete al cliente, y eso lo consulta todo el equipo.
DROP POLICY IF EXISTS "navitrack_tramos_staff_read" ON public.navitrack_tramos;
CREATE POLICY "navitrack_tramos_staff_read" ON public.navitrack_tramos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.navitrack_tramos TO authenticated;
GRANT ALL ON public.navitrack_tramos TO service_role;

-- ─── La alerta de transbordo ahora puede apuntar al tramo que la resolvió ────
ALTER TABLE public.navitrack_transbordos
  ADD COLUMN IF NOT EXISTS tramo_id bigint REFERENCES public.navitrack_tramos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.navitrack_transbordos.tramo_id IS
  'Tramo creado al confirmar el transbordo. NULL si se descartó o aún no se registra el buque siguiente.';

-- Verificación:
-- SELECT o.ref_asli, t.orden, t.nave, t.pol, t.pod, t.confirmado
--   FROM public.navitrack_tramos t
--   JOIN public.operaciones o ON o.id = t.operacion_id
--  ORDER BY o.ref_asli, t.orden;
