-- ─── Logos de navieras desde el sitio público ────────────────────────────────
--
-- Las imágenes ya viven en www.asli.cl/img/, que es el mismo dominio donde se
-- sirve el ERP: no hay que subirlas de nuevo ni se cruza CSP.
--
-- Solo se cargan las que existen (verificadas una a una con HTTP 200). Las que
-- faltan —EVERGREEN, HAPAG-LLOYD, SEABOARD, UNIFER— quedan en NULL a propósito:
-- la interfaz las dibuja con su monograma, que es un respaldo deliberado y no un
-- hueco. Al subir esos archivos al sitio, basta un UPDATE como los de abajo.

UPDATE public.navieras SET logo_url = 'https://www.asli.cl/img/cma.webp'      WHERE nombre = 'CMA-CGM';
UPDATE public.navieras SET logo_url = 'https://www.asli.cl/img/cosco.webp'    WHERE nombre = 'COSCO';
UPDATE public.navieras SET logo_url = 'https://www.asli.cl/img/maersk.webp'   WHERE nombre = 'MAERSK';
UPDATE public.navieras SET logo_url = 'https://www.asli.cl/img/msc.webp'      WHERE nombre = 'MSC';
UPDATE public.navieras SET logo_url = 'https://www.asli.cl/img/one.webp'      WHERE nombre = 'ONE';
UPDATE public.navieras SET logo_url = 'https://www.asli.cl/img/oocl.webp'     WHERE nombre = 'OOCL';
UPDATE public.navieras SET logo_url = 'https://www.asli.cl/img/pil.webp'      WHERE nombre = 'PIL';
UPDATE public.navieras SET logo_url = 'https://www.asli.cl/img/wanhai.webp'   WHERE nombre = 'WAN HAI';
UPDATE public.navieras SET logo_url = 'https://www.asli.cl/img/yangming.webp' WHERE nombre = 'YANG MING';
UPDATE public.navieras SET logo_url = 'https://www.asli.cl/img/zim.webp'      WHERE nombre = 'ZIM';

-- Verificación: debe devolver 10 con logo y 4 sin él.
-- SELECT nombre, logo_url FROM public.navieras ORDER BY logo_url NULLS LAST, nombre;
