-- ============================================================================
-- Tarifarios — Tarifas de flete para clientes (cabecera + filas)
-- ============================================================================

-- ─── CABECERA DEL TARIFARIO ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tarifarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      text,                         -- Nombre de referencia (opcional)
  cliente     text NOT NULL,                -- Empresa cliente
  servicio    text,                         -- "Marítimo", "Aéreo", etc.
  pol         text,                         -- Puerto(s) de carga
  pod         text,                         -- Puerto(s) de destino
  producto    text,                         -- "Kiwi", "Uva", "Cereza", etc.
  notas       text,                         -- Notas/leyenda al pie (texto libre)
  activo      boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tarifarios_cliente    ON public.tarifarios (cliente);
CREATE INDEX IF NOT EXISTS idx_tarifarios_activo     ON public.tarifarios (activo);
CREATE INDEX IF NOT EXISTS idx_tarifarios_created_at ON public.tarifarios (created_at DESC);

-- ─── FILAS DEL TARIFARIO ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tarifarios_filas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarifario_id    uuid NOT NULL REFERENCES public.tarifarios(id) ON DELETE CASCADE,
  naviera         text,
  pol             text,
  pod             text,
  publica         numeric,                  -- Tarifa pública (USD)
  neta            numeric,                  -- Tarifa neta (USD)
  vd              numeric,                  -- VD
  gate_out        text,                     -- Puede ser "VER NOTA" u otro texto
  recargos        text,                     -- Recargos en destino (collect) — texto largo
  tt              integer,                  -- Transit time (días)
  t1              text,                     -- Puerto de transbordo 1
  t2              text,                     -- Puerto de transbordo 2
  servicio        text,                     -- Código servicio naviero (ej: SA8, WSA1)
  dias_libres_origen text,
  demurrage       text,
  detention       text,
  moneda          text NOT NULL DEFAULT 'USD',
  desde           date,
  hasta           date,
  observaciones   text,
  orden           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tarifarios_filas_tarifario ON public.tarifarios_filas (tarifario_id);
CREATE INDEX IF NOT EXISTS idx_tarifarios_filas_orden     ON public.tarifarios_filas (tarifario_id, orden);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.tarifarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarifarios_filas ENABLE ROW LEVEL SECURITY;

-- Lectura para todos los usuarios autenticados
CREATE POLICY "tarifarios_select_auth" ON public.tarifarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tarifarios_filas_select_auth" ON public.tarifarios_filas
  FOR SELECT TO authenticated USING (true);

-- Gestión completa para admin y superior
CREATE POLICY "tarifarios_all_admin" ON public.tarifarios
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin','admin','ejecutivo')
        AND u.activo = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin','admin','ejecutivo')
        AND u.activo = true)
  );

CREATE POLICY "tarifarios_filas_all_admin" ON public.tarifarios_filas
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin','admin','ejecutivo')
        AND u.activo = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin','admin','ejecutivo')
        AND u.activo = true)
  );

-- ─── GRANTS ─────────────────────────────────────────────────────────────────
GRANT ALL ON public.tarifarios       TO service_role;
GRANT ALL ON public.tarifarios_filas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarifarios       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarifarios_filas TO authenticated;

-- ─── TRIGGER updated_at ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tarifarios_updated_at ON public.tarifarios;
CREATE TRIGGER tarifarios_updated_at
  BEFORE UPDATE ON public.tarifarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
