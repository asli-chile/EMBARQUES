-- ─────────────────────────────────────────────────────────────────────────────
-- Temporada fija por empresa cliente
--
-- Un cliente con `temporada_fija` siempre consulta esa temporada en su propio
-- dashboard, sin importar cuál esté activa globalmente (ver
-- src/lib/useTemporadaActiva.ts). Como sus operaciones quedan en una temporada
-- distinta de la activa, los módulos que filtran por la temporada activa
-- (Dashboard, Reportes, Finanzas, Inicio, etc.) las excluyen automáticamente
-- del histórico y de los indicadores globales.
--
-- Caso de uso: ASLI se usa como perfil de demostración/marketing. No debe
-- sumar al histórico ni a los indicadores generales de la temporada en curso,
-- pero debe verse completo al entrar con la cuenta cliente ASLI.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS temporada_fija text;

COMMENT ON COLUMN public.empresas.temporada_fija IS
  'Si está definida, el dashboard de este cliente usa siempre esta temporada en vez de la temporada activa global. Sus operaciones quedan fuera de los indicadores generales porque su temporada no coincide con la activa.';

-- ─── Temporada "asli" ──────────────────────────────────────────────────────

INSERT INTO public.temporadas (nombre, descripcion, activa)
VALUES ('asli', 'Perfil de demostración del cliente ASLI: no suma al histórico ni a los indicadores globales.', false)
ON CONFLICT (lower(btrim(nombre))) DO NOTHING;

UPDATE public.empresas
   SET temporada_fija = 'asli'
 WHERE lower(btrim(nombre)) = 'asli';
