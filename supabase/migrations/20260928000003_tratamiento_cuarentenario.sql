-- Tratamiento de frío cuarentenario, separado de la atmósfera controlada.
--
-- `tratamiento_frio` se llama así, pero en la práctica registra la atmósfera
-- controlada: al 28-09-2026 las 8 operaciones con "SI" tienen
-- `tipo_atmosfera = CONTROLADA` y O₂ cargado, y el formulario abre O₂/CO₂ al
-- marcarlo. El tratamiento de frío cuarentenario (el que exigen destinos como
-- China o EE.UU.: temperatura fija por un número de días para control de
-- plagas) no tenía dónde registrarse.
--
-- Lo informa el cliente al solicitar la reserva, porque cambia la temperatura
-- y los días de tránsito que hay que pedirle a la naviera.
--
-- Permisos: columna nueva en una tabla que `authenticated` ya inserta y
-- actualiza bajo sus políticas actuales; no requiere GRANT ni política nueva.

ALTER TABLE public.operaciones
  ADD COLUMN IF NOT EXISTS tratamiento_cuarentenario text
  CONSTRAINT operaciones_tratamiento_cuarentenario_chk
    CHECK (tratamiento_cuarentenario IN ('SI', 'NO'));

COMMENT ON COLUMN public.operaciones.tratamiento_cuarentenario IS
  'Tratamiento de frío cuarentenario exigido por el destino: SI / NO / NULL (no informado). Distinto de tratamiento_frio, que registra la atmósfera controlada.';

-- Verificación: una fila, data_type = text.
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'operaciones'
--    AND column_name = 'tratamiento_cuarentenario';
