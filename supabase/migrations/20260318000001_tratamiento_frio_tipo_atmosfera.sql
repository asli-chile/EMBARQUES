-- ============================================================================
-- Agrega columnas tratamiento_frio y tipo_atmosfera a operaciones
-- y sus respectivos valores en el catálogo
-- ============================================================================

-- ─── NUEVAS COLUMNAS EN OPERACIONES ─────────────────────────────────────────

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS tratamiento_frio TEXT,
  ADD COLUMN IF NOT EXISTS tratamiento_frio_o2 INTEGER,
  ADD COLUMN IF NOT EXISTS tratamiento_frio_co2 INTEGER,
  ADD COLUMN IF NOT EXISTS tipo_atmosfera TEXT;

-- ─── TRATAMIENTO DE FRÍO ────────────────────────────────────────────────────

INSERT INTO catalogos (categoria, valor, descripcion, orden) VALUES
  ('tratamiento_frio', 'SIN TRATAMIENTO',       'No requiere tratamiento de frío',               1),
  ('tratamiento_frio', 'COLD TREATMENT (USDA)',  'Tratamiento de frío exigido por USDA (EE.UU.)', 2),
  ('tratamiento_frio', 'COLD TREATMENT (APHIS)', 'Tratamiento de frío APHIS (EE.UU.)',            3),
  ('tratamiento_frio', 'PRE-COOLING',            'Pre-enfriamiento antes del embarque',           4)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ─── TIPO DE ATMÓSFERA (equipos reefer de navieras) ─────────────────────────

INSERT INTO catalogos (categoria, valor, descripcion, orden) VALUES
  ('tipo_atmosfera', 'ATMÓSFERA REGULAR',  'Sin control de atmósfera',                        1),
  ('tipo_atmosfera', 'CA DAIKIN',          'Atmósfera controlada — Daikin Active CA',          2),
  ('tipo_atmosfera', 'CA STARCOOL',        'Atmósfera controlada — Star Cool (MCI / Maersk)', 3),
  ('tipo_atmosfera', 'CA CARRIER',         'Atmósfera controlada — Carrier XtendFresh',       4),
  ('tipo_atmosfera', 'CA THERMO KING',     'Atmósfera controlada — Thermo King',              5),
  ('tipo_atmosfera', 'ATMÓSFERA MODIFICADA', 'Atmósfera modificada (MA)',                     6)
ON CONFLICT (categoria, valor) DO NOTHING;
