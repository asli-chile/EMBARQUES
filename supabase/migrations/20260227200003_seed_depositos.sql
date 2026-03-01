-- ============================================================================
-- SEED: Depósitos
-- ============================================================================

-- ─── CREAR TABLA ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS depositos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  direccion TEXT,
  ciudad TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_depositos_activo ON depositos(activo);

-- ─── INSERTAR DEPÓSITOS ──────────────────────────────────────────────────────

INSERT INTO depositos (nombre) VALUES
  ('AGUNSA SAI'),
  ('AGUNSA VAP'),
  ('CONTOPSA SAI'),
  ('CONTOPSA SANTIAGO'),
  ('CONTOPSA STGO'),
  ('CONTOPSA VAP'),
  ('DP WORD'),
  ('DYC SAI'),
  ('DYC VAP'),
  ('MEDLOG SAI'),
  ('MEDLOG VAP'),
  ('SITRANS CURAUMA'),
  ('SITRANS SAI'),
  ('SITRANS VAP')
ON CONFLICT (nombre) DO NOTHING;
