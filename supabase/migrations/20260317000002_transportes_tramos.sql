-- ============================================================================
-- Transportes: empresas, choferes, equipos (camión/remolque) y tramos (punto a punto)
-- Requisito: choferes asociados a su empresa para filtrar por empresa seleccionada
-- ============================================================================

-- ─── EMPRESAS DE TRANSPORTE ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transportes_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  rut text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nombre)
);

CREATE INDEX IF NOT EXISTS idx_transportes_empresas_nombre
  ON public.transportes_empresas (nombre);

ALTER TABLE public.transportes_empresas ENABLE ROW LEVEL SECURITY;

-- ─── CHOFERES (asociados a empresa) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transportes_choferes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.transportes_empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  numero_chofer text,
  rut text,
  telefono text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transportes_choferes_empresa
  ON public.transportes_choferes (empresa_id);
CREATE INDEX IF NOT EXISTS idx_transportes_choferes_activo
  ON public.transportes_choferes (activo);

ALTER TABLE public.transportes_choferes ENABLE ROW LEVEL SECURITY;

-- ─── EQUIPOS / FLOTA (patente camión y remolque) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.transportes_equipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.transportes_empresas(id) ON DELETE CASCADE,
  patente_camion text NOT NULL,
  patente_remolque text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patente_camion)
);

CREATE INDEX IF NOT EXISTS idx_transportes_equipos_empresa
  ON public.transportes_equipos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_transportes_equipos_activo
  ON public.transportes_equipos (activo);

ALTER TABLE public.transportes_equipos ENABLE ROW LEVEL SECURITY;

-- ─── TRAMOS (punto a punto) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transportes_tramos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origen text NOT NULL,
  destino text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'CLP',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origen, destino, moneda)
);

CREATE INDEX IF NOT EXISTS idx_transportes_tramos_origen_destino
  ON public.transportes_tramos (origen, destino);
CREATE INDEX IF NOT EXISTS idx_transportes_tramos_activo
  ON public.transportes_tramos (activo);

ALTER TABLE public.transportes_tramos ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES ───────────────────────────────────────────────────────────

-- Lectura para usuarios autenticados (para poblar selects en formularios)
DROP POLICY IF EXISTS "Auth lee transportes_empresas" ON public.transportes_empresas;
CREATE POLICY "Auth lee transportes_empresas" ON public.transportes_empresas
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Auth lee transportes_choferes" ON public.transportes_choferes;
CREATE POLICY "Auth lee transportes_choferes" ON public.transportes_choferes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Auth lee transportes_equipos" ON public.transportes_equipos;
CREATE POLICY "Auth lee transportes_equipos" ON public.transportes_equipos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Auth lee transportes_tramos" ON public.transportes_tramos;
CREATE POLICY "Auth lee transportes_tramos" ON public.transportes_tramos
  FOR SELECT TO authenticated
  USING (true);

-- Gestión completa solo para staff (admin/ejecutivo/operador/usuario)
DROP POLICY IF EXISTS "Staff gestiona transportes_empresas" ON public.transportes_empresas;
CREATE POLICY "Staff gestiona transportes_empresas" ON public.transportes_empresas
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Staff gestiona transportes_choferes" ON public.transportes_choferes;
CREATE POLICY "Staff gestiona transportes_choferes" ON public.transportes_choferes
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Staff gestiona transportes_equipos" ON public.transportes_equipos;
CREATE POLICY "Staff gestiona transportes_equipos" ON public.transportes_equipos
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Staff gestiona transportes_tramos" ON public.transportes_tramos;
CREATE POLICY "Staff gestiona transportes_tramos" ON public.transportes_tramos
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- ─── GRANTS ────────────────────────────────────────────────────────────────

GRANT ALL ON public.transportes_empresas TO service_role;
GRANT ALL ON public.transportes_choferes TO service_role;
GRANT ALL ON public.transportes_equipos TO service_role;
GRANT ALL ON public.transportes_tramos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transportes_empresas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transportes_choferes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transportes_equipos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transportes_tramos TO authenticated;

-- ─── TRIGGERS updated_at ────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS transportes_empresas_updated_at ON public.transportes_empresas;
CREATE TRIGGER transportes_empresas_updated_at
  BEFORE UPDATE ON public.transportes_empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS transportes_choferes_updated_at ON public.transportes_choferes;
CREATE TRIGGER transportes_choferes_updated_at
  BEFORE UPDATE ON public.transportes_choferes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS transportes_equipos_updated_at ON public.transportes_equipos;
CREATE TRIGGER transportes_equipos_updated_at
  BEFORE UPDATE ON public.transportes_equipos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS transportes_tramos_updated_at ON public.transportes_tramos;
CREATE TRIGGER transportes_tramos_updated_at
  BEFORE UPDATE ON public.transportes_tramos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

