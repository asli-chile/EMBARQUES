-- Asegura columnas IMO/MMSI en catálogo de naves (IMO pudo faltar si solo se corrió el seed de MMSI).
ALTER TABLE public.naves
  ADD COLUMN IF NOT EXISTS imo text NULL;

ALTER TABLE public.naves
  ADD COLUMN IF NOT EXISTS mmsi text NULL;

COMMENT ON COLUMN public.naves.imo IS 'Número IMO del buque (7 dígitos)';
COMMENT ON COLUMN public.naves.mmsi IS 'MMSI del buque (9 dígitos), para consultas AIS';
