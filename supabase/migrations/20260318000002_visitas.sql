-- ──────────────────────────────────────────────────────────────────────────────
-- Tabla para conteo de visitas al sistema
-- Una fila por sesión de navegador (session_id único)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.visitas (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    text NOT NULL,
  created_at    timestamptz DEFAULT now() NOT NULL,
  es_autenticado boolean DEFAULT false NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS visitas_session_id_idx ON public.visitas(session_id);

ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

-- Cualquiera (anon + autenticado) puede registrar su visita
CREATE POLICY "visitas_insert_all" ON public.visitas
  FOR INSERT WITH CHECK (true);

-- Solo superadmin / admin pueden leer el conteo
CREATE POLICY "visitas_select_admin" ON public.visitas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin')
        AND u.activo = true
    )
  );
