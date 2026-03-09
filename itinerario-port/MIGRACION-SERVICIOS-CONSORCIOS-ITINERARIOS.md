# Migración completa: Servicios, Consorcios e Itinerarios → Astro

Esta guía describe cómo migrar los tres módulos del proyecto ASLI (Next.js) a un proyecto Astro.

---

## 1. Módulos incluidos

| Módulo | Descripción | Tablas BD |
|--------|-------------|-----------|
| **Servicios únicos** | CRUD servicios por naviera (naves, destinos) | `servicios_unicos`, `servicios_unicos_naves`, `servicios_unicos_destinos` |
| **Consorcios** | Agrupación de servicios únicos | `consorcios`, `consorcios_servicios`, `consorcios_destinos_activos` |
| **Itinerarios** | Viajes con escalas, ETD/ETA | `itinerarios`, `itinerario_escalas` |

---

## 2. Orden de migración

### Paso 1: Base de datos (Supabase)

Ejecutar los scripts SQL **en este orden** en el SQL Editor de Supabase:

1. `create-catalogos-destinos-table.sql` (destinos PODs)
2. Catálogos de navieras y naves (si no existen)
3. `create-servicios-unicos-table.sql`
4. `add-puerto-origen-servicios-unicos.sql`
5. `create-consorcios-table.sql`
6. `create-itinerarios-table.sql`
7. `add-naviera-itinerarios.sql`
8. `add-area-to-itinerario-escalas.sql`

### Paso 2: API routes (Astro)

En Astro, crear endpoints en `src/pages/api/`:

- `api/admin/servicios-unicos.ts` – GET, POST, PUT, DELETE
- `api/admin/consorcios.ts` – GET, POST, PUT, DELETE
- `api/admin/itinerarios.ts` – GET, POST
- `api/public/itinerarios.ts` – GET

**Configuración Astro**: `astro.config.mjs` debe tener `output: 'server'` o `output: 'hybrid'` para SSR.

En cada ruta de API usar:
```ts
export const prerender = false;
```

### Paso 3: Componentes React (Islands)

Copiar con `client:load` o `client:visible`:

**Itinerarios:**
- `ItinerarioFilters`, `ItinerarioTable`, `ItinerarioCard`
- `VoyageDrawer`, `ItinerarioMap`
- `ItinerariosManager`

**Servicios y consorcios:**
- `ServiciosUnicosManager`
- `ConsorciosManager`

### Paso 4: Servicios y tipos

- `src/types/itinerarios.ts`
- `src/lib/itinerarios-service.ts`
- `src/lib/port-coordinates.ts`
- `src/lib/generate-itinerario-pdf.ts`

---

## 3. Adaptaciones Astro vs Next.js

| Aspecto | Next.js | Astro |
|---------|---------|-------|
| Variables de entorno | `process.env.NEXT_PUBLIC_*` | `import.meta.env.PUBLIC_*` |
| Respuesta API | `NextResponse.json(data)` | `new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })` |
| Cookies (server) | `cookies()` de `next/headers` | `Astro.cookies` en el contexto del endpoint |
| Supabase server client | `createServerClient` con cookies de Next | `createServerClient` con `Astro.cookies` |

---

## 4. Dependencias NPM

```bash
npm install @supabase/supabase-js @supabase/ssr react react-dom lucide-react jspdf html2canvas maplibre-gl react-map-gl
```

---

## 5. Variables de entorno

```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PUBLIC_API_URL=
```

---

## 6. Tablas dependientes

Los módulos usan estas tablas adicionales:

- `catalogos_navieras` – catálogo de navieras
- `catalogos_naves` – naves por naviera
- `catalogos_destinos` – puertos de destino
- `registros` – para POLs (opcional si hay otra fuente)

---

## 7. Archivos a copiar (rutas desde ASLI)

Ver `FILE-LIST-COMPLETO.md` para la lista detallada.
