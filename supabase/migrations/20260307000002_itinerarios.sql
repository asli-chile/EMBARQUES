-- Tablas para el módulo de itinerarios marítimos
-- itinerarios: viajes con servicio, nave, ETD, POL
-- itinerario_escalas: puertos de escala con ETA y días de tránsito

CREATE TABLE IF NOT EXISTS public.itinerarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio text NOT NULL DEFAULT '',
  consorcio text,
  naviera text,
  nave text NOT NULL DEFAULT '',
  viaje text NOT NULL DEFAULT '',
  semana integer,
  pol text NOT NULL DEFAULT '',
  etd date,
  servicio_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.itinerario_escalas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerario_id uuid NOT NULL REFERENCES public.itinerarios(id) ON DELETE CASCADE,
  puerto text NOT NULL DEFAULT '',
  puerto_nombre text,
  eta date,
  dias_transito integer,
  orden integer NOT NULL DEFAULT 0,
  area text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itinerarios_etd ON public.itinerarios (etd);
CREATE INDEX IF NOT EXISTS idx_itinerarios_servicio ON public.itinerarios (servicio);
CREATE INDEX IF NOT EXISTS idx_itinerarios_pol ON public.itinerarios (pol);
CREATE INDEX IF NOT EXISTS idx_itinerario_escalas_itinerario ON public.itinerario_escalas (itinerario_id);
CREATE INDEX IF NOT EXISTS idx_itinerario_escalas_orden ON public.itinerario_escalas (itinerario_id, orden);

ALTER TABLE public.itinerarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerario_escalas ENABLE ROW LEVEL SECURITY;

-- Permisos de lectura para anon y authenticated
GRANT SELECT ON public.itinerarios TO anon;
GRANT SELECT ON public.itinerarios TO authenticated;
GRANT SELECT ON public.itinerario_escalas TO anon;
GRANT SELECT ON public.itinerario_escalas TO authenticated;

-- Lectura pública para la página de itinerarios (acceso sin login)
CREATE POLICY "Itinerarios lectura pública" ON public.itinerarios
  FOR SELECT
  USING (true);

CREATE POLICY "Itinerario escalas lectura pública" ON public.itinerario_escalas
  FOR SELECT
  USING (true);

-- Triggers de updated_at
DROP TRIGGER IF EXISTS itinerarios_updated_at ON public.itinerarios;
CREATE TRIGGER itinerarios_updated_at
  BEFORE UPDATE ON public.itinerarios
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS itinerario_escalas_updated_at ON public.itinerario_escalas;
CREATE TRIGGER itinerario_escalas_updated_at
  BEFORE UPDATE ON public.itinerario_escalas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
