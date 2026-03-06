-- ============================================================================
-- Ajuste RLS: Cliente solo ve operaciones donde operaciones.cliente coincide
-- con una de sus empresas. Elimina operaciones.cliente IS NULL para clientes.
-- ============================================================================

-- Cliente: solo operaciones cuyo cliente coincide con sus empresas asignadas
DROP POLICY IF EXISTS "Cliente ve sus operaciones" ON operaciones;
CREATE POLICY "Cliente ve sus operaciones" ON operaciones
  FOR SELECT
  TO authenticated
  USING (
    get_user_rol() = 'cliente'
    AND operaciones.cliente IS NOT NULL
    AND operaciones.cliente = ANY(public.get_cliente_nombres_for_user())
  );

-- Cliente crea reservas (INSERT permanece igual: origen_registro reserva_web)
-- El WITH CHECK de cliente ya está en migración 000005
