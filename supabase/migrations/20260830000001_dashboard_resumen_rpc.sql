-- Agregados del dashboard calculados en la base de datos.
--
-- Antes el dashboard bajaba hasta 2000 filas de `operaciones` con ~20 columnas y
-- calculaba todos los KPIs en el navegador. Esta función devuelve un único JSON
-- con los agregados ya listos, de modo que el tráfico no crece con el volumen de
-- operaciones.
--
-- SECURITY INVOKER a propósito: las políticas RLS de `operaciones` siguen
-- aplicando al usuario que llama. Los parámetros solo replican los filtros que
-- el frontend ya aplicaba (temporada y empresas asignadas al cliente).

CREATE OR REPLACE FUNCTION public.dashboard_resumen(
  p_temporada text DEFAULT NULL,
  p_empresas text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH hoy AS (
  SELECT (now() AT TIME ZONE 'America/Santiago')::date AS dia
),
base AS (
  SELECT
    o.id,
    o.ref_asli,
    o.correlativo,
    o.cliente,
    o.naviera,
    o.especie,
    o.pol,
    o.pod,
    o.etd,
    o.corte_documental,
    o.fin_stacking,
    o.arribo_confirmado,
    o.enviado_transporte,
    o.transporte,
    o.contenedor,
    o.booking_doc_url,
    o.numero_factura_asli,
    COALESCE(NULLIF(upper(btrim(o.estado_operacion)), ''), 'SIN ESTADO') AS estado,
    COALESCE(e.es_final, false) AS cerrada,
    COALESCE(o.operacion_critica, false) OR upper(btrim(COALESCE(o.prioridad, ''))) = 'ALTA' AS critica
  FROM public.operaciones o
  LEFT JOIN public.operaciones_estados e
    ON e.codigo = upper(btrim(o.estado_operacion))
  WHERE o.deleted_at IS NULL
    AND o.cliente NOT ILIKE '%COPEFRUT%'
    AND (p_temporada IS NULL OR o.temporada = p_temporada)
    AND (p_empresas IS NULL OR o.cliente = ANY (p_empresas))
),
-- LEFT JOIN y count(b.id) para que sin operaciones devuelva ceros en lugar de
-- una fila vacía (o de contar la fila de `hoy`).
kpis AS (
  SELECT
    count(b.id) AS total,
    count(b.id) FILTER (WHERE NOT b.cerrada) AS active,
    count(b.id) FILTER (WHERE b.estado = 'SOLICITADA') AS pending,
    count(b.id) FILTER (WHERE b.estado = 'RESERVA_CONFIRMADA') AS confirmed,
    count(b.id) FILTER (WHERE b.estado = 'CANCELADA') AS cancelled,
    count(b.id) FILTER (WHERE b.estado = 'ROLEADA') AS rolled,
    count(b.id) FILTER (WHERE b.arribo_confirmado) AS arrived,
    count(b.id) FILTER (WHERE b.etd BETWEEN h.dia AND h.dia + 7) AS etd_next7,
    count(b.id) FILTER (WHERE b.etd = h.dia) AS etd_today,
    count(b.id) FILTER (WHERE b.etd = h.dia + 1) AS etd_tomorrow,
    count(b.id) FILTER (WHERE NOT b.cerrada AND b.corte_documental BETWEEN h.dia AND h.dia + 3) AS cutoff_next3,
    count(b.id) FILTER (WHERE NOT b.cerrada AND b.fin_stacking BETWEEN h.dia AND h.dia + 3) AS stacking_closing,
    count(b.id) FILTER (WHERE b.enviado_transporte AND b.transporte IS NULL AND b.contenedor IS NULL) AS transport_pending,
    count(b.id) FILTER (WHERE NOT b.cerrada AND NOT COALESCE(b.enviado_transporte, false)) AS not_sent_to_transport,
    count(b.id) FILTER (WHERE NOT b.cerrada AND b.booking_doc_url IS NULL) AS no_booking_doc,
    count(b.id) FILTER (WHERE b.critica) AS critical,
    count(b.id) FILTER (
      WHERE NOT b.cerrada
        AND b.enviado_transporte
        AND (b.transporte IS NOT NULL OR b.contenedor IS NOT NULL)
        AND b.numero_factura_asli IS NULL
    ) AS invoice_pending,
    count(DISTINCT b.cliente) AS clientes_distintos,
    count(DISTINCT NULLIF(btrim(b.naviera), '')) AS navieras_distintas,
    count(DISTINCT NULLIF(btrim(b.especie), '')) AS especies_distintas
  FROM hoy h
  LEFT JOIN base b ON true
  GROUP BY h.dia
),
por_estado AS (
  SELECT estado, count(*) AS cantidad
  FROM base
  GROUP BY estado
  ORDER BY count(*) DESC, estado
),
proximos AS (
  SELECT b.id, b.ref_asli, b.correlativo, b.cliente, b.naviera, b.pod, b.etd, b.critica
  FROM base b, hoy h
  WHERE b.etd BETWEEN h.dia AND h.dia + 7
  ORDER BY b.etd, b.ref_asli
  LIMIT 8
),
top_clientes AS (
  SELECT cliente, count(*) AS cantidad
  FROM base
  WHERE cliente IS NOT NULL
  GROUP BY cliente
  ORDER BY count(*) DESC, cliente
  LIMIT 5
),
top_navieras AS (
  SELECT btrim(naviera) AS naviera, count(*) AS cantidad
  FROM base
  WHERE NULLIF(btrim(naviera), '') IS NOT NULL
  GROUP BY btrim(naviera)
  ORDER BY count(*) DESC, btrim(naviera)
  LIMIT 5
),
especies AS (
  SELECT btrim(especie) AS especie, count(*) AS cantidad
  FROM base
  WHERE NULLIF(btrim(especie), '') IS NOT NULL
  GROUP BY btrim(especie)
  ORDER BY count(*) DESC, btrim(especie)
  LIMIT 5
),
-- POD con más operaciones para cada una de las especies del top.
especie_pod AS (
  SELECT DISTINCT ON (esp.especie)
    esp.especie,
    btrim(b.pod) AS pod,
    count(*) OVER (PARTITION BY esp.especie, btrim(b.pod)) AS cantidad
  FROM especies esp
  JOIN base b ON btrim(b.especie) = esp.especie
  WHERE NULLIF(btrim(b.pod), '') IS NOT NULL
  ORDER BY esp.especie, count(*) OVER (PARTITION BY esp.especie, btrim(b.pod)) DESC, btrim(b.pod)
),
puertos AS (
  SELECT 'origen' AS tipo, btrim(pol) AS puerto, count(*) AS cantidad
  FROM base
  WHERE NULLIF(btrim(pol), '') IS NOT NULL
  GROUP BY btrim(pol)
  UNION ALL
  SELECT 'destino' AS tipo, btrim(pod) AS puerto, count(*) AS cantidad
  FROM base
  WHERE NULLIF(btrim(pod), '') IS NOT NULL
  GROUP BY btrim(pod)
),
vias AS (
  SELECT
    count(*) FILTER (WHERE n.modo_transporte = 'maritimo') AS maritima,
    count(*) FILTER (WHERE n.modo_transporte = 'aereo') AS aerea,
    count(*) FILTER (WHERE n.modo_transporte IS NULL) AS sin_clasificar
  FROM base b
  LEFT JOIN public.navieras n
    ON upper(btrim(n.nombre)) = upper(btrim(b.naviera))
),
semanas AS (
  SELECT
    (date_trunc('week', h.dia::timestamp)::date + (i * 7)) AS inicio,
    count(b.id) AS cantidad
  FROM hoy h
  CROSS JOIN generate_series(0, 5) AS i
  LEFT JOIN base b
    ON b.etd >= GREATEST(date_trunc('week', h.dia::timestamp)::date + (i * 7), h.dia)
   AND b.etd < date_trunc('week', h.dia::timestamp)::date + ((i + 1) * 7)
  GROUP BY h.dia, i
  ORDER BY i
)
SELECT jsonb_build_object(
  'kpis', (SELECT to_jsonb(k) FROM kpis k),
  'por_estado', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM por_estado s), '[]'::jsonb),
  'proximos_zarpes', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM proximos p), '[]'::jsonb),
  'top_clientes', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM top_clientes c), '[]'::jsonb),
  'top_navieras', COALESCE((SELECT jsonb_agg(to_jsonb(n)) FROM top_navieras n), '[]'::jsonb),
  'top_especies', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'especie', e.especie,
      'cantidad', e.cantidad,
      'pod', ep.pod
    ) ORDER BY e.cantidad DESC, e.especie)
    FROM especies e
    LEFT JOIN especie_pod ep ON ep.especie = e.especie
  ), '[]'::jsonb),
  'puertos', COALESCE((SELECT jsonb_agg(to_jsonb(pu)) FROM puertos pu), '[]'::jsonb),
  'vias', (SELECT to_jsonb(v) FROM vias v),
  'zarpes_por_semana', COALESCE((SELECT jsonb_agg(to_jsonb(sem)) FROM semanas sem), '[]'::jsonb)
);
$$;

COMMENT ON FUNCTION public.dashboard_resumen(text, text[]) IS
  'Agregados del dashboard en un solo JSON. p_temporada filtra por temporada; p_empresas restringe a las empresas asignadas (NULL = sin restricción). Respeta RLS del usuario que llama.';

GRANT EXECUTE ON FUNCTION public.dashboard_resumen(text, text[]) TO authenticated, service_role;

-- Índices que sostienen los filtros de fecha del dashboard.
CREATE INDEX IF NOT EXISTS idx_operaciones_etd_activas
  ON public.operaciones (etd)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_operaciones_corte_documental
  ON public.operaciones (corte_documental)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_operaciones_fin_stacking
  ON public.operaciones (fin_stacking)
  WHERE deleted_at IS NULL;
