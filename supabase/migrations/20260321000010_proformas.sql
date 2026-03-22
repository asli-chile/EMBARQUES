-- ── Tabla principal de proformas ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proformas (
  id                    uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  numero                text          UNIQUE,
  operacion_id          uuid          REFERENCES public.operaciones(id) ON DELETE SET NULL,
  ref_asli              text,
  fecha                 date          DEFAULT CURRENT_DATE,
  -- Exportador
  exportador            text,
  exportador_rut        text,
  exportador_direccion  text,
  -- Importador
  importador            text,
  importador_direccion  text,
  importador_pais       text,
  -- Embarque
  clausula_venta        text,
  moneda                text          DEFAULT 'USD',
  puerto_origen         text,
  puerto_destino        text,
  etd                   date,
  naviera               text,
  nave                  text,
  booking               text,
  -- Documentos
  dus                   text,
  csg                   text,
  csp                   text,
  -- Totales
  total_cajas           integer,
  total_kg_neto         numeric(14, 3),
  total_valor           numeric(14, 2),
  -- Extras
  observaciones         text,
  created_by            uuid,
  created_at            timestamptz   DEFAULT now(),
  updated_at            timestamptz   DEFAULT now(),
  deleted_at            timestamptz
);

-- ── Ítems (filas de mercadería) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proforma_items (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  proforma_id     uuid          NOT NULL REFERENCES public.proformas(id) ON DELETE CASCADE,
  orden           integer       DEFAULT 0,
  especie         text,
  variedad        text,
  calibre         text,
  kg_neto_caja    numeric(10, 3),
  cantidad_cajas  integer,
  kg_neto_total   numeric(14, 3),
  valor_caja      numeric(12, 4),
  valor_kilo      numeric(12, 4),
  valor_total     numeric(14, 2)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.proformas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proforma_items  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proformas_all_roles" ON public.proformas FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.auth_id = auth.uid() AND u.rol IN ('superadmin','admin','ejecutivo','operador') AND u.activo = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.auth_id = auth.uid() AND u.rol IN ('superadmin','admin','ejecutivo','operador') AND u.activo = true));

CREATE POLICY "proforma_items_all_roles" ON public.proforma_items FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.auth_id = auth.uid() AND u.rol IN ('superadmin','admin','ejecutivo','operador') AND u.activo = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.auth_id = auth.uid() AND u.rol IN ('superadmin','admin','ejecutivo','operador') AND u.activo = true));

-- ── Permisos ──────────────────────────────────────────────────────────────────
GRANT ALL ON public.proformas      TO postgres, service_role;
GRANT ALL ON public.proforma_items TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proformas      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proforma_items TO authenticated;
