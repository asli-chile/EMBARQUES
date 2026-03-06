-- ============================================================================
-- Crea registros en empresas para los empresa_id huérfanos de clientes
-- Ejecutar en Supabase SQL Editor para que los nombres aparezcan en la tabla
-- ============================================================================

INSERT INTO public.empresas (id, nombre)
SELECT c.empresa_id, 'Pendiente asignar ' || LEFT(c.empresa_id::text, 8)
FROM (
  SELECT DISTINCT empresa_id
  FROM public.clientes
  WHERE empresa_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = clientes.empresa_id)
) c
ON CONFLICT (id) DO NOTHING;
