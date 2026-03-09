# Pasos después de ejecutar los SQL

Ya ejecutaste los scripts en Supabase. Sigue estos pasos en tu **proyecto Astro**.

---

## Paso 1: Verificar que tienes proyecto Astro

Si aún no tienes el proyecto:

```bash
npm create astro@latest
# Elegir: Empty, TypeScript strict, npm, y cuando pregunte "How would you like to start?" → con "Server-side rendering (SSR)"
```

Si ya tienes el proyecto, asegúrate de que en `astro.config.mjs` esté:

```js
export default defineConfig({
  output: 'server',  // o 'hybrid'
  // ...
});
```

---

## Paso 2: Variables de entorno

En la raíz del proyecto Astro crea `.env` (o `.env.local`):

```env
PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
PUBLIC_API_URL=http://localhost:4321
```

En producción, cambia `PUBLIC_API_URL` por la URL de tu sitio (ej: `https://tudominio.com`).

---

## Paso 3: Instalar dependencias

```bash
npm install @supabase/supabase-js @supabase/ssr react lucide-react
```

Para itinerarios con mapa y PDF (opcional después):

```bash
npm install maplibre-gl react-map-gl jspdf html2canvas
```

---

## Paso 4: Crear la estructura de carpetas

En tu proyecto Astro crea (si no existen):

```
src/
  lib/
  pages/
    api/
      admin/
      public/
  components/
    itinerario/
    itinerarios/
  types/
```

---

## Paso 5: Copiar archivos listos para pegar

Dentro de `itinerario-port` hay una carpeta **api-listas-para-copiar** con las APIs ya adaptadas para Astro. Abre **api-listas-para-copiar/COPIAR-AQUI.md** y sigue la tabla de archivos.

Resumen: copia a tu Astro
- `lib/supabase-server-astro.ts` → `src/lib/`
- `lib/itinerarios-service.ts` → `src/lib/`
- `types/itinerarios.ts` → `src/types/`
- `api-listas-para-copiar/api/public/itinerarios.ts` → `src/pages/api/public/itinerarios.ts`
- `api-listas-para-copiar/api/admin/*.ts` → `src/pages/api/admin/`

---

## Paso 6: Crear las API routes

Necesitas 4 endpoints. En la carpeta `itinerario-port` hay plantillas; aquí tienes el **mínimo para que funcione**:

- **src/pages/api/admin/servicios-unicos.ts** → GET y POST (plantilla en `api-templates/admin-servicios-unicos.ts`)
- **src/pages/api/admin/consorcios.ts** → GET (y luego POST/PUT/DELETE si los usas)
- **src/pages/api/admin/itinerarios.ts** → GET y POST
- **src/pages/api/public/itinerarios.ts** → GET (público, sin auth)

Cada archivo debe tener al inicio:

```ts
export const prerender = false;
```

Y usar `createSupabaseServerClient({ cookies, request })` para auth y `createClient(url, serviceRoleKey)` para operaciones de admin.

---

## Paso 7: Probar que las APIs responden

Con el servidor corriendo (`npm run dev`):

1. **Público (sin login):** abre en el navegador:  
   `http://localhost:4321/api/public/itinerarios`  
   Deberías ver JSON (aunque sea `{ itinerarios: [] }` si no hay datos).

2. **Admin (con login):** las rutas bajo `/api/admin/` requieren que el usuario esté logueado con Supabase (cookies). Si no tienes auth aún, puedes temporalmente comentar la validación en esas rutas para probar.

---

## Paso 8: Página de itinerarios (sencilla)

Crea `src/pages/itinerario.astro`:

```astro
---
export const prerender = false;
// Opcional: si tienes auth, redirigir si no está logueado
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Itinerarios</title>
  </head>
  <body>
    <h1>Itinerarios</h1>
    <p>Cargando...</p>
    <div id="itinerarios-root"></div>
    <script>
      fetch('/api/public/itinerarios')
        .then(r => r.json())
        .then(data => {
          const root = document.getElementById('itinerarios-root');
          if (root) root.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        });
    </script>
  </body>
</html>
```

Abre `http://localhost:4321/itinerario`. Si ves el JSON de itinerarios (o `{ itinerarios: [] }`), las APIs y Supabase están bien conectados.

---

## Paso 9: Añadir componentes React (cuando quieras la UI completa)

1. Instalar integración React en Astro:

```bash
npx astro add react
```

2. Copiar desde el proyecto ASLI (Next) a tu Astro:

- `src/components/itinerario/` → tus `src/components/itinerario/`
- `src/components/itinerarios/` → tus `src/components/itinerarios/`
- `src/lib/port-coordinates.ts` y `src/lib/generate-itinerario-pdf.ts` si usas mapa/PDF

3. En las páginas Astro usar los componentes con `client:load`:

```astro
---
import ItinerarioFilters from '../components/itinerario/ItinerarioFilters';
import ItinerarioTable from '../components/itinerario/ItinerarioTable';
---
<ItinerarioFilters ... />
<ItinerarioTable client:load ... />
```

4. Ajustar imports: en los componentes que usen `@/lib/...` o `@/types/...`, configurar el alias en `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

## Resumen rápido

| Ya hiciste | Siguiente |
|------------|-----------|
| ✅ SQL en Supabase | 1. Verificar `output: 'server'` en astro.config |
| | 2. Crear `.env` con Supabase URL y keys |
| | 3. `npm install @supabase/supabase-js @supabase/ssr react lucide-react` |
| | 4. Copiar `lib/` y `types/` desde itinerario-port |
| | 5. Crear las 4 API routes (empezar por public/itinerarios) |
| | 6. Probar `/api/public/itinerarios` en el navegador |
| | 7. Crear página itinerario.astro de prueba |

Si me dices en qué paso estás (por ejemplo “ya tengo el proyecto y el .env”), te digo el siguiente archivo que crear y su contenido exacto.
