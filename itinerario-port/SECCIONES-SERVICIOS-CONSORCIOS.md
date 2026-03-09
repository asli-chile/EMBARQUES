# Secciones: Servicios por naviera y Consorcios

Se han añadido las secciones para **crear y gestionar servicios por naviera** y **consorcios** en tu proyecto Astro, siguiendo la lógica de ASLI.

## Qué incluye

### 1. Tipos y lib
- **`types/servicios.ts`** – Tipos: `ServicioUnico`, `Consorcio`, `ServicioUnicoFormData`, `ConsorcioFormData`.
- **`lib/supabase-browser.ts`** – Cliente Supabase para el navegador (catálogos: navieras, destinos). Usa `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`.

### 2. Componentes React (islands)
- **`components/ServiciosPorNaviera.tsx`** – Lista de servicios únicos, botón «Nuevo servicio», modal crear/editar con:
  - Nombre, naviera (select), puerto de origen (POL), naves (lista), destinos (lista con código y área).
- **`components/ConsorciosSection.tsx`** – Lista de consorcios, botón «Nuevo consorcio», modal crear/editar con:
  - Nombre, descripción, lista de servicios únicos (añadir desde dropdown, quitar).
- **`components/GestionPage.tsx`** – Pestañas «Servicios por naviera» | «Consorcios» y render de los dos paneles.

### 3. Página Astro
- **`pages/gestion.astro`** – Página que usa `<GestionPage client:load />`. Ruta final: `/gestion`.

### 4. APIs (ya en `api-listas-para-copiar`)
- **`api/admin/servicios-unicos.ts`** – GET (lista), POST (crear), PUT (editar), DELETE (eliminar).
- **`api/admin/consorcios.ts`** – GET (lista), POST (crear), PUT (editar), DELETE (eliminar).

## Cómo llevarlo a tu proyecto Astro

1. **Dependencias**
   - React en Astro: `npx astro add react`.
   - `lucide-react` para iconos: `npm i lucide-react`.
   - Supabase: `@supabase/supabase-js` (y si usas SSR, `@supabase/ssr`).

2. **Estructura de carpetas sugerida**
   - `src/types/servicios.ts`
   - `src/lib/supabase-browser.ts`
   - `src/components/ServiciosPorNaviera.tsx`, `ConsorciosSection.tsx`, `GestionPage.tsx`
   - `src/pages/gestion.astro` (o `src/pages/admin/gestion.astro`)
   - `src/pages/api/admin/servicios-unicos.ts`, `consorcios.ts` (copiados desde `api-listas-para-copiar`).

3. **Imports en componentes**
   - En `ServiciosPorNaviera.tsx` y `ConsorciosSection.tsx` se usan rutas relativas a `../lib/supabase-browser` y `../types/servicios`. Si en Astro tus `types` y `lib` están en `src/`, ajusta a:
     - `@/lib/supabase-browser` y `@/types/servicios` si tienes alias `@` → `src/`.

4. **Variables de entorno**
   - `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (para supabase-browser y catálogos).
   - `PUBLIC_API_URL` (base URL del sitio, para llamadas a `/api/admin/...`).
   - `SUPABASE_SERVICE_ROLE_KEY` (solo en servidor, para las rutas API).

5. **Base de datos**
   - Tablas y scripts según `scripts/ORDEN-EJECUCION-SQL.md` (servicios_unicos, servicios_unicos_naves, servicios_unicos_destinos, consorcios, consorcios_servicios, consorcios_destinos_activos, catalogos_navieras, catalogos_destinos, etc.).

## Comportamiento resumido

- **Servicios por naviera:** un servicio tiene nombre, naviera, POL, lista de naves y lista de destinos (puerto + área). Se listan en tarjetas con editar/eliminar.
- **Consorcios:** un consorcio tiene nombre, descripción opcional y varios servicios únicos. En el modal se eligen desde un desplegable y se puede quitar cada uno. Al guardar, la API crea/actualiza `consorcios`, `consorcios_servicios` y `consorcios_destinos_activos`.

Si quieres flujos distintos (por ejemplo, “convertir un servicio en consorcio” o “copiar naves/destinos de otro servicio”), se puede extender sobre estos componentes y APIs.
