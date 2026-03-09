-- Servicios únicos (por naviera): nombre, naviera, puerto origen, naves y destinos
-- Consorcios: agrupación de servicios únicos
-- Usa la tabla existente navieras(id, nombre)

-- Servicios únicos
CREATE TABLE IF NOT EXISTS public.servicios_unicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  naviera_id uuid NOT NULL REFERENCES public.navieras(id) ON DELETE RESTRICT,
  puerto_origen text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_servicios_unicos_naviera ON public.servicios_unicos(naviera_id);
CREATE INDEX IF NOT EXISTS idx_servicios_unicos_nombre ON public.servicios_unicos(nombre);

-- Naves por servicio (nombre de nave, orden)
CREATE TABLE IF NOT EXISTS public.servicios_unicos_naves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_unico_id uuid NOT NULL REFERENCES public.servicios_unicos(id) ON DELETE CASCADE,
  nave_nombre text NOT NULL DEFAULT '',
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_servicios_unicos_naves_servicio ON public.servicios_unicos_naves(servicio_unico_id);

-- Destinos por servicio (puerto, área)
CREATE TABLE IF NOT EXISTS public.servicios_unicos_destinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_unico_id uuid NOT NULL REFERENCES public.servicios_unicos(id) ON DELETE CASCADE,
  puerto text NOT NULL DEFAULT '',
  puerto_nombre text,
  area text,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_servicios_unicos_destinos_servicio ON public.servicios_unicos_destinos(servicio_unico_id);

-- Consorcios (agrupación de servicios)
CREATE TABLE IF NOT EXISTS public.consorcios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consorcios_nombre ON public.consorcios(nombre);

-- Relación consorcio ↔ servicios únicos
CREATE TABLE IF NOT EXISTS public.consorcios_servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consorcio_id uuid NOT NULL REFERENCES public.consorcios(id) ON DELETE CASCADE,
  servicio_unico_id uuid NOT NULL REFERENCES public.servicios_unicos(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(consorcio_id, servicio_unico_id)
);

CREATE INDEX IF NOT EXISTS idx_consorcios_servicios_consorcio ON public.consorcios_servicios(consorcio_id);
CREATE INDEX IF NOT EXISTS idx_consorcios_servicios_servicio ON public.consorcios_servicios(servicio_unico_id);

-- RLS y políticas (solo lectura para anon si se necesita; admin con service role)
ALTER TABLE public.servicios_unicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios_unicos_naves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios_unicos_destinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consorcios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consorcios_servicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Servicios únicos SELECT authenticated" ON public.servicios_unicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Servicios únicos ALL service role" ON public.servicios_unicos FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Servicios únicos naves SELECT authenticated" ON public.servicios_unicos_naves FOR SELECT TO authenticated USING (true);
CREATE POLICY "Servicios únicos naves ALL service role" ON public.servicios_unicos_naves FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Servicios únicos destinos SELECT authenticated" ON public.servicios_unicos_destinos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Servicios únicos destinos ALL service role" ON public.servicios_unicos_destinos FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Consorcios SELECT authenticated" ON public.consorcios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Consorcios ALL service role" ON public.consorcios FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Consorcios servicios SELECT authenticated" ON public.consorcios_servicios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Consorcios servicios ALL service role" ON public.consorcios_servicios FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Permisos a nivel de tabla (necesarios además de RLS)
GRANT SELECT ON public.servicios_unicos TO authenticated;
GRANT SELECT ON public.servicios_unicos_naves TO authenticated;
GRANT SELECT ON public.servicios_unicos_destinos TO authenticated;
GRANT SELECT ON public.consorcios TO authenticated;
GRANT SELECT ON public.consorcios_servicios TO authenticated;
GRANT ALL ON public.servicios_unicos TO service_role;
GRANT ALL ON public.servicios_unicos_naves TO service_role;
GRANT ALL ON public.servicios_unicos_destinos TO service_role;
GRANT ALL ON public.consorcios TO service_role;
GRANT ALL ON public.consorcios_servicios TO service_role;

-- Triggers updated_at
DROP TRIGGER IF EXISTS servicios_unicos_updated_at ON public.servicios_unicos;
CREATE TRIGGER servicios_unicos_updated_at
  BEFORE UPDATE ON public.servicios_unicos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS consorcios_updated_at ON public.consorcios;
CREATE TRIGGER consorcios_updated_at
  BEFORE UPDATE ON public.consorcios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
