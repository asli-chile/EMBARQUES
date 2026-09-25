-- Uso del plan de Claude en la barra superior del ERP, solo para Rodrigo Cáceres.
--
-- El dato no sale del ERP: sale de la sesión de Claude Code guardada en el PC de
-- Rodrigo, que el ERP (en Vercel) no puede leer. Un widget de escritorio lo
-- consulta cada minuto y lo sube acá; el header lo lee.
--
-- ─── Quién escribe ──────────────────────────────────────────────────────────
--
-- El widget no tiene sesión del ERP, así que escribe como `anon` a través de
-- `claude_uso_reportar`, que exige una clave. La tabla en sí no se escribe desde
-- ningún rol: solo la función (SECURITY DEFINER) la toca.
--
-- En la base se guarda el **hash** de la clave, en `private`, y no se siembra en
-- esta migración: el hash se carga aparte para que no quede en el repo. Mientras
-- no se cargue, la función rechaza todo.
--
-- ─── Quién lee ──────────────────────────────────────────────────────────────
--
-- Solo la cuenta rodrigo.caceres@asli.cl, por RLS. Que el header se oculte para
-- los demás es cosmético; esta política es la barrera. `anon` no tiene GRANT.

CREATE TABLE IF NOT EXISTS public.claude_uso (
  id               smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sesion_pct       numeric,
  sesion_reinicia  timestamptz,
  semana_pct       numeric,
  semana_reinicia  timestamptz,
  actualizado      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.claude_uso IS
  'Uso del plan de Claude de Rodrigo (fila única). Lo sube su widget de escritorio vía claude_uso_reportar.';

ALTER TABLE public.claude_uso ENABLE ROW LEVEL SECURITY;

-- Supabase concede todo a anon/authenticated en tablas nuevas de public.
REVOKE ALL ON public.claude_uso FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.claude_uso TO authenticated;

DROP POLICY IF EXISTS claude_uso_solo_rodrigo ON public.claude_uso;
CREATE POLICY claude_uso_solo_rodrigo ON public.claude_uso
  FOR SELECT TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'rodrigo.caceres@asli.cl');

CREATE TABLE IF NOT EXISTS private.claude_uso_clave (
  id    smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hash  text NOT NULL  -- sha256 hex de la clave del widget
);

REVOKE ALL ON private.claude_uso_clave FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claude_uso_reportar(
  p_clave            text,
  p_sesion_pct       numeric,
  p_sesion_reinicia  timestamptz,
  p_semana_pct       numeric,
  p_semana_reinicia  timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_clave IS NULL OR NOT EXISTS (
    SELECT 1 FROM private.claude_uso_clave c
     WHERE c.hash = encode(sha256(convert_to(p_clave, 'UTF8')), 'hex')
  ) THEN
    RAISE EXCEPTION 'clave inválida' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.claude_uso AS u
    (id, sesion_pct, sesion_reinicia, semana_pct, semana_reinicia, actualizado)
  VALUES
    (1, p_sesion_pct, p_sesion_reinicia, p_semana_pct, p_semana_reinicia, now())
  ON CONFLICT (id) DO UPDATE SET
    sesion_pct      = EXCLUDED.sesion_pct,
    sesion_reinicia = EXCLUDED.sesion_reinicia,
    semana_pct      = EXCLUDED.semana_pct,
    semana_reinicia = EXCLUDED.semana_reinicia,
    actualizado     = now();
END;
$$;

REVOKE ALL ON FUNCTION public.claude_uso_reportar(text, numeric, timestamptz, numeric, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claude_uso_reportar(text, numeric, timestamptz, numeric, timestamptz) TO anon, authenticated;

-- Verificación: anon no debe tener ningún privilegio sobre la tabla (0 filas).
-- SELECT privilege_type FROM information_schema.role_table_grants
--  WHERE table_schema = 'public' AND table_name = 'claude_uso' AND grantee = 'anon';
