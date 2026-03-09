# Migración Servicios, Consorcios e Itinerarios → Astro

Carpeta para migrar los tres módulos del proyecto ASLI (Next.js) a un proyecto Astro.

## Contenido

| Archivo | Descripción |
|---------|-------------|
| **MIGRACION-SERVICIOS-CONSORCIOS-ITINERARIOS.md** | Guía de migración completa |
| **FILE-LIST-COMPLETO.md** | Lista de archivos a copiar |
| **lib/supabase-server-astro.ts** | Cliente Supabase para Astro |
| **lib/itinerarios-service.ts** | Servicio (ya con `import.meta.env`) |
| **types/itinerarios.ts** | Tipos TypeScript |
| **api-templates/** | Plantillas API para Astro |
| **scripts/ORDEN-EJECUCION-SQL.md** | Orden de ejecución SQL |

## Uso

1. Lee **MIGRACION-SERVICIOS-CONSORCIOS-ITINERARIOS.md**
2. Ejecuta los SQL en orden (ver **scripts/ORDEN-EJECUCION-SQL.md**)
3. Copia archivos según **FILE-LIST-COMPLETO.md**
4. Usa las plantillas en **api-templates/** como base

## Dependencias

```bash
npm install @supabase/supabase-js @supabase/ssr react react-dom lucide-react jspdf html2canvas maplibre-gl react-map-gl
```
