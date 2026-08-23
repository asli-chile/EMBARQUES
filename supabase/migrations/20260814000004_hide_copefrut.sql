-- Ocultar COPEFRUT por defecto: los datos siguen en BD, no aparecen en SELECT autenticado.
-- Políticas RESTRICTIVE se combinan con AND sobre las políticas existentes.

CREATE OR REPLACE FUNCTION public.nombre_cliente_oculto(p_nombre TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(p_nombre, '') ~* 'copefrut';
$$;

COMMENT ON FUNCTION public.nombre_cliente_oculto(TEXT) IS
  'True si el nombre de cliente/empresa/contrato debe ocultarse (COPEFRUT).';

CREATE OR REPLACE FUNCTION public.operacion_esta_oculta(p_operacion_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    public.nombre_cliente_oculto(o.cliente) OR public.nombre_cliente_oculto(o.contrato),
    false
  )
  FROM public.operaciones o
  WHERE o.id = p_operacion_id;
$$;

CREATE OR REPLACE FUNCTION public.empresa_esta_oculta(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.nombre_cliente_oculto(e.nombre), false)
  FROM public.empresas e
  WHERE e.id = p_empresa_id;
$$;

-- Nombres asignados al usuario: no devolver COPEFRUT.
CREATE OR REPLACE FUNCTION public.get_cliente_nombres_for_user()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(e.nombre) FILTER (
      WHERE e.nombre IS NOT NULL
        AND NOT public.nombre_cliente_oculto(e.nombre)
    ),
    ARRAY[]::TEXT[]
  )
  FROM public.usuarios_empresas ue
  JOIN public.empresas e ON e.id = ue.empresa_id
  JOIN public.usuarios u ON u.id = ue.usuario_id
  WHERE u.auth_id = auth.uid() AND u.activo = true
    AND u.rol IN ('cliente', 'ejecutivo');
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'private') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION private.get_cliente_nombres_for_user()
      RETURNS TEXT[]
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
        SELECT public.get_cliente_nombres_for_user();
      $fn$;
    $f$;
  END IF;
END $$;

DROP POLICY IF EXISTS "ocultar_copefrut_operaciones" ON public.operaciones;
CREATE POLICY "ocultar_copefrut_operaciones"
  ON public.operaciones
  AS RESTRICTIVE
  FOR SELECT
  USING (
    NOT public.nombre_cliente_oculto(cliente)
    AND NOT public.nombre_cliente_oculto(contrato)
  );

DROP POLICY IF EXISTS "ocultar_copefrut_documentos" ON public.documentos;
CREATE POLICY "ocultar_copefrut_documentos"
  ON public.documentos
  AS RESTRICTIVE
  FOR SELECT
  USING (NOT coalesce(public.operacion_esta_oculta(operacion_id), false));

DROP POLICY IF EXISTS "ocultar_copefrut_empresas" ON public.empresas;
CREATE POLICY "ocultar_copefrut_empresas"
  ON public.empresas
  AS RESTRICTIVE
  FOR SELECT
  USING (NOT public.nombre_cliente_oculto(nombre));

DROP POLICY IF EXISTS "ocultar_copefrut_clientes" ON public.clientes;
CREATE POLICY "ocultar_copefrut_clientes"
  ON public.clientes
  AS RESTRICTIVE
  FOR SELECT
  USING (
    empresa_id IS NULL
    OR NOT coalesce(public.empresa_esta_oculta(empresa_id), false)
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contratos'
  ) THEN
    EXECUTE 'ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "ocultar_copefrut_contratos" ON public.contratos';
    EXECUTE $p$
      CREATE POLICY "ocultar_copefrut_contratos"
        ON public.contratos
        AS RESTRICTIVE
        FOR SELECT
        USING (NOT public.nombre_cliente_oculto(nombre))
    $p$;
  END IF;
END $$;
