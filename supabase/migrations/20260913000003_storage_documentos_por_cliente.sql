-- ─── El cliente solo ve sus documentos, y solo los ve ────────────────────────
--
-- Las políticas del bucket `documentos` decían únicamente `bucket_id =
-- 'documentos'`, sin mirar quién pedía ni de quién era el archivo. Con una
-- sesión de cliente corriente —hay nueve activas— se podía:
--
--   · listar y descargar los BL, facturas y certificados de todos los demás
--   · sobrescribir cualquier documento
--   · **borrar los 208**
--
-- No hacía falta vulnerar nada: bastaba la consola del navegador con una sesión
-- legítima. El bucket guarda juegos completos de BL, que son título sobre la
-- carga, y facturas comerciales con precios.
--
-- Regla nueva:
--
--   cliente          ve y descarga los documentos de SUS operaciones. Nada más.
--                    No sube, no modifica, no borra.
--   personal interno igual que hasta ahora: acceso completo.
--
-- El personal interno no se restringe por pertenencia a propósito. De los 57
-- identificadores de operación que hay en las rutas, 56 apuntan a operaciones
-- que ya no existen (quedaron huérfanas de importaciones anteriores). Atar al
-- personal a esa relación dejaría 207 de 208 archivos inaccesibles para quienes
-- trabajan con ellos todos los días.

/*
 * Identificador de operación dentro de la ruta del archivo.
 *
 * Conviven dos formas, de dos momentos del sistema:
 *   <uuid>/CARPETA/archivo.pdf
 *   documentos/<uuid>/CARPETA/archivo.pdf
 *
 * Devuelve NULL si no hay un uuid reconocible, y entonces ningún cliente lo ve:
 * ante la duda sobre a quién pertenece un documento, no se muestra.
 */
CREATE OR REPLACE FUNCTION public.storage_operacion_id(ruta text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  candidato text;
BEGIN
  candidato := CASE
    WHEN ruta LIKE 'documentos/%' THEN split_part(ruta, '/', 2)
    ELSE split_part(ruta, '/', 1)
  END;

  IF candidato ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN candidato::uuid;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.storage_operacion_id(text) IS
  'Extrae el id de operación de la ruta de un objeto de storage. NULL si no se reconoce.';

GRANT EXECUTE ON FUNCTION public.storage_operacion_id(text) TO authenticated;

/*
 * ¿Este documento pertenece a una operación del cliente que pregunta?
 *
 * Reutiliza `private.get_cliente_nombres_for_user()`, la misma función con la
 * que `operaciones` decide qué filas ve un cliente. Si mañana cambia la forma
 * de relacionar usuario y empresa, cambia en un solo lugar y los documentos
 * siguen la misma regla que las operaciones.
 */
CREATE OR REPLACE FUNCTION public.storage_doc_es_del_cliente(ruta text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.operaciones o
     WHERE o.id = public.storage_operacion_id(ruta)
       AND o.deleted_at IS NULL
       AND o.cliente IS NOT NULL
       AND o.cliente = ANY (private.get_cliente_nombres_for_user())
  );
$$;

COMMENT ON FUNCTION public.storage_doc_es_del_cliente(text) IS
  'True si el documento pertenece a una operación del cliente autenticado.';

GRANT EXECUTE ON FUNCTION public.storage_doc_es_del_cliente(text) TO authenticated;

-- ─── Se reemplazan las políticas abiertas ────────────────────────────────────
DROP POLICY IF EXISTS "docs_storage_select_auth" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "docs_storage_delete" ON storage.objects;

-- Leer: el personal interno todo; el cliente, lo suyo.
CREATE POLICY "documentos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (
      public.navitrack_rol_actual() IN ('superadmin', 'admin', 'ejecutivo', 'operador')
      OR (
        public.navitrack_rol_actual() = 'cliente'
        AND public.storage_doc_es_del_cliente(name)
      )
    )
  );

-- Escribir: solo personal interno. El cliente recibe documentos, no los emite.
CREATE POLICY "documentos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin', 'ejecutivo', 'operador')
  );

CREATE POLICY "documentos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin', 'ejecutivo', 'operador')
  )
  WITH CHECK (
    bucket_id = 'documentos'
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin', 'ejecutivo', 'operador')
  );

-- Borrar queda más arriba: un documento borrado no se recupera.
CREATE POLICY "documentos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.navitrack_rol_actual() IN ('superadmin', 'admin', 'ejecutivo')
  );

-- Verificación:
-- SELECT policyname, cmd FROM pg_policies
--  WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'documentos_%';
