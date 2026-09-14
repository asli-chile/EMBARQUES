-- NaviTrack pasa a ser el módulo de seguimiento de la empresa.
--
-- Hasta ahora lo escribía solo el superadmin, porque era un módulo en pruebas.
-- Al reemplazar a /tracking lo usa toda ASLI, y decidir qué pasó en un puerto
-- deja de ser tarea de una sola persona: quien atiende al cliente es quien
-- sabe la respuesta y quien la necesita a tiempo.
--
-- Quién escribe, y hasta dónde:
--
--   superadmin  todo, y además es el único que gasta créditos del proveedor
--               (eso no se decide acá sino en los endpoints: la base no sabe
--               de créditos)
--   admin       todas las operaciones
--   ejecutivo   las de sus empresas, y no porque se compruebe en la pantalla:
--               la condición es la misma de `operaciones`, resuelta con
--               private.get_cliente_nombres_for_user()
--   operador    solo lectura (política `staff_read`, ya existente)
--   cliente     solo lectura de lo suyo (20260913000004)
--
-- El GRANT de escritura a `authenticated` ya está en las cuatro tablas; acá
-- solo van políticas. Ver CLAUDE.md §"Permisos: son dos capas".

/* ── navitrack_recaladas ─────────────────────────────────────────── */

DROP POLICY IF EXISTS "navitrack_recaladas_admin_all" ON public.navitrack_recaladas;
CREATE POLICY "navitrack_recaladas_admin_all" ON public.navitrack_recaladas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'admin' AND u.activo = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'admin' AND u.activo = true
    )
  );

DROP POLICY IF EXISTS "navitrack_recaladas_ejecutivo_all" ON public.navitrack_recaladas;
CREATE POLICY "navitrack_recaladas_ejecutivo_all" ON public.navitrack_recaladas
  FOR ALL USING (
    private.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_recaladas.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  ) WITH CHECK (
    private.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_recaladas.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  );

/* ── navitrack_tramos ─────────────────────────────────────────── */

DROP POLICY IF EXISTS "navitrack_tramos_admin_all" ON public.navitrack_tramos;
CREATE POLICY "navitrack_tramos_admin_all" ON public.navitrack_tramos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'admin' AND u.activo = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'admin' AND u.activo = true
    )
  );

DROP POLICY IF EXISTS "navitrack_tramos_ejecutivo_all" ON public.navitrack_tramos;
CREATE POLICY "navitrack_tramos_ejecutivo_all" ON public.navitrack_tramos
  FOR ALL USING (
    private.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_tramos.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  ) WITH CHECK (
    private.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_tramos.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  );

/* ── navitrack_transbordos ─────────────────────────────────────────── */

DROP POLICY IF EXISTS "navitrack_transbordos_admin_all" ON public.navitrack_transbordos;
CREATE POLICY "navitrack_transbordos_admin_all" ON public.navitrack_transbordos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'admin' AND u.activo = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'admin' AND u.activo = true
    )
  );

DROP POLICY IF EXISTS "navitrack_transbordos_ejecutivo_all" ON public.navitrack_transbordos;
CREATE POLICY "navitrack_transbordos_ejecutivo_all" ON public.navitrack_transbordos
  FOR ALL USING (
    private.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_transbordos.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  ) WITH CHECK (
    private.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_transbordos.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  );

/* ── navitrack_viajes ─────────────────────────────────────────── */

DROP POLICY IF EXISTS "navitrack_viajes_admin_all" ON public.navitrack_viajes;
CREATE POLICY "navitrack_viajes_admin_all" ON public.navitrack_viajes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'admin' AND u.activo = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'admin' AND u.activo = true
    )
  );

DROP POLICY IF EXISTS "navitrack_viajes_ejecutivo_all" ON public.navitrack_viajes;
CREATE POLICY "navitrack_viajes_ejecutivo_all" ON public.navitrack_viajes
  FOR ALL USING (
    private.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_viajes.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  ) WITH CHECK (
    private.is_ejecutivo()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_viajes.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  );

/* ── Verificación ────────────────────────────────────────────────────────────
 * Ocho filas: cuatro tablas × (admin, ejecutivo). Si una tabla nueva de
 * NaviTrack no aparece acá, es que quedó siendo superadmin-only.
 */
-- SELECT tablename, policyname, cmd
--   FROM pg_policies
--  WHERE schemaname = 'public'
--    AND policyname LIKE 'navitrack_%'
--    AND (policyname LIKE '%_admin_all' OR policyname LIKE '%_ejecutivo_all')
--  ORDER BY tablename, policyname;
