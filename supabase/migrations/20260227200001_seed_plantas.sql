-- ============================================================================
-- SEED: Plantas de presentación
-- ============================================================================

-- ─── CREAR TABLA ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plantas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  direccion TEXT,
  ciudad TEXT,
  region TEXT,
  telefono TEXT,
  contacto TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_plantas_activo ON plantas(activo);

-- ─── INSERTAR PLANTAS ────────────────────────────────────────────────────────
INSERT INTO plantas (nombre) VALUES
  ('AGRICOM'),
  ('AGROVISION'),
  ('ARICA'),
  ('AURORA AUSTRALIS'),
  ('CABRINI + CURIMON'),
  ('CENFRUT'),
  ('CENFRUT + FRUTIZANO'),
  ('CENFRUT-FRUTIZANO'),
  ('CENKIWI'),
  ('CENLINARES'),
  ('COPEFRUT'),
  ('CURACAVI'),
  ('FRUGOOD'),
  ('FRUTASOL'),
  ('FRUTIZANO'),
  ('FRUTIZANO + CENFRUT'),
  ('HILVILLA GROUP'),
  ('JAIME SOLER'),
  ('JOTRISA'),
  ('LINARES'),
  ('LISONJERA'),
  ('PACKING SAN JAVIER'),
  ('PPS'),
  ('QFG+FRUTIZANO'),
  ('RED & BLUE'),
  ('ROQUEFORT-MOLINA'),
  ('SAN CRISTOBAL'),
  ('TENO PACK')
ON CONFLICT (nombre) DO NOTHING;
