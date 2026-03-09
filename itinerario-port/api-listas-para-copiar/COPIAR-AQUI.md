# Dónde copiar estos archivos en tu proyecto Astro

En tu proyecto Astro (donde ya ejecutaste los SQL), haz lo siguiente.

## 1. Crear carpetas

```
src/
  lib/
  pages/
    api/
      public/
      admin/
```

## 2. Copiar archivos

| Desde esta carpeta (api-listas-para-copiar) | Hacia tu proyecto Astro |
|---------------------------------------------|-------------------------|
| (raíz itinerario-port) **lib/supabase-server-astro.ts** | **src/lib/supabase-server-astro.ts** |
| (raíz itinerario-port) **lib/itinerarios-service.ts** | **src/lib/itinerarios-service.ts** |
| (raíz itinerario-port) **types/itinerarios.ts** | **src/types/itinerarios.ts** |
| **api/public/itinerarios.ts** | **src/pages/api/public/itinerarios.ts** |
| **api/admin/itinerarios.ts** | **src/pages/api/admin/itinerarios.ts** |
| **api/admin/servicios-unicos.ts** | **src/pages/api/admin/servicios-unicos.ts** |
| **api/admin/consorcios.ts** | **src/pages/api/admin/consorcios.ts** |

## 3. Ajustar imports en las APIs

En **src/pages/api/admin/itinerarios.ts**, **servicios-unicos.ts** y **consorcios.ts** el import del cliente Supabase es:

```ts
import { createSupabaseServerClient } from '../../../lib/supabase-server-astro';
```

Si tu `supabase-server-astro.ts` está en `src/lib/`, esa ruta es correcta. Si usas alias `@/lib`, cámbialo a:

```ts
import { createSupabaseServerClient } from '@/lib/supabase-server-astro';
```

## 4. Variables de entorno

En la raíz del proyecto Astro, archivo **.env**:

```
PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PUBLIC_API_URL=http://localhost:4321
```

## 5. Probar

```bash
npm run dev
```

Abre en el navegador:

- **http://localhost:4321/api/public/itinerarios**  
  Deberías ver algo como: `{"success":true,"itinerarios":[]}` (o con datos si ya hay en la BD).

Si esa URL responde bien, las tablas y las variables de entorno están correctas. Las rutas `/api/admin/*` requieren estar logueado con Supabase (cookies).
