# Diagnóstico 403 en tabla clientes

Si al entrar en **Configuración → Clientes** ves 403 (Forbidden), sigue estos pasos en el **SQL Editor** de Supabase.

## 1. Comprobar políticas en `clientes`

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'clientes';
```

Debe aparecer al menos una política que permita SELECT (por ejemplo "Superadmin acceso total a clientes" o "Superadmin y staff ven todos los clientes").

## 2. Aplicar el fix de políticas (migración 008)

Copia y ejecuta el contenido de:

`supabase/migrations/20260303000008_fix_clientes_403.sql`

O ejecuta directamente:

```sql
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN AS $$
  SELECT get_user_rol() IN ('superadmin', 'admin', 'operador', 'usuario');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS "Superadmin acceso total a clientes" ON clientes;
CREATE POLICY "Superadmin acceso total a clientes"
  ON clientes FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.activo = true
        AND trim(both from coalesce(u.rol::text, '')) = 'superadmin'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.activo = true
        AND trim(both from coalesce(u.rol::text, '')) = 'superadmin'
    )
  );
```

## 3. Comprobar tu usuario

Tu usuario debe tener `auth_id` rellenado y `rol = 'superadmin'`:

```sql
SELECT id, email, rol, activo, auth_id
FROM public.usuarios
WHERE email = 'rodrigo.caceres@asli.cl';
```

- `auth_id` no debe ser NULL (debe coincidir con el id de `auth.users`).
- `rol` debe ser `'superadmin'`.

Si `auth_id` es NULL, enlázalo así (sustituye el email si usas otro):

```sql
UPDATE public.usuarios
SET auth_id = (SELECT id FROM auth.users WHERE email = 'rodrigo.caceres@asli.cl' LIMIT 1),
    rol = 'superadmin'
WHERE email = 'rodrigo.caceres@asli.cl';
```

## 4. Probar con política permisiva (solo diagnóstico)

Para comprobar si el 403 se debe a RLS o a que la petición va sin sesión, puedes crear **temporalmente** una política que permita a cualquier usuario autenticado leer clientes:

```sql
DROP POLICY IF EXISTS "TEMP authenticated read clientes" ON clientes;
CREATE POLICY "TEMP authenticated read clientes"
  ON clientes FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
```

- Si tras esto el 403 **desaparece**: el problema era la condición de la política (superadmin/auth_id). Ajusta el usuario y la política del paso 2 y luego **borra** esta política temporal:

  ```sql
  DROP POLICY IF EXISTS "TEMP authenticated read clientes" ON clientes;
  ```

- Si el 403 **sigue**: la petición probablemente va sin JWT. Revisa en el navegador: pestaña **Network** → petición a `rest/v1/clientes` → Headers → que exista `Authorization: Bearer eyJ...`.

## 5. Después de cambiar políticas o usuario

Cierra sesión en la app, vuelve a iniciar sesión y recarga la página de Clientes.
