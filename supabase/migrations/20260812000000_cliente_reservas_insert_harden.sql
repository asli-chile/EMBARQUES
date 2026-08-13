-- Cliente: INSERT de reservas solo con empresa asignada (sin cliente NULL).
-- Aplicar en BDASLI si un cliente ve reservas de otros (defensa en profundidad con RLS).

DROP POLICY IF EXISTS "Cliente crea reservas" ON public.operaciones;

CREATE POLICY "Cliente crea reservas" ON public.operaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_rol() = 'cliente'
    AND operaciones.cliente IS NOT NULL
    AND operaciones.cliente = ANY(public.get_cliente_nombres_for_user())
    AND (operaciones.origen_registro = 'reserva_web' OR operaciones.origen_registro IS NULL)
  );
