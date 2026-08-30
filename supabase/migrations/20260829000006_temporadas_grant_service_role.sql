-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos de service_role sobre las tablas de temporadas
--
-- Las migraciones 20260829000004 y 20260829000005 solo otorgaron permisos a
-- `authenticated`, así que los scripts y endpoints que usan la service key
-- recibían "permission denied for table temporadas".
--
-- service_role omite RLS, por lo que basta con el GRANT (mismo criterio que
-- 20260412120000_operaciones_grant_service_role.sql).
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.temporadas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.temporadas_correlativos TO service_role;

GRANT EXECUTE ON FUNCTION private.temporadas_una_activa() TO service_role;
GRANT EXECUTE ON FUNCTION private.siguiente_correlativo(text) TO service_role;
GRANT EXECUTE ON FUNCTION private.operaciones_correlativo_temporada() TO service_role;
