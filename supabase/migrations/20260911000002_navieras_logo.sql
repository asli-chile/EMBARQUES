-- ─── Logo de la naviera ──────────────────────────────────────────────────────
--
-- NaviTrack muestra la naviera con su marca en la cabecera del embarque. Hasta
-- ahora `navieras` solo guardaba el nombre, así que no había de dónde sacar una
-- imagen.
--
-- `logo_url` acepta una URL pública (CDN de la naviera, o un archivo subido al
-- storage del proyecto). Mientras esté vacía, la interfaz dibuja un monograma
-- con las iniciales y un color estable derivado del nombre: nunca queda un hueco
-- ni un ícono genérico.

ALTER TABLE public.navieras
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.navieras.logo_url IS
  'URL pública del logo de la naviera. NULL = la UI usa un monograma con las iniciales.';

-- Verificación:
-- SELECT nombre, logo_url FROM public.navieras ORDER BY nombre;
