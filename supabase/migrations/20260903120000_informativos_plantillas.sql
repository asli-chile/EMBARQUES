-- Plantillas de correos informativos ASLI (editor interno staff).

CREATE TABLE IF NOT EXISTS public.informativos_plantillas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  asunto text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS informativos_plantillas_updated_at_idx
  ON public.informativos_plantillas (updated_at DESC);

COMMENT ON TABLE public.informativos_plantillas IS
  'Plantillas HTML editables para informativos enviados desde informaciones@asli.cl';

CREATE OR REPLACE FUNCTION public.informativos_plantillas_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_informativos_plantillas_updated_at ON public.informativos_plantillas;
CREATE TRIGGER trg_informativos_plantillas_updated_at
  BEFORE UPDATE ON public.informativos_plantillas
  FOR EACH ROW
  EXECUTE FUNCTION public.informativos_plantillas_set_updated_at();

ALTER TABLE public.informativos_plantillas ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.informativos_plantillas TO authenticated;
GRANT ALL ON public.informativos_plantillas TO service_role;

DROP POLICY IF EXISTS "informativos_plantillas_staff_select" ON public.informativos_plantillas;
CREATE POLICY "informativos_plantillas_staff_select"
  ON public.informativos_plantillas FOR SELECT TO authenticated
  USING (
    private.get_user_rol() IN ('superadmin', 'admin', 'operador', 'ejecutivo')
  );

DROP POLICY IF EXISTS "informativos_plantillas_staff_insert" ON public.informativos_plantillas;
CREATE POLICY "informativos_plantillas_staff_insert"
  ON public.informativos_plantillas FOR INSERT TO authenticated
  WITH CHECK (
    private.get_user_rol() IN ('superadmin', 'admin', 'operador', 'ejecutivo')
  );

DROP POLICY IF EXISTS "informativos_plantillas_staff_update" ON public.informativos_plantillas;
CREATE POLICY "informativos_plantillas_staff_update"
  ON public.informativos_plantillas FOR UPDATE TO authenticated
  USING (
    private.get_user_rol() IN ('superadmin', 'admin', 'operador', 'ejecutivo')
  )
  WITH CHECK (
    private.get_user_rol() IN ('superadmin', 'admin', 'operador', 'ejecutivo')
  );

DROP POLICY IF EXISTS "informativos_plantillas_staff_delete" ON public.informativos_plantillas;
CREATE POLICY "informativos_plantillas_staff_delete"
  ON public.informativos_plantillas FOR DELETE TO authenticated
  USING (
    private.get_user_rol() IN ('superadmin', 'admin', 'operador', 'ejecutivo')
  );
