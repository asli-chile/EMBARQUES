-- ============================================================================
-- Condiciones de Carga
-- ============================================================================

-- ─── CREAR TABLA ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS condiciones_carga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  
  -- Tratamiento de frío
  tratamiento_frio BOOLEAN DEFAULT false,
  temperatura_frio DECIMAL(4,1),
  dias_tratamiento INTEGER,
  
  -- Atmósfera controlada
  atmosfera_controlada BOOLEAN DEFAULT false,
  o2_porcentaje DECIMAL(4,1),
  co2_porcentaje DECIMAL(4,1),
  
  -- Temperatura de transporte
  temperatura_transporte DECIMAL(4,1),
  ventilacion TEXT,
  humedad_relativa DECIMAL(4,1),
  
  -- Metadata
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_condiciones_carga_activo ON condiciones_carga(activo);

-- ─── INSERTAR EJEMPLOS COMUNES ───────────────────────────────────────────────

INSERT INTO condiciones_carga (
  nombre, 
  tratamiento_frio, temperatura_frio, dias_tratamiento,
  atmosfera_controlada, o2_porcentaje, co2_porcentaje,
  temperatura_transporte, ventilacion
) VALUES
  ('Cerezas China (con tratamiento)', true, -0.5, 16, false, NULL, NULL, -0.5, 'CERRADO'),
  ('Cerezas China (sin tratamiento)', false, NULL, NULL, false, NULL, NULL, -0.5, 'CERRADO'),
  ('Uva de mesa estándar', false, NULL, NULL, false, NULL, NULL, -0.5, '25 CBM/H'),
  ('Uva con atmósfera controlada', false, NULL, NULL, true, 5.0, 15.0, -0.5, 'CERRADO'),
  ('Arándanos estándar', false, NULL, NULL, false, NULL, NULL, 0.0, '25 CBM/H'),
  ('Kiwi estándar', false, NULL, NULL, false, NULL, NULL, 0.0, '25 CBM/H'),
  ('Kiwi con AC', false, NULL, NULL, true, 2.0, 5.0, 0.0, 'CERRADO'),
  ('Manzanas estándar', false, NULL, NULL, false, NULL, NULL, -0.5, '25 CBM/H'),
  ('Peras estándar', false, NULL, NULL, false, NULL, NULL, -0.5, '25 CBM/H'),
  ('Cítricos estándar', false, NULL, NULL, false, NULL, NULL, 4.0, '50 CBM/H'),
  ('Paltas/Aguacates', false, NULL, NULL, false, NULL, NULL, 5.0, '40 CBM/H')
ON CONFLICT (nombre) DO NOTHING;
