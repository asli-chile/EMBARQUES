# Scripts SQL para el módulo de itinerarios

Ejecutar en el SQL Editor de Supabase **en este orden**:

1. `../ASLI/scripts/create-itinerarios-table.sql`
2. `../ASLI/scripts/add-naviera-itinerarios.sql`
3. `../ASLI/scripts/add-area-to-itinerario-escalas.sql`

Para funcionalidad completa (servicios, consorcios, catálogos):

4. `../ASLI/scripts/create-catalogos-destinos-table.sql`
5. `../ASLI/scripts/create-servicios-unicos-table.sql`
6. `../ASLI/scripts/create-consorcios-table.sql`
7. `../ASLI/scripts/create-servicios-table.sql` (si aplica)
8. Otras migraciones según la documentación del proyecto ASLI

Las rutas son relativas a esta carpeta (itinerario-port/scripts/).
