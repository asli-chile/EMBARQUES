-- Escritura staff en catálogos de embarque (proforma / reservas)

GRANT SELECT, INSERT, UPDATE ON public.puertos_origen TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.navieras TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.naves TO authenticated;

DROP POLICY IF EXISTS "puertos_origen_staff_write" ON public.puertos_origen;
CREATE POLICY "puertos_origen_staff_write" ON public.puertos_origen
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

DROP POLICY IF EXISTS "navieras_staff_write" ON public.navieras;
CREATE POLICY "navieras_staff_write" ON public.navieras
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

DROP POLICY IF EXISTS "naves_staff_write" ON public.naves;
CREATE POLICY "naves_staff_write" ON public.naves
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

GRANT SELECT, INSERT ON public.navieras_naves TO authenticated;

DROP POLICY IF EXISTS "navieras_naves_staff_write" ON public.navieras_naves;
CREATE POLICY "navieras_naves_staff_write" ON public.navieras_naves
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
