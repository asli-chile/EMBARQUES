# Supabase – EMBARQUES

## Migraciones

Para aplicar las migraciones en tu proyecto Supabase:

### Opción A: Supabase CLI (local)

```bash
supabase link   # Conectar a tu proyecto
supabase db push
```

### Opción B: SQL Editor en el dashboard

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto.
2. **SQL Editor** → New query.
3. Copiar y ejecutar el contenido de `migrations/20250225000001_create_clientes.sql`.

---

## Tabla `clientes`

| Columna          | Tipo     | Descripción              |
|------------------|----------|--------------------------|
| id               | uuid     | PK, generado automático  |
| nombre_cliente   | text     | Nombre del cliente       |
| contacto         | text     | Información de contacto  |
| rut_empresa      | text     | RUT de la empresa        |
| giro             | text     | Giro comercial           |
| created_at       | timestamptz | Fecha de creación    |
| updated_at       | timestamptz | Última actualización  |

La columna **usuario(s)** se vinculará cuando exista la tabla `usuarios` (relación muchos a muchos).
