-- NaviTrack para el cliente: ve lo suyo, y solo lo ve.
--
-- El cliente entra a /navitrack en modo seguimiento. Sus operaciones ya se las
-- filtra la política de `operaciones`; lo que faltaba es el detalle del viaje,
-- que vive en las tablas `navitrack_*` y hasta ahora solo leía el personal.
--
-- Dos criterios que conviene no perder:
--
-- 1. La pertenencia se resuelve con `private.get_cliente_nombres_for_user()`,
--    la MISMA función con la que `operaciones` y los documentos deciden qué ve
--    un cliente. Si se escribiera aquí otra regla, tarde o temprano las tres
--    dirían cosas distintas sobre el mismo embarque.
--
-- 2. Solo SELECT. Ninguna de estas filas es una opinión del cliente: decidir si
--    una recalada fue transbordo o parada programada es criterio de ASLI, y el
--    aviso que sale de esa decisión va a su nombre.
--
-- El GRANT de tabla ya existe (SELECT a `authenticated` en todas), así que aquí
-- solo van políticas. Ver CLAUDE.md §"Permisos: son dos capas".

/* ── Lo que cuelga de una operación ──────────────────────────────────────────
 *
 * Cuatro tablas con `operacion_id`, y la misma pregunta en las cuatro: ¿es esta
 * operación de quien está mirando?
 */

DROP POLICY IF EXISTS "navitrack_recaladas_cliente_read" ON public.navitrack_recaladas;
CREATE POLICY "navitrack_recaladas_cliente_read" ON public.navitrack_recaladas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_recaladas.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  );

DROP POLICY IF EXISTS "navitrack_tramos_cliente_read" ON public.navitrack_tramos;
CREATE POLICY "navitrack_tramos_cliente_read" ON public.navitrack_tramos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_tramos.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  );

DROP POLICY IF EXISTS "navitrack_transbordos_cliente_read" ON public.navitrack_transbordos;
CREATE POLICY "navitrack_transbordos_cliente_read" ON public.navitrack_transbordos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_transbordos.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  );

DROP POLICY IF EXISTS "navitrack_viajes_cliente_read" ON public.navitrack_viajes;
CREATE POLICY "navitrack_viajes_cliente_read" ON public.navitrack_viajes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = navitrack_viajes.operacion_id
        AND o.deleted_at IS NULL
        AND o.cliente = ANY (private.get_cliente_nombres_for_user())
    )
  );

/* ── La posición del buque ───────────────────────────────────────────────────
 *
 * `navitrack_ais_lecturas` no cuelga de una operación: cuelga de un buque, y un
 * buque lleva carga de varios clientes. Atarla a la operación exigiría cruzar
 * el nombre del buque contra el catálogo dentro de la política, un cruce por
 * texto que ya falló una vez (ver docs/NAVITRACK.md, `nombreBase()`).
 *
 * Se abre la lectura de las posiciones, y solo las posiciones:
 *
 * - dónde navega un buque es información pública: cualquiera la ve en los
 *   portales AIS sin credenciales;
 * - la fila no dice de quién es la carga, así que no filtra nada entre clientes;
 * - las filas de tipo `busqueda` y `escalas` quedan fuera porque son rastro de
 *   trabajo interno: qué buque se buscó y cuándo, que no es del viaje de nadie.
 */

DROP POLICY IF EXISTS "navitrack_ais_lecturas_cliente_read" ON public.navitrack_ais_lecturas;
CREATE POLICY "navitrack_ais_lecturas_cliente_read" ON public.navitrack_ais_lecturas
  FOR SELECT USING (
    tipo = 'posicion'
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol = 'cliente' AND u.activo = true
    )
  );

/* `navitrack_escalas` y `navitrack_avisos` se quedan fuera a propósito: el
 * historial de port calls es una consulta cara que se pide a mano, y los avisos
 * son el registro de a quién ya se le escribió. Ninguna de las dos responde
 * "¿dónde va mi carga?". */

/* ── Verificación ────────────────────────────────────────────────────────────
 * Debe devolver cinco filas, todas cmd = SELECT. Si alguna apareciera con ALL,
 * INSERT o UPDATE, el modo lectura dejó de ser de lectura.
 */
-- SELECT tablename, policyname, cmd
--   FROM pg_policies
--  WHERE schemaname = 'public' AND policyname LIKE 'navitrack_%_cliente_read'
--  ORDER BY tablename;
