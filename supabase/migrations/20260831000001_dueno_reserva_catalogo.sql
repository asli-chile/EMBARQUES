-- ============================================================================
-- Dueño de reserva: pasa de 3 valores fijos en el frontend a catálogo en BD
-- ============================================================================
--
-- Antes, "Crear reserva" ofrecía solo ASLI / CHILFRESH / SURLOGISTICA como
-- botones escritos a mano en el componente. Cualquier otra empresa que
-- coordinara una reserva externa no se podía registrar sin tocar código.
--
-- Ahora los valores viven en `catalogos` con categoria = 'dueno_reserva', y el
-- formulario puede dar de alta empresas nuevas desde el propio combobox.

-- ─── Valores base ────────────────────────────────────────────────────────────

INSERT INTO public.catalogos (categoria, valor, orden)
VALUES
  ('dueno_reserva', 'ASLI', 1),
  ('dueno_reserva', 'CHILFRESH', 2),
  ('dueno_reserva', 'SURLOGISTICA', 3)
ON CONFLICT (categoria, valor) DO NOTHING;

-- ─── Rescate de valores ya usados en operaciones ─────────────────────────────
-- Si en el histórico (o en las migraciones de datos) quedó algún dueño distinto
-- a los tres de arriba, se incorpora al catálogo para no perderlo de vista.

INSERT INTO public.catalogos (categoria, valor, orden)
SELECT DISTINCT 'dueno_reserva', upper(btrim(o.dueno_reserva)), 100
FROM public.operaciones o
WHERE o.dueno_reserva IS NOT NULL
  AND btrim(o.dueno_reserva) <> ''
ON CONFLICT (categoria, valor) DO NOTHING;

-- ─── Permiso de escritura para el personal interno ───────────────────────────
-- `catalogos` solo tenía política de lectura pública. El alta de valores nuevos
-- desde el formulario necesita INSERT, limitado a usuarios internos activos
-- (los clientes no ven ni editan este campo).

DROP POLICY IF EXISTS "catalogos_staff_insert" ON public.catalogos;
CREATE POLICY "catalogos_staff_insert" ON public.catalogos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid()
        AND u.rol IN ('superadmin', 'admin', 'ejecutivo', 'operador')
        AND u.activo = true
    )
  );

GRANT SELECT, INSERT ON public.catalogos TO authenticated;
