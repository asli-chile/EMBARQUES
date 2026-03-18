-- ──────────────────────────────────────────────────────────────────────────────
-- Tabla para tracking de sesiones activas (online now)
-- Funciona para usuarios anónimos y autenticados via REST API
-- "Online" = last_seen en los últimos 3 minutos
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sesiones_activas (
  session_id     text PRIMARY KEY,
  last_seen      timestamptz DEFAULT now() NOT NULL,
  nombre         text NOT NULL DEFAULT 'Visitante',
  email          text NOT NULL DEFAULT '',
  rol            text NOT NULL DEFAULT 'visitante',
  es_autenticado boolean NOT NULL DEFAULT false
);

ALTER TABLE public.sesiones_activas ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede registrar / actualizar su sesión
CREATE POLICY "sesiones_insert_all" ON public.sesiones_activas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "sesiones_update_all" ON public.sesiones_activas
  FOR UPDATE USING (true) WITH CHECK (true);

-- Solo superadmin puede leer el listado
CREATE POLICY "sesiones_select_superadmin" ON public.sesiones_activas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol = 'superadmin'
        AND u.activo = true
    )
  );

-- CRÍTICO: grants explícitos para que el rol anon pueda insertar/actualizar
GRANT INSERT, UPDATE ON public.sesiones_activas TO anon;
GRANT INSERT, UPDATE, SELECT ON public.sesiones_activas TO authenticated;
