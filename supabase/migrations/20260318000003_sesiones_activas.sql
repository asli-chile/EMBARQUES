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

-- SELECT abierto: PostgREST requiere SELECT para que upsert (ON CONFLICT) funcione.
-- La restricción de quién ve el listado se aplica en el frontend (isSuperadmin).
CREATE POLICY "sesiones_select_all" ON public.sesiones_activas
  FOR SELECT USING (true);

GRANT SELECT, INSERT, UPDATE ON public.sesiones_activas TO anon;
GRANT SELECT, INSERT, UPDATE ON public.sesiones_activas TO authenticated;
