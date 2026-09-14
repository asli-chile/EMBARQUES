-- Logos de HAPAG-LLOYD y SEABOARD.
--
-- A diferencia de los otros doce, estos dos NO viven en el sitio corporativo
-- (asli.cl/img/… devuelve 404 para ambos): se sirven desde el propio ERP, que
-- publica su carpeta `public/` bajo /embarques/.
--
-- Por eso su URL no sigue el patrón de las demás. Si algún día se suben al
-- sitio, conviene moverlos allá y dejar las catorce en el mismo dominio: hoy
-- son la excepción y está anotada.
--
-- HAPAG-LLOYD es la que importa: la usan 8 embarques. SEABOARD no la usa
-- ninguno todavía.

UPDATE public.navieras
   SET logo_url = 'https://www.asli.cl/embarques/img/hapag-lloyd.png'
 WHERE upper(trim(nombre)) = 'HAPAG-LLOYD';

UPDATE public.navieras
   SET logo_url = 'https://www.asli.cl/embarques/img/seaboard.png'
 WHERE upper(trim(nombre)) = 'SEABOARD';

-- Verificación: solo UNIFER debería quedar sin logo.
-- SELECT nombre FROM public.navieras WHERE logo_url IS NULL;
