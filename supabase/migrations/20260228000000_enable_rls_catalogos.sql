-- ============================================================================
-- Políticas de seguridad (RLS) para tablas de catálogos
-- Permite lectura pública para todos los catálogos del sistema
-- ============================================================================

-- ─── NAVIERAS ──────────────────────────────────────────────────────────────

ALTER TABLE navieras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de navieras" ON navieras;
CREATE POLICY "Permitir lectura pública de navieras" ON navieras
  FOR SELECT USING (true);

-- ─── NAVES ─────────────────────────────────────────────────────────────────

ALTER TABLE naves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de naves" ON naves;
CREATE POLICY "Permitir lectura pública de naves" ON naves
  FOR SELECT USING (true);

-- ─── NAVIERAS_NAVES ────────────────────────────────────────────────────────

ALTER TABLE navieras_naves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de navieras_naves" ON navieras_naves;
CREATE POLICY "Permitir lectura pública de navieras_naves" ON navieras_naves
  FOR SELECT USING (true);

-- ─── PLANTAS ───────────────────────────────────────────────────────────────

ALTER TABLE plantas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de plantas" ON plantas;
CREATE POLICY "Permitir lectura pública de plantas" ON plantas
  FOR SELECT USING (true);

-- ─── DEPOSITOS ─────────────────────────────────────────────────────────────

ALTER TABLE depositos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de depositos" ON depositos;
CREATE POLICY "Permitir lectura pública de depositos" ON depositos
  FOR SELECT USING (true);

-- ─── DESTINOS ──────────────────────────────────────────────────────────────

ALTER TABLE destinos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de destinos" ON destinos;
CREATE POLICY "Permitir lectura pública de destinos" ON destinos
  FOR SELECT USING (true);

-- ─── PUERTOS_ORIGEN ────────────────────────────────────────────────────────

ALTER TABLE puertos_origen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de puertos_origen" ON puertos_origen;
CREATE POLICY "Permitir lectura pública de puertos_origen" ON puertos_origen
  FOR SELECT USING (true);

-- ─── CONSIGNATARIOS ────────────────────────────────────────────────────────

ALTER TABLE consignatarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de consignatarios" ON consignatarios;
CREATE POLICY "Permitir lectura pública de consignatarios" ON consignatarios
  FOR SELECT USING (true);

-- ─── CATALOGOS ─────────────────────────────────────────────────────────────

ALTER TABLE catalogos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de catalogos" ON catalogos;
CREATE POLICY "Permitir lectura pública de catalogos" ON catalogos
  FOR SELECT USING (true);

-- ─── EMPRESAS ─────────────────────────────────────────────────────────────

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de empresas" ON empresas;
CREATE POLICY "Permitir lectura pública de empresas" ON empresas
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insertar empresas" ON empresas;
CREATE POLICY "Permitir insertar empresas" ON empresas
  FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT ON empresas TO anon;
GRANT SELECT, INSERT ON empresas TO authenticated;
