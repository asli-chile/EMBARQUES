# Lista de Archivos para Copiar

Rutas relativas al proyecto ASLI (`c:\...\ASLI`).

## Tipos
| Copiar desde | Destino en Astro |
|--------------|------------------|
| `src/types/itinerarios.ts` | `src/types/itinerarios.ts` |

## Servicios / Lib
| Copiar desde | Destino | Notas |
|--------------|---------|-------|
| `src/lib/itinerarios-service.ts` | `src/lib/itinerarios-service.ts` | Cambiar `process.env.NEXT_PUBLIC_API_URL` por `import.meta.env.PUBLIC_API_URL` |
| `src/lib/generate-itinerario-pdf.ts` | `src/lib/generate-itinerario-pdf.ts` | Depende de jspdf, html2canvas |
| `src/lib/port-coordinates.ts` | `src/lib/port-coordinates.ts` | Completo, sin dependencias externas |

## Componentes (todos requieren `client:load` en Astro)
| Copiar desde | Destino |
|--------------|---------|
| `src/components/itinerario/ItinerarioFilters.tsx` | `src/components/itinerario/ItinerarioFilters.tsx` |
| `src/components/itinerario/ItinerarioTable.tsx` | `src/components/itinerario/ItinerarioTable.tsx` |
| `src/components/itinerario/ItinerarioCard.tsx` | `src/components/itinerario/ItinerarioCard.tsx` |
| `src/components/itinerario/VoyageDrawer.tsx` | `src/components/itinerario/VoyageDrawer.tsx` |
| `src/components/itinerario/ItinerarioMap.tsx` | `src/components/itinerario/ItinerarioMap.tsx` |
| `src/components/itinerarios/ItinerariosManager.tsx` | `src/components/itinerarios/ItinerariosManager.tsx` |
| `src/components/itinerarios/ServiciosUnicosManager.tsx` | `src/components/itinerarios/ServiciosUnicosManager.tsx` |
| `src/components/itinerarios/ConsorciosManager.tsx` | `src/components/itinerarios/ConsorciosManager.tsx` |

## Páginas (como referencia / adaptar)
| Copiar desde | Uso |
|--------------|-----|
| `app/itinerario/page.tsx` | Página principal privada – adaptar layout, auth, sidebar |
| `app/itinerario-asli/page.tsx` | Vista pública – más simple, sin auth |

## API Routes (Next.js → Astro endpoints o servidor externo)
| Archivo original | Acción |
|------------------|--------|
| `app/api/admin/itinerarios/route.ts` | Crear `src/pages/api/admin/itinerarios.ts` en Astro (o API externa) |
| `app/api/public/itinerarios/route.ts` | Crear `src/pages/api/public/itinerarios.ts` |
| `app/api/admin/servicios-unicos/route.ts` | Necesario para ItinerariosManager, VoyageDrawer |
| `app/api/admin/consorcios/route.ts` | Necesario para ItinerariosManager, ConsorciosManager |

## Dependencias de componentes
- **ItinerarioTable, VoyageDrawer, ItinerariosManager**: `createClient` (Supabase), `useTheme`, `useToast`
- **ItinerarioMap**: `react-map-gl`, `maplibre-gl`, `port-coordinates`
- **ItinerarioFilters**: Solo tipos, sin hooks externos (opcional: useTheme)
- **generate-itinerario-pdf**: `jspdf`, `html2canvas`

## Contextos / hooks a implementar
| Archivo en ASLI | Requerido para |
|-----------------|----------------|
| `src/contexts/ThemeContext.tsx` | ItinerarioTable, VoyageDrawer, ItinerarioCard, ItinerarioMap, ItinerariosManager |
| `src/hooks/useToast.tsx` | VoyageDrawer |
| `src/lib/supabase-browser.ts` | VoyageDrawer, ItinerariosManager, ItinerarioTable |
