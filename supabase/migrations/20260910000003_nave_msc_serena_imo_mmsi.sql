-- IMO + MMSI para MSC SERENA (catálogo naves).

ALTER TABLE public.naves
  ADD COLUMN IF NOT EXISTS mmsi text NULL;

COMMENT ON COLUMN public.naves.imo IS 'Número IMO del buque (7 dígitos)';
COMMENT ON COLUMN public.naves.mmsi IS 'MMSI del buque (9 dígitos), para consultas AIS';

UPDATE public.naves
SET
  imo = '1013169',
  mmsi = '636025511',
  activo = true,
  modo_transporte = 'maritimo'
WHERE nombre = 'MSC SERENA';
