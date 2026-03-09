# Lista completa de archivos para migración

Rutas relativas al proyecto ASLI.

---

## API Routes (copiar y adaptar a formato Astro)

| Origen | Destino Astro |
|--------|---------------|
| `app/api/admin/servicios-unicos/route.ts` | `src/pages/api/admin/servicios-unicos.ts` |
| `app/api/admin/consorcios/route.ts` | `src/pages/api/admin/consorcios.ts` |
| `app/api/admin/itinerarios/route.ts` | `src/pages/api/admin/itinerarios.ts` |
| `app/api/public/itinerarios/route.ts` | `src/pages/api/public/itinerarios.ts` |

---

## Componentes

| Origen | Destino | Notas |
|--------|---------|-------|
| `src/components/itinerario/ItinerarioFilters.tsx` | `src/components/itinerario/` | client:load |
| `src/components/itinerario/ItinerarioTable.tsx` | `src/components/itinerario/` | client:load |
| `src/components/itinerario/ItinerarioCard.tsx` | `src/components/itinerario/` | client:load |
| `src/components/itinerario/VoyageDrawer.tsx` | `src/components/itinerario/` | client:load |
| `src/components/itinerario/ItinerarioMap.tsx` | `src/components/itinerario/` | client:load |
| `src/components/itinerarios/ItinerariosManager.tsx` | `src/components/itinerarios/` | client:load |
| `src/components/itinerarios/ServiciosUnicosManager.tsx` | `src/components/itinerarios/` | client:load |
| `src/components/itinerarios/ConsorciosManager.tsx` | `src/components/itinerarios/` | client:load |

---

## Tipos

| Origen | Destino |
|--------|---------|
| `src/types/itinerarios.ts` | `src/types/itinerarios.ts` |

---

## Servicios / lib

| Origen | Destino | Adaptación |
|--------|---------|------------|
| `src/lib/itinerarios-service.ts` | `src/lib/itinerarios-service.ts` | `process.env` → `import.meta.env` |
| `src/lib/port-coordinates.ts` | `src/lib/port-coordinates.ts` | Sin cambios |
| `src/lib/generate-itinerario-pdf.ts` | `src/lib/generate-itinerario-pdf.ts` | Sin cambios |

---

## Supabase (adaptar para Astro)

| Origen | Destino | Adaptación |
|--------|---------|------------|
| `src/lib/supabase-browser.ts` | `src/lib/supabase-browser.ts` | Compatible |
| `src/lib/supabase-server.ts` | `src/lib/supabase-server.ts` | Usar `Astro.cookies` en vez de `cookies()` de Next |

---

## Contextos y hooks

| Origen | Destino | Uso |
|--------|---------|-----|
| `src/contexts/ThemeContext.tsx` | `src/contexts/` | Tema claro/oscuro |
| `src/hooks/useToast.tsx` | `src/hooks/` | Notificaciones |
| `src/hooks/useUser.tsx` | `src/hooks/` | Opcional, según auth |

---

## Scripts SQL (ejecutar en Supabase en este orden)

| Script | Dependencias |
|--------|--------------|
| `scripts/create-catalogos-destinos-table.sql` | - |
| `scripts/create-servicios-unicos-table.sql` | catalogos_navieras |
| `scripts/add-puerto-origen-servicios-unicos.sql` | servicios_unicos |
| `scripts/create-consorcios-table.sql` | servicios_unicos |
| `scripts/create-itinerarios-table.sql` | - |
| `scripts/add-naviera-itinerarios.sql` | itinerarios |
| `scripts/add-area-to-itinerario-escalas.sql` | itinerario_escalas |

---

## Páginas de referencia

| Origen | Uso |
|--------|-----|
| `app/itinerario/page.tsx` | Página principal itinerarios (adaptar layout) |
| `app/itinerario-asli/page.tsx` | Vista pública (solo lectura) |
