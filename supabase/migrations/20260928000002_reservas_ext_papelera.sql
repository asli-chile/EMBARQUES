-- Reservas externas a la papelera en vez de borrarlas.
--
-- Eliminar una reserva de transporte externo hacía DELETE: la fila
-- desaparecía sin pasar por la papelera de transportes, a diferencia de
-- Reserva ASLI, que solo marca `operaciones.transporte_deleted_at`. El
-- 28-09-2026 se perdió así la única reserva externa que había, sin forma de
-- recuperarla fuera de un respaldo de la base entera.
--
-- Ahora eliminar marca `deleted_at`; la papelera la muestra junto a las de
-- ASLI y desde ahí se restaura o se borra definitivamente.
--
-- Permisos: no cambian. "Staff gestiona transportes_reservas_ext" (ALL) ya
-- deja a los mismos usuarios hacer el UPDATE que reemplaza al DELETE, y
-- `authenticated` ya tiene el GRANT de UPDATE.

ALTER TABLE public.transportes_reservas_ext
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.transportes_reservas_ext.deleted_at IS
  'En la papelera de transportes desde esta fecha. NULL = reserva viva.';

-- La papelera lista solo las borradas; la pantalla, solo las vivas.
CREATE INDEX IF NOT EXISTS idx_transportes_reservas_ext_deleted_at
  ON public.transportes_reservas_ext (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Verificación: debe devolver una fila con data_type = timestamp with time zone.
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'transportes_reservas_ext'
--    AND column_name = 'deleted_at';
