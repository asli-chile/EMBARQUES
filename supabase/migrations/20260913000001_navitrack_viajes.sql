-- ─── Cómo es el viaje, decidido por una persona ──────────────────────────────
--
-- Hasta ahora cada puerto anunciado se preguntaba por separado, y con razón: el
-- transbordo puede ocurrir en cualquier escala, así que responder por una no
-- dice nada de las siguientes.
--
-- Pero hay un caso en que sí se sabe de antemano: cuando el ejecutivo tiene el
-- booking a la vista y le consta que la carga viaja directa. Ahí seguir
-- preguntando en cada puerto es ruido, y el ruido termina en que nadie mira las
-- preguntas que sí importan.
--
--   directo         no hay transbordo en todo el viaje. Los puertos que el
--                   buque anuncie se registran directamente como paradas
--                   programadas, sin preguntar ni avisar.
--   con_transbordo  se sabe que la carga cambia de nave. Se sigue preguntando.
--
-- Sin fila aquí, el viaje es desconocido y se pregunta en cada puerto, que es
-- el comportamiento seguro por defecto.

CREATE TABLE IF NOT EXISTS public.navitrack_viajes (
  operacion_id uuid PRIMARY KEY REFERENCES public.operaciones(id) ON DELETE CASCADE,

  modo text NOT NULL CHECK (modo IN ('directo', 'con_transbordo')),

  -- Quién lo afirmó y cuándo. Marcar un viaje como directo silencia avisos
  -- futuros, así que tiene que poder discutirse después.
  decidido_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  decidido_at timestamptz NOT NULL DEFAULT now(),
  notas text
);

COMMENT ON TABLE public.navitrack_viajes IS
  'Cómo viaja la carga, según una persona: directo (no se vuelve a preguntar por cada puerto) o con transbordo.';

COMMENT ON COLUMN public.navitrack_viajes.modo IS
  'directo: los puertos anunciados se registran como paradas programadas sin preguntar. con_transbordo: se pregunta en cada uno.';

ALTER TABLE public.navitrack_viajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "navitrack_viajes_superadmin_all" ON public.navitrack_viajes;
CREATE POLICY "navitrack_viajes_superadmin_all" ON public.navitrack_viajes
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

DROP POLICY IF EXISTS "navitrack_viajes_staff_read" ON public.navitrack_viajes;
CREATE POLICY "navitrack_viajes_staff_read" ON public.navitrack_viajes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.navitrack_viajes TO authenticated;
GRANT ALL ON public.navitrack_viajes TO service_role;

-- Verificación:
-- SELECT o.contenedor, v.modo, v.decidido_at
--   FROM public.navitrack_viajes v JOIN public.operaciones o ON o.id = v.operacion_id;
