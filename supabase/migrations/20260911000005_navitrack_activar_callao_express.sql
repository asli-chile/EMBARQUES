-- ─── Primera nave en seguimiento: CALLAO EXPRESS ─────────────────────────────
--
-- Zarpó de San Antonio el 11-09-2026 con destino Hamburgo (ETA 11-10-2026), y es
-- la única nave habilitada mientras el plan del proveedor sea de prueba.
--
-- IMO y MMSI contrastados en MarineTraffic, Flexport Atlas, MagicPort y
-- ShipSpotting: portacontenedores de Hapag-Lloyd, bandera alemana, clase
-- Valparaíso Express. Conviene confirmarlos contra el propio proveedor con
-- `npm run ais:probar -- --buscar "CALLAO EXPRESS"` antes de darlos por buenos:
-- un identificador equivocado gasta créditos consultando otro barco.

INSERT INTO public.naves (nombre, imo, mmsi, tracking_activo, activo)
VALUES ('CALLAO EXPRESS', '9777606', '218839000', true, true)
ON CONFLICT (nombre) DO UPDATE
SET imo = COALESCE(NULLIF(public.naves.imo, ''), EXCLUDED.imo),
    mmsi = COALESCE(NULLIF(public.naves.mmsi, ''), EXCLUDED.mmsi),
    tracking_activo = true,
    activo = true;

-- Una sola nave activa: cada nave habilitada gasta créditos por su cuenta.
UPDATE public.naves
SET tracking_activo = false
WHERE tracking_activo = true
  AND nombre <> 'CALLAO EXPRESS';

-- Verificación: debe devolver exactamente una fila.
-- SELECT nombre, imo, mmsi FROM public.naves WHERE tracking_activo = true;
