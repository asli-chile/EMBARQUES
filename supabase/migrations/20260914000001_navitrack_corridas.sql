-- Registro de cada corrida del chequeo diario.
--
-- El chequeo cuenta lo que hizo por correo. Eso deja un hueco: si el correo es
-- justamente lo que falla, la corrida se ve idéntica a un cron que no corrió
-- —no hay nada que mirar— y la única forma de averiguarlo era volver a
-- ejecutarla, que cuesta una consulta por nave.
--
-- Esta tabla es ese "nada que mirar". Una fila por corrida, con o sin novedades.

CREATE TABLE IF NOT EXISTS public.navitrack_corridas (
  id              bigserial PRIMARY KEY,
  corrida_at      timestamptz NOT NULL DEFAULT now(),
  es_prueba       boolean     NOT NULL DEFAULT false,
  -- Naves en la lista blanca al momento de correr, y cuántas se llegaron a consultar.
  seguidas        integer     NOT NULL DEFAULT 0,
  revisadas       integer     NOT NULL DEFAULT 0,
  creditos        integer     NOT NULL DEFAULT 0,
  errores         integer     NOT NULL DEFAULT 0,
  correos         integer     NOT NULL DEFAULT 0,
  -- Lo que el correo no puede contar, porque es el correo el que falló.
  reporte_enviado boolean     NOT NULL DEFAULT false,
  fallo_correo    text,
  saldo           integer,
  -- Naves sin respuesta con su motivo, traspasos, recaladas por verificar.
  detalle         jsonb       NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.navitrack_corridas IS
  'Una fila por corrida del chequeo diario. Existe para poder responder "¿qué pasó anoche?" sin volver a gastar créditos.';

CREATE INDEX IF NOT EXISTS navitrack_corridas_fecha_idx
  ON public.navitrack_corridas (corrida_at DESC);

ALTER TABLE public.navitrack_corridas ENABLE ROW LEVEL SECURITY;

-- La escribe el cron con service_role, que no pasa por RLS. Acá solo se define
-- quién puede leerla: es diagnóstico del sistema, no información de embarques.
DROP POLICY IF EXISTS "navitrack_corridas_superadmin_read" ON public.navitrack_corridas;
CREATE POLICY "navitrack_corridas_superadmin_read" ON public.navitrack_corridas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'superadmin' AND u.activo = true
    )
  );

GRANT SELECT ON public.navitrack_corridas TO authenticated;
GRANT ALL ON public.navitrack_corridas TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.navitrack_corridas_id_seq TO service_role;
