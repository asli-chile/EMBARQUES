-- Formato único para el número de contenedor: 4 letras, 6 dígitos, guion y dígito
-- verificador (MEDU123456-0).
--
-- Los usuarios lo escriben de muchas formas: "seku 1234567", "SEKU1234567",
-- "OTPU 668895-1". Al 25-09-2026, 42 de 145 contenedores en operaciones venían
-- sin guion o con espacios. Mientras convivan formatos, buscar o cruzar por
-- contenedor (NaviTrack, Mis Documentos, el filtro de Registros) falla en
-- silencio con los que no calzan.
--
-- La regla vive aquí y no solo en el navegador porque el contenedor se escribe
-- desde muchas pantallas (Registros, Reserva ASLI, Reserva externa, la ficha de
-- Mis Reservas, el modal de transporte, la importación). El trigger lo corrige
-- sea cual sea el camino. `src/lib/contenedor.ts` aplica la misma regla en
-- pantalla para que el usuario vea el formato antes de guardar: si se cambia
-- una, cambiar la otra.
--
-- Se corrige cada contenedor que aparezca en el texto y el resto se deja como
-- está, porque el campo admite varios separados por `|`, `,`, `;` o salto de
-- línea. Lo que no se reconoce como contenedor solo pasa a mayúsculas:
-- corregirlo a ciegas podría inventar un número.

CREATE OR REPLACE FUNCTION public.normalizar_contenedor(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT regexp_replace(
    upper(btrim(p)),
    '\m([A-Z]{4})[ .-]*([0-9]{6})[ .-]*([0-9])\M',
    '\1\2-\3',
    'g'
  );
$$;

CREATE OR REPLACE FUNCTION private.contenedor_formato_trg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.contenedor := public.normalizar_contenedor(NEW.contenedor);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operaciones_contenedor_formato ON public.operaciones;
CREATE TRIGGER operaciones_contenedor_formato
  BEFORE INSERT OR UPDATE OF contenedor ON public.operaciones
  FOR EACH ROW EXECUTE FUNCTION private.contenedor_formato_trg();

DROP TRIGGER IF EXISTS transportes_reservas_ext_contenedor_formato ON public.transportes_reservas_ext;
CREATE TRIGGER transportes_reservas_ext_contenedor_formato
  BEFORE INSERT OR UPDATE OF contenedor ON public.transportes_reservas_ext
  FOR EACH ROW EXECUTE FUNCTION private.contenedor_formato_trg();

DROP TRIGGER IF EXISTS proformas_contenedor_formato ON public.proformas;
CREATE TRIGGER proformas_contenedor_formato
  BEFORE INSERT OR UPDATE OF contenedor ON public.proformas
  FOR EACH ROW EXECUTE FUNCTION private.contenedor_formato_trg();

-- Histórico. Solo toca las filas que cambian; los triggers de estado y de
-- temporada no hacen nada porque esos campos no se mueven.
UPDATE public.operaciones
   SET contenedor = public.normalizar_contenedor(contenedor)
 WHERE contenedor IS DISTINCT FROM public.normalizar_contenedor(contenedor);

UPDATE public.transportes_reservas_ext
   SET contenedor = public.normalizar_contenedor(contenedor)
 WHERE contenedor IS DISTINCT FROM public.normalizar_contenedor(contenedor);

UPDATE public.proformas
   SET contenedor = public.normalizar_contenedor(contenedor)
 WHERE contenedor IS DISTINCT FROM public.normalizar_contenedor(contenedor);

-- Verificación: no debe devolver filas.
-- SELECT id, contenedor FROM public.operaciones
--  WHERE contenedor IS DISTINCT FROM public.normalizar_contenedor(contenedor);
