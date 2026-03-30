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

---

## Edge Function `send-email` (secrets)

Además de `GOOGLE_SERVICE_ACCOUNT`, puedes definir en **Project Settings → Edge Functions → Secrets**:

| Secret | Descripción |
|--------|-------------|
| `GMAIL_SHARED_FROM_EMAIL` | Buzón desde el que se envía el **correo informativo** (por defecto `informaciones@asli.cl`). |
| `GMAIL_SHARED_FROM_NAME` | Nombre visible en `From` para ese buzón (por defecto `ASLI`). |

La cuenta de servicio de Google debe tener **delegación de dominio** para poder impersonar ese buzón (mismo alcance que el resto de @asli.cl).
