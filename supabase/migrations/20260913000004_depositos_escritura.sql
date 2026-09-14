-- ─── Depósitos: faltaba la política de escritura ─────────────────────────────
--
-- `depositos` tenía RLS activo y solo dos políticas de lectura. Sin política
-- que permita escribir, RLS lo deniega: editar la celda de depósito en
-- Registros devolvía 403, incluso siendo superadmin.
--
-- Es la misma clase de olvido que en los buckets de storage, y pasa por la
-- misma razón: leer funcionaba, así que nada lo delataba hasta que alguien
-- intentó guardar.
--
-- De los nueve catálogos que la pantalla de Registros puede alimentar
-- —navieras, especies, plantas, depósitos, puertos de origen, empresas,
-- destinos, consignatarios y contratos— este era el único sin escritura.
--
-- Se copia la regla de `puertos_origen`, que es el catálogo más parecido:
-- escribe el personal interno, y el cliente no.

DROP POLICY IF EXISTS "depositos_staff_write" ON public.depositos;
CREATE POLICY "depositos_staff_write" ON public.depositos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  );

-- Verificación: ningún catálogo de Registros debe quedar sin escritura.
-- WITH t(nombre) AS (VALUES ('navieras'),('especies'),('plantas'),('depositos'),
--   ('puertos_origen'),('empresas'),('destinos'),('consignatarios'),('contratos'))
-- SELECT t.nombre FROM t WHERE NOT EXISTS (
--   SELECT 1 FROM pg_policies p
--    WHERE p.schemaname='public' AND p.tablename=t.nombre AND p.cmd IN ('ALL','INSERT'));
