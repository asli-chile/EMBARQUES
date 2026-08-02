-- Normalizar variantes inconsistentes de estado_operacion
UPDATE public.operaciones
SET estado_operacion = 'CANCELADO'
WHERE lower(estado_operacion) = 'cancelado'
  AND estado_operacion <> 'CANCELADO';

UPDATE public.operaciones
SET estado_operacion = 'CONFIRMADA'
WHERE upper(estado_operacion) IN ('CONFIRMADO', 'CONFIRMADA')
  AND estado_operacion <> 'CONFIRMADA';
