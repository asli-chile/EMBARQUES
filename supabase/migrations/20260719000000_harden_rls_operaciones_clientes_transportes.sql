-- Harden RLS: remove overly permissive policies and enable RLS where missing
-- 20260719000000_harden_rls_operaciones_clientes_transportes.sql

-- 1) operaciones: drop policies that allow unrestricted ALL/SELECT
DROP POLICY IF EXISTS "Allow write operaciones" ON public.operaciones;
DROP POLICY IF EXISTS "Allow read operaciones" ON public.operaciones;
DROP POLICY IF EXISTS "Allow public read access to operaciones" ON public.operaciones;

-- 2) clientes: enable RLS so existing policies take effect
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- 3) transportes_reservas_ext: replace global SELECT with staff-only
DROP POLICY IF EXISTS "Auth lee transportes_reservas_ext" ON public.transportes_reservas_ext;
CREATE POLICY "Staff lee transportes_reservas_ext"
  ON public.transportes_reservas_ext FOR SELECT TO authenticated
  USING (public.is_admin_or_staff() OR public.is_ejecutivo());

-- 4) documentos: drop unrestricted public/auth write policies (keep role-based)
DROP POLICY IF EXISTS "public_delete" ON public.documentos;
DROP POLICY IF EXISTS "public_insert" ON public.documentos;
DROP POLICY IF EXISTS "public_update" ON public.documentos;
DROP POLICY IF EXISTS "docs_delete_auth" ON public.documentos;
DROP POLICY IF EXISTS "docs_insert_auth" ON public.documentos;
DROP POLICY IF EXISTS "docs_update_auth" ON public.documentos;
DROP POLICY IF EXISTS "docs_select_anon" ON public.documentos;
DROP POLICY IF EXISTS "docs_select_auth" ON public.documentos;
