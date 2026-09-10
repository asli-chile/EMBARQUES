-- IMO + MMSI + catálogo para MSC BRUNELLA.

UPDATE public.naves
SET
  imo = '9702106',
  mmsi = '255806491',
  activo = true,
  modo_transporte = 'maritimo'
WHERE nombre = 'MSC BRUNELLA';
