-- Columnas adicionales para proformas
ALTER TABLE public.proformas
  ADD COLUMN IF NOT EXISTS contenedor       text,
  ADD COLUMN IF NOT EXISTS destino          text,
  ADD COLUMN IF NOT EXISTS consignee_uscc   text,
  ADD COLUMN IF NOT EXISTS total_kg_bruto   numeric(14, 3);

-- Columna kg_bruto_caja por ítem
ALTER TABLE public.proforma_items
  ADD COLUMN IF NOT EXISTS kg_bruto_caja    numeric(10, 3),
  ADD COLUMN IF NOT EXISTS kg_bruto_total   numeric(14, 3);
