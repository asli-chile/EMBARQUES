-- Distinguir carriers/naves marítimas vs aéreas
ALTER TABLE public.navieras
  ADD COLUMN IF NOT EXISTS modo_transporte text NOT NULL DEFAULT 'maritimo';

ALTER TABLE public.naves
  ADD COLUMN IF NOT EXISTS modo_transporte text NOT NULL DEFAULT 'maritimo';

ALTER TABLE public.navieras DROP CONSTRAINT IF EXISTS navieras_modo_transporte_check;
ALTER TABLE public.navieras
  ADD CONSTRAINT navieras_modo_transporte_check
  CHECK (modo_transporte IN ('maritimo', 'aereo'));

ALTER TABLE public.naves DROP CONSTRAINT IF EXISTS naves_modo_transporte_check;
ALTER TABLE public.naves
  ADD CONSTRAINT naves_modo_transporte_check
  CHECK (modo_transporte IN ('maritimo', 'aereo'));

CREATE INDEX IF NOT EXISTS idx_navieras_modo_transporte ON public.navieras (modo_transporte);
CREATE INDEX IF NOT EXISTS idx_naves_modo_transporte ON public.naves (modo_transporte);

COMMENT ON COLUMN public.navieras.modo_transporte IS 'maritimo = naviera; aereo = aerolínea';
COMMENT ON COLUMN public.naves.modo_transporte IS 'maritimo = buque; aereo = número/matricula de aeronave';
