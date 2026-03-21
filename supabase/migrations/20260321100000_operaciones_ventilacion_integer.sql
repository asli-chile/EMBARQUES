-- Ventilación (CBM/h): entero opcional ingresado manualmente.
-- Migra texto heredado: primer número en la cadena ("25 CBM/H" → 25); sin dígitos → NULL.

ALTER TABLE public.operaciones
  ALTER COLUMN ventilacion TYPE integer USING (
    CASE
      WHEN ventilacion IS NULL OR btrim(ventilacion::text) = '' THEN NULL
      WHEN btrim(ventilacion::text) ~ '^[0-9]+$' THEN btrim(ventilacion::text)::integer
      WHEN ventilacion::text ~ '[0-9]+' THEN (substring(ventilacion::text from '[0-9]+'))::integer
      ELSE NULL
    END
  );

COMMENT ON COLUMN public.operaciones.ventilacion IS 'Ventilación en CBM/h (m³/h), entero; NULL si no aplica.';

-- Solo si existe (la migración 20260227200004 no está aplicada en todos los proyectos).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'condiciones_carga'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'condiciones_carga'
      AND column_name = 'ventilacion'
  ) THEN
    ALTER TABLE public.condiciones_carga
      ALTER COLUMN ventilacion TYPE integer USING (
        CASE
          WHEN ventilacion IS NULL OR btrim(ventilacion::text) = '' THEN NULL
          WHEN btrim(ventilacion::text) ~ '^[0-9]+$' THEN btrim(ventilacion::text)::integer
          WHEN ventilacion::text ~ '[0-9]+' THEN (substring(ventilacion::text from '[0-9]+'))::integer
          ELSE NULL
        END
      );
    COMMENT ON COLUMN public.condiciones_carga.ventilacion IS 'Ventilación en CBM/h (m³/h), entero; NULL si no aplica.';
  END IF;
END $$;

DELETE FROM public.catalogos WHERE categoria = 'ventilacion';
