-- El país de destino se deduce del puerto de destino (POD).
--
-- Al 26-09-2026, las 130 operaciones con POD tenían `pais` vacío: Crear Reserva
-- tiene el campo en su formulario pero nunca lo guardaba, y solo Registros lo
-- completaba, y solo cuando alguien editaba el POD ahí. El país no es un dato
-- aparte que alguien tenga que acordarse de llenar: sale del puerto.
--
-- Va en la base, como el formato del contenedor y del viaje, porque el POD se
-- escribe desde Crear Reserva, Registros, la ficha de Mis Reservas y la
-- importación. El trigger toma el país del catálogo `destinos` cada vez que se
-- crea una operación o cambia su POD. Si el puerto no está en el catálogo, o
-- está sin país, deja lo que viniera: no inventa un país.

-- 1. Catálogo. Puertos sin país.
UPDATE public.destinos SET pais = 'ITALIA'   WHERE upper(btrim(nombre)) = 'GIOIA TAURO' AND pais IS NULL;
UPDATE public.destinos SET pais = 'PORTUGAL' WHERE upper(btrim(nombre)) = 'LEIXOES'     AND pais IS NULL;
UPDATE public.destinos SET pais = 'JAPÓN'    WHERE upper(btrim(nombre)) = 'TOKYO'       AND pais IS NULL;
UPDATE public.destinos SET pais = 'CHILE'    WHERE upper(btrim(nombre)) = 'CURICO'      AND pais IS NULL;

-- Puertos que las operaciones ya usan y el catálogo no tenía. Algunos son
-- otro nombre de uno existente (AMBERES/ANTWERP, GENOA/GENOVA); el catálogo ya
-- convive con alias así (HAMBURG/HAMBURGO, LISBOA/LISBON), y sin ellos esas
-- operaciones se quedarían sin país.
INSERT INTO public.destinos (nombre, pais, activo)
SELECT v.nombre, v.pais, true
  FROM (VALUES
    ('AMBERES',  'BÉLGICA'),
    ('GENOA',    'ITALIA'),
    ('MADRID',   'ESPAÑA'),
    ('SEATTLE',  'ESTADOS UNIDOS'),
    ('LE HAVRE', 'FRANCIA')
  ) AS v(nombre, pais)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.destinos d WHERE upper(btrim(d.nombre)) = v.nombre
 );

-- 2. El país sigue al POD.
CREATE OR REPLACE FUNCTION private.pais_desde_pod_trg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_pais text;
BEGIN
  IF NEW.pod IS NULL OR btrim(NEW.pod) = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.pod IS NOT DISTINCT FROM OLD.pod THEN
    RETURN NEW;
  END IF;
  SELECT d.pais INTO v_pais
    FROM public.destinos d
   WHERE upper(btrim(d.nombre)) = upper(btrim(NEW.pod))
     AND d.pais IS NOT NULL AND btrim(d.pais) <> ''
   ORDER BY d.activo DESC NULLS LAST
   LIMIT 1;
  IF v_pais IS NOT NULL THEN
    NEW.pais := v_pais;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operaciones_pais_desde_pod ON public.operaciones;
CREATE TRIGGER operaciones_pais_desde_pod
  BEFORE INSERT OR UPDATE OF pod ON public.operaciones
  FOR EACH ROW EXECUTE FUNCTION private.pais_desde_pod_trg();

-- 3. Histórico: operaciones con POD y sin país. Se escribe el país directo
-- (no `SET pod = pod`, que el trigger ignoraría porque el POD no cambia).
UPDATE public.operaciones o
   SET pais = d.pais
  FROM public.destinos d
 WHERE upper(btrim(d.nombre)) = upper(btrim(o.pod))
   AND d.pais IS NOT NULL AND btrim(d.pais) <> ''
   AND coalesce(btrim(o.pais), '') = '';

-- Verificación: operaciones vivas con POD y sin país (debe dar 0, o solo
-- puertos que no están en el catálogo).
-- SELECT pod, count(*) FROM public.operaciones
--  WHERE deleted_at IS NULL AND pod IS NOT NULL AND coalesce(btrim(pais), '') = ''
--  GROUP BY pod;
