-- ─── TABLA: transportes_costos_extra ──────────────────────────────────────────
-- Costos adicionales del tarifario (no son tramos punto-a-punto)

CREATE TABLE IF NOT EXISTS public.transportes_costos_extra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto text NOT NULL,
  tarifa_valor numeric,
  tarifa_texto text,
  moneda text NOT NULL DEFAULT 'CLP',
  condicion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (concepto)
);

ALTER TABLE public.transportes_costos_extra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth lee transportes_costos_extra" ON public.transportes_costos_extra;
CREATE POLICY "Auth lee transportes_costos_extra" ON public.transportes_costos_extra
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Staff gestiona transportes_costos_extra" ON public.transportes_costos_extra;
CREATE POLICY "Staff gestiona transportes_costos_extra" ON public.transportes_costos_extra
  FOR ALL TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

GRANT ALL ON public.transportes_costos_extra TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transportes_costos_extra TO authenticated;

DROP TRIGGER IF EXISTS transportes_costos_extra_updated_at ON public.transportes_costos_extra;
CREATE TRIGGER transportes_costos_extra_updated_at
  BEFORE UPDATE ON public.transportes_costos_extra
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─── SEED: Tramos (Tarifario ASLI) ──────────────────────────────────────────
-- Origen → SAN ANTONIO y VALPARAÍSO con valores en CLP

INSERT INTO public.transportes_tramos (origen, destino, valor, moneda) VALUES
  ('CURICO',          'SAN ANTONIO',  650000, 'CLP'),
  ('CURICO',          'VALPARAISO',   710000, 'CLP'),
  ('ROMERAL',         'SAN ANTONIO',  650000, 'CLP'),
  ('ROMERAL',         'VALPARAISO',   710000, 'CLP'),
  ('RAUCO',           'SAN ANTONIO',  650000, 'CLP'),
  ('RAUCO',           'VALPARAISO',   710000, 'CLP'),
  ('TENO',            'SAN ANTONIO',  650000, 'CLP'),
  ('TENO',            'VALPARAISO',   710000, 'CLP'),
  ('SAGRADA FAMILIA', 'SAN ANTONIO',  670000, 'CLP'),
  ('SAGRADA FAMILIA', 'VALPARAISO',   750000, 'CLP'),
  ('MOLINA',          'SAN ANTONIO',  670000, 'CLP'),
  ('MOLINA',          'VALPARAISO',   750000, 'CLP'),
  ('SAN RAFAEL',      'SAN ANTONIO',  700000, 'CLP'),
  ('SAN RAFAEL',      'VALPARAISO',   790000, 'CLP'),
  ('TALCA',           'SAN ANTONIO',  740000, 'CLP'),
  ('TALCA',           'VALPARAISO',   810000, 'CLP'),
  ('LINARES',         'SAN ANTONIO',  820000, 'CLP'),
  ('LINARES',         'VALPARAISO',   900000, 'CLP'),
  ('CHILLAN',         'SAN ANTONIO', 1280000, 'CLP'),
  ('CHILLAN',         'VALPARAISO',  1330000, 'CLP'),
  ('LONGAVI',         'SAN ANTONIO',  870000, 'CLP'),
  ('LONGAVI',         'VALPARAISO',   940000, 'CLP'),
  ('GRANEROS',        'SAN ANTONIO',  580000, 'CLP'),
  ('GRANEROS',        'VALPARAISO',   640000, 'CLP'),
  ('RANCAGUA',        'SAN ANTONIO',  580000, 'CLP'),
  ('RANCAGUA',        'VALPARAISO',   640000, 'CLP')
ON CONFLICT (origen, destino, moneda) DO UPDATE
  SET valor = EXCLUDED.valor;

-- ─── SEED: Costos Extra ──────────────────────────────────────────────────────

INSERT INTO public.transportes_costos_extra (concepto, tarifa_valor, tarifa_texto, moneda, condicion) VALUES
  ('Cobertura de Seguro',                                       NULL,  'UF 5000',    'UF',  NULL),
  ('Conexión Reefer en Depósito',                               5000,  NULL,         'CLP', 'Por hora'),
  ('Falso Flete en Depósito (Export) o en Puerto (Import)',     80000,  NULL,         'CLP', NULL),
  ('Falso Flete en tránsito o Cliente',                         NULL,  'CASO A CASO','CLP', NULL),
  ('Sobre estadía en Planta',                                  12000,  NULL,         'CLP', '6 horas libres'),
  ('Multistop (de 0 a 30 kms)',                                50000,  NULL,         'CLP', 'Superior a 30 km se cobra adicional caso a caso'),
  ('Sobre estadía en Puerto',                                  12000,  NULL,         'CLP', '4 horas libres')
ON CONFLICT (concepto) DO UPDATE
  SET tarifa_valor = EXCLUDED.tarifa_valor,
      tarifa_texto = EXCLUDED.tarifa_texto,
      condicion = EXCLUDED.condicion;
