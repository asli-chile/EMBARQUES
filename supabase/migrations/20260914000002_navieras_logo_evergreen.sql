-- Logo de EVERGREEN.
--
-- Quedó en NULL en el seed de logos (20260911000003) porque entonces el archivo
-- no existía en el sitio. Ya está publicado en el mismo patrón que los otros
-- diez, así que basta apuntar a él: no hace falta subir nada al ERP ni duplicar
-- la imagen en dos dominios.
--
-- Siguen sin logo HAPAG-LLOYD, SEABOARD y UNIFER: sus archivos devuelven 404 en
-- el sitio (comprobado el 14-09-2026) y se muestran con monograma, que es el
-- comportamiento previsto cuando falta la imagen.

UPDATE public.navieras
   SET logo_url = 'https://www.asli.cl/img/evergreen.webp'
 WHERE upper(trim(nombre)) = 'EVERGREEN'
   AND logo_url IS DISTINCT FROM 'https://www.asli.cl/img/evergreen.webp';

-- Verificación: no debe quedar EVERGREEN sin logo.
-- SELECT nombre, logo_url FROM public.navieras WHERE upper(trim(nombre)) = 'EVERGREEN';
