-- ============================================================================
-- SEED: Puertos de Origen (POL - Port of Loading)
-- ============================================================================

-- ─── CREAR TABLA ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS puertos_origen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  codigo TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_puertos_origen_activo ON puertos_origen(activo);

-- ─── INSERTAR PUERTOS DE ORIGEN ──────────────────────────────────────────────

INSERT INTO puertos_origen (nombre, codigo) VALUES
  ('VALPARAISO', 'VAP'),
  ('SAN ANTONIO', 'SAI'),
  ('LIRQUEN', 'LQN'),
  ('CORONEL', 'COR')
ON CONFLICT (nombre) DO NOTHING;
