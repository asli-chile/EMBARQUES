-- ─────────────────────────────────────────────────────────────────────────────
-- Temporadas: catálogo con nombre libre y una única temporada activa
--
-- `operaciones.temporada` existía como texto libre (ver 20260422113000). Aquí se
-- crea el catálogo que la respalda para poder separar las operaciones por
-- temporada, nombrarlas a gusto y controlar el cambio de temporada activa.
--
-- Reglas:
--   • Solo superadmin crea, edita, elimina y cambia la temporada activa.
--   • Como máximo una temporada con `activa = true` (trigger la garantiza).
--   • La temporada activa es la que la app asigna a las operaciones nuevas.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.temporadas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL,
  descripcion  text,
  fecha_inicio date,
  fecha_fin    date,
  activa       boolean NOT NULL DEFAULT false,
  cerrada      boolean NOT NULL DEFAULT false,
  orden        integer,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.temporadas IS
  'Temporadas de exportación. El nombre es libre (ej. "2025-2026", "Cereza 2026") y se guarda en operaciones.temporada.';
COMMENT ON COLUMN public.temporadas.activa IS
  'Temporada en curso: se asigna por defecto a las operaciones nuevas. Solo una fila puede tenerla en true.';
COMMENT ON COLUMN public.temporadas.cerrada IS
  'Temporada cerrada: se mantiene visible para consulta histórica pero no debería recibir operaciones nuevas.';

CREATE UNIQUE INDEX IF NOT EXISTS temporadas_nombre_key
  ON public.temporadas (lower(btrim(nombre)));

-- Una sola temporada activa: al marcar una, se desmarcan las demás.
CREATE OR REPLACE FUNCTION private.temporadas_una_activa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.activa THEN
    UPDATE public.temporadas
       SET activa = false, updated_at = now()
     WHERE id <> NEW.id AND activa;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS temporadas_una_activa ON public.temporadas;
CREATE TRIGGER temporadas_una_activa
  BEFORE INSERT OR UPDATE ON public.temporadas
  FOR EACH ROW EXECUTE FUNCTION private.temporadas_una_activa();

-- ─── Datos iniciales ─────────────────────────────────────────────────────────
-- Todo lo cargado hasta hoy pertenece a la temporada 2025-2026.

INSERT INTO public.temporadas (nombre, descripcion, activa)
VALUES ('2025-2026', 'Temporada inicial: operaciones existentes al momento de crear el catálogo.', true)
ON CONFLICT (lower(btrim(nombre))) DO NOTHING;

UPDATE public.operaciones
   SET temporada = '2025-2026'
 WHERE temporada IS NULL OR btrim(temporada) = '';

-- Alinea los valores heredados del backfill anterior con el nombre del catálogo.
UPDATE public.operaciones o
   SET temporada = tmp.nombre
  FROM public.temporadas tmp
 WHERE lower(btrim(o.temporada)) = lower(btrim(tmp.nombre))
   AND o.temporada <> tmp.nombre;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.temporadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS temporadas_select_auth ON public.temporadas;
CREATE POLICY temporadas_select_auth
  ON public.temporadas FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS temporadas_write_superadmin ON public.temporadas;
CREATE POLICY temporadas_write_superadmin
  ON public.temporadas FOR ALL TO authenticated
  USING (private.is_superadmin())
  WITH CHECK (private.is_superadmin());

GRANT SELECT ON public.temporadas TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.temporadas TO authenticated;
GRANT EXECUTE ON FUNCTION private.temporadas_una_activa() TO authenticated;
