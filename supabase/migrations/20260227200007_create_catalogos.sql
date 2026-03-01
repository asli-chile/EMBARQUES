-- ============================================================================
-- Catálogos del sistema (listas de valores)
-- ============================================================================

-- ─── CREAR TABLA ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS catalogos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  valor TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(categoria, valor)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_catalogos_categoria ON catalogos(categoria);
CREATE INDEX IF NOT EXISTS idx_catalogos_activo ON catalogos(activo);

-- ─── ESTADOS DE OPERACIÓN ────────────────────────────────────────────────────

INSERT INTO catalogos (categoria, valor, orden) VALUES
  ('estado_operacion', 'PENDIENTE', 1),
  ('estado_operacion', 'EN PROCESO', 2),
  ('estado_operacion', 'EN TRÁNSITO', 3),
  ('estado_operacion', 'ARRIBADO', 4),
  ('estado_operacion', 'COMPLETADO', 5),
  ('estado_operacion', 'CANCELADO', 6),
  ('estado_operacion', 'ROLEADO', 7)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ─── TIPOS DE OPERACIÓN ──────────────────────────────────────────────────────

INSERT INTO catalogos (categoria, valor, orden) VALUES
  ('tipo_operacion', 'EXPORTACIÓN', 1),
  ('tipo_operacion', 'IMPORTACIÓN', 2),
  ('tipo_operacion', 'TRIANGULACIÓN', 3),
  ('tipo_operacion', 'CABOTAJE', 4)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ─── INCOTERMS ───────────────────────────────────────────────────────────────

INSERT INTO catalogos (categoria, valor, descripcion, orden) VALUES
  ('incoterm', 'FOB', 'Free On Board - Libre a bordo', 1),
  ('incoterm', 'CIF', 'Cost, Insurance and Freight - Costo, seguro y flete', 2),
  ('incoterm', 'CFR', 'Cost and Freight - Costo y flete', 3),
  ('incoterm', 'EXW', 'Ex Works - En fábrica', 4),
  ('incoterm', 'FCA', 'Free Carrier - Franco transportista', 5),
  ('incoterm', 'CPT', 'Carriage Paid To - Transporte pagado hasta', 6),
  ('incoterm', 'CIP', 'Carriage and Insurance Paid To - Transporte y seguro pagados hasta', 7),
  ('incoterm', 'DAP', 'Delivered at Place - Entregado en lugar', 8),
  ('incoterm', 'DPU', 'Delivered at Place Unloaded - Entregado en lugar descargado', 9),
  ('incoterm', 'DDP', 'Delivered Duty Paid - Entregado con derechos pagados', 10)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ─── FORMAS DE PAGO ──────────────────────────────────────────────────────────

INSERT INTO catalogos (categoria, valor, descripcion, orden) VALUES
  ('forma_pago', 'PREPAID', 'Flete pagado en origen', 1),
  ('forma_pago', 'COLLECT', 'Flete pagado en destino', 2),
  ('forma_pago', 'PREPAID/COLLECT', 'Pago mixto', 3)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ─── TIPOS DE UNIDAD (CONTENEDORES) ──────────────────────────────────────────

INSERT INTO catalogos (categoria, valor, descripcion, orden) VALUES
  ('tipo_unidad', '40RF', 'Contenedor refrigerado 40 pies', 1),
  ('tipo_unidad', '40HC', 'Contenedor High Cube 40 pies', 2),
  ('tipo_unidad', '40DV', 'Contenedor Dry Van 40 pies', 3),
  ('tipo_unidad', '20RF', 'Contenedor refrigerado 20 pies', 4),
  ('tipo_unidad', '20DV', 'Contenedor Dry Van 20 pies', 5),
  ('tipo_unidad', '45HC', 'Contenedor High Cube 45 pies', 6)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ─── MONEDAS ─────────────────────────────────────────────────────────────────

INSERT INTO catalogos (categoria, valor, descripcion, orden) VALUES
  ('moneda', 'USD', 'Dólar estadounidense', 1),
  ('moneda', 'CLP', 'Peso chileno', 2),
  ('moneda', 'EUR', 'Euro', 3)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ─── PRIORIDADES ─────────────────────────────────────────────────────────────

INSERT INTO catalogos (categoria, valor, orden) VALUES
  ('prioridad', 'ALTA', 1),
  ('prioridad', 'MEDIA', 2),
  ('prioridad', 'BAJA', 3)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ─── VENTILACIÓN ─────────────────────────────────────────────────────────────

INSERT INTO catalogos (categoria, valor, orden) VALUES
  ('ventilacion', 'CERRADO', 1),
  ('ventilacion', '10 CBM/H', 2),
  ('ventilacion', '15 CBM/H', 3),
  ('ventilacion', '20 CBM/H', 4),
  ('ventilacion', '25 CBM/H', 5),
  ('ventilacion', '30 CBM/H', 6),
  ('ventilacion', '40 CBM/H', 7),
  ('ventilacion', '50 CBM/H', 8),
  ('ventilacion', 'ABIERTO', 9)
ON CONFLICT (categoria, valor) DO NOTHING;
