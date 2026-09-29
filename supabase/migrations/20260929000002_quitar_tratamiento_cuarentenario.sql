-- Quitar operaciones.tratamiento_cuarentenario.
--
-- La columna la agregó 20260928000003 a partir de una sugerencia, no de un
-- dato que ASLI maneje: el "tratamiento de frío cuarentenario" no es parte de
-- sus operaciones. El 29-09-2026 se pidió eliminarla. Nunca tuvo datos
-- (0 operaciones con valor al retirarla).
--
-- Se aplica DESPUÉS de desplegar el código que ya no la envía: al revés, el
-- formulario en producción mandaría una columna inexistente y las
-- solicitudes de reserva fallarían con 400 hasta el despliegue.
--
-- Deshace también 20260928000004 y 20260929000001 (trigger de normalización).

DROP TRIGGER IF EXISTS operaciones_normalizar_tratamiento_cuarentenario ON public.operaciones;
DROP FUNCTION IF EXISTS public.normalizar_tratamiento_cuarentenario();

-- El CHECK operaciones_tratamiento_cuarentenario_chk se va con la columna.
ALTER TABLE public.operaciones DROP COLUMN IF EXISTS tratamiento_cuarentenario;

-- Verificación: no debe devolver filas.
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'operaciones'
--    AND column_name = 'tratamiento_cuarentenario';
