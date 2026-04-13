-- =========================================================
-- Sistema de notificaciones en tiempo real
-- =========================================================

-- Tabla principal de notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                  TEXT NOT NULL,                        -- 'nueva_reserva', 'nuevo_transporte', 'facturacion', 'nueva_factura_ext'
  titulo                TEXT NOT NULL,
  mensaje               TEXT NOT NULL,
  creado_por_auth_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_por_nombre     TEXT NOT NULL DEFAULT '',
  datos                 JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de notificaciones leídas por usuario (keyed por auth.users.id)
CREATE TABLE IF NOT EXISTS public.notificaciones_leidas (
  notificacion_id   UUID NOT NULL REFERENCES public.notificaciones(id) ON DELETE CASCADE,
  usuario_auth_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leido_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notificacion_id, usuario_auth_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at   ON public.notificaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leidas_usuario ON public.notificaciones_leidas(usuario_auth_id);

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.notificaciones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones_leidas ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer notificaciones
CREATE POLICY "notificaciones_select_auth" ON public.notificaciones
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Cualquier usuario autenticado puede insertar notificaciones
CREATE POLICY "notificaciones_insert_auth" ON public.notificaciones
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Cada usuario gestiona sus propias marcas de leído
CREATE POLICY "notif_leidas_select" ON public.notificaciones_leidas
  FOR SELECT USING (usuario_auth_id = auth.uid());

CREATE POLICY "notif_leidas_insert" ON public.notificaciones_leidas
  FOR INSERT WITH CHECK (usuario_auth_id = auth.uid());

CREATE POLICY "notif_leidas_delete" ON public.notificaciones_leidas
  FOR DELETE USING (usuario_auth_id = auth.uid());

-- =========================================================
-- Grants
-- =========================================================
GRANT SELECT, INSERT ON public.notificaciones        TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.notificaciones_leidas TO authenticated;

-- =========================================================
-- Habilitar Supabase Realtime para la tabla notificaciones
-- (imprescindible para que los INSERT disparen eventos en el cliente)
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
