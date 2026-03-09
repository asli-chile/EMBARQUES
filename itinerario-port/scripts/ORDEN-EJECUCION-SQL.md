# Orden de ejecución de scripts SQL

Ejecutar en Supabase SQL Editor **en este orden**:

## Dependencias previas (si no existen)

- `catalogos_navieras` – tabla de navieras (referenciada por servicios_unicos)
- `catalogos_naves` – naves por naviera
- `registros` – opcional, para POLs

## Orden recomendado

1. **create-catalogos-destinos-table.sql** – Destinos (PODs)
2. **create-servicios-unicos-table.sql** – Requiere `catalogos_navieras`
3. **add-puerto-origen-servicios-unicos.sql** – Añade `puerto_origen` a servicios_unicos
4. **create-consorcios-table.sql** – Requiere `servicios_unicos`
5. **create-itinerarios-table.sql** – Itinerarios base
6. **add-naviera-itinerarios.sql** – Columna naviera en itinerarios
7. **add-area-to-itinerario-escalas.sql** – Columna area en escalas

## Ubicación de scripts

Todos están en: `../ASLI/scripts/` (proyecto original)
