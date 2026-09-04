-- Agenda de contactos para informativos (separada de public.usuarios)

CREATE TABLE IF NOT EXISTS public.informaciones_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT informaciones_grupos_nombre_unique UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS public.informaciones_contactos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text NOT NULL,
  empresa text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT informaciones_contactos_email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.informaciones_grupo_miembros (
  grupo_id uuid NOT NULL REFERENCES public.informaciones_grupos(id) ON DELETE CASCADE,
  contacto_id uuid NOT NULL REFERENCES public.informaciones_contactos(id) ON DELETE CASCADE,
  PRIMARY KEY (grupo_id, contacto_id)
);

CREATE INDEX IF NOT EXISTS idx_informaciones_contactos_email
  ON public.informaciones_contactos (email);
CREATE INDEX IF NOT EXISTS idx_informaciones_contactos_activo
  ON public.informaciones_contactos (activo);
CREATE INDEX IF NOT EXISTS idx_informaciones_grupo_miembros_contacto
  ON public.informaciones_grupo_miembros (contacto_id);

-- Normalizar email a minúsculas
CREATE OR REPLACE FUNCTION public.informaciones_contactos_normalize_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  NEW.nombre := trim(NEW.nombre);
  IF NEW.empresa IS NOT NULL THEN
    NEW.empresa := nullif(trim(NEW.empresa), '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_informaciones_contactos_normalize
  ON public.informaciones_contactos;
CREATE TRIGGER trg_informaciones_contactos_normalize
  BEFORE INSERT OR UPDATE ON public.informaciones_contactos
  FOR EACH ROW
  EXECUTE FUNCTION public.informaciones_contactos_normalize_email();

-- Staff ERP (incluye ejecutivo, igual que /comunicaciones/informativos)
CREATE OR REPLACE FUNCTION private.is_informaciones_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private
AS $$
  SELECT private.get_user_rol() IN ('superadmin', 'admin', 'operador', 'ejecutivo');
$$;

GRANT EXECUTE ON FUNCTION private.is_informaciones_staff() TO authenticated;

ALTER TABLE public.informaciones_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informaciones_contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informaciones_grupo_miembros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS informaciones_grupos_staff_all ON public.informaciones_grupos;
CREATE POLICY informaciones_grupos_staff_all
  ON public.informaciones_grupos
  FOR ALL
  TO authenticated
  USING (private.is_informaciones_staff())
  WITH CHECK (private.is_informaciones_staff());

DROP POLICY IF EXISTS informaciones_contactos_staff_all ON public.informaciones_contactos;
CREATE POLICY informaciones_contactos_staff_all
  ON public.informaciones_contactos
  FOR ALL
  TO authenticated
  USING (private.is_informaciones_staff())
  WITH CHECK (private.is_informaciones_staff());

DROP POLICY IF EXISTS informaciones_grupo_miembros_staff_all ON public.informaciones_grupo_miembros;
CREATE POLICY informaciones_grupo_miembros_staff_all
  ON public.informaciones_grupo_miembros
  FOR ALL
  TO authenticated
  USING (private.is_informaciones_staff())
  WITH CHECK (private.is_informaciones_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.informaciones_grupos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.informaciones_contactos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.informaciones_grupo_miembros TO authenticated;
GRANT ALL ON public.informaciones_grupos TO service_role;
GRANT ALL ON public.informaciones_contactos TO service_role;
GRANT ALL ON public.informaciones_grupo_miembros TO service_role;

INSERT INTO public.informaciones_grupos (nombre)
VALUES ('Informaciones ASLI')
ON CONFLICT (nombre) DO NOTHING;
