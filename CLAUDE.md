# EMBARQUES — ASLI (Asesorías y Servicios Logísticos Integrales)

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Astro 5 (SSG/SSR) + React 19 (islands `client:load`) |
| Estilos | Tailwind CSS v4 |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth + tabla `usuarios` con roles |
| Exportación Excel | `xlsx-js-style` (fork estilizado de SheetJS) |
| Iconos | `@iconify/react` (prefijo `lucide:` y `typcn:`) |
| Fechas | `date-fns` + locale `es` |
| Routing | Astro file-based (`src/pages/**/*.astro`) |

---

## Estructura de Directorios

```
src/
├── components/
│   ├── configuracion/       # CRUD de configuración del sistema
│   │   ├── ConsignatariosContent.tsx
│   │   ├── ClientesContent.tsx
│   │   ├── TransportesContent.tsx
│   │   └── ...
│   ├── transportes/         # Módulo de transportes
│   │   ├── ReservaAsliContent.tsx    # Asignación de unidades/chofer
│   │   ├── ReservaExtContent.tsx     # Reservas externas
│   │   ├── FacturacionContent.tsx    # Facturación proforma
│   │   └── FacturasTransporteContent.tsx  # Registro de facturas emitidas
│   ├── reservas/            # Operaciones de carga
│   ├── documentos/          # Generación de documentos
│   ├── itinerario/          # Itinerarios navieros
│   ├── ui/                  # Componentes reutilizables (Combobox, etc.)
│   └── layout/              # Sidebar, TopBar, etc.
├── pages/
│   ├── index.astro           # Redirect a /inicio o /auth/login
│   ├── dashboard.astro
│   ├── transportes/
│   │   ├── reserva-asli.astro
│   │   ├── reserva-ext.astro
│   │   ├── facturacion.astro
│   │   └── facturas.astro
│   ├── configuracion/
│   │   ├── consignatarios.astro
│   │   ├── clientes.astro
│   │   ├── transportes.astro
│   │   └── usuarios.astro
│   └── auth/
│       ├── login.astro
│       └── registro.astro
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # createClient() para el browser
│   │   └── server.ts         # createServerClient() para SSR
│   ├── auth/
│   │   └── AuthContext.tsx   # useAuth() hook
│   └── i18n/
│       ├── LocaleContext.tsx  # useLocale() hook
│       └── translations.ts   # Claves ES/EN
└── layouts/
    └── BaseLayout.astro      # Layout raíz con Sidebar + TopBar
```

---

## Roles de Usuario

Los roles se almacenan en `public.usuarios.rol` y son verificados por RLS y por el contexto de autenticación.

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `superadmin` | Administrador total | Todo, incluyendo crear itinerarios, consorcios, servicios |
| `admin` | Administrador operativo | CRUD completo excepto secciones superadmin |
| `ejecutivo` | Ejecutivo comercial | Lectura + crear/editar operaciones propias |
| `operador` | Operador logístico | Lectura + edición operaciones asignadas |
| `cliente` | Usuario cliente final | Solo sus propias operaciones (filtrado por empresa) |

### Hook `useAuth()`
```typescript
const {
  user,           // Supabase Auth user
  perfil,         // Row de public.usuarios
  isSuperadmin,   // rol === "superadmin"
  isAdmin,        // rol === "admin"
  isCliente,      // rol === "cliente"
  empresaNombres, // ["EMPRESA A", "EMPRESA B"] — para clientes
  isLoading,
} = useAuth();
```

---

## Base de Datos — Tablas Principales

### `operaciones`
Tabla central del sistema. Cada fila es una operación de exportación.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `correlativo` | int | Auto-incrementado |
| `ref_asli` | text | Referencia ASLI (ej. `ASLI-2026-001`) |
| `cliente` | text | Nombre de la empresa cliente |
| `naviera` | text | Nombre de la naviera |
| `nave` | text | Nombre de la nave |
| `booking` | text | Número de booking |
| `pod` | text | Puerto de destino |
| `etd` | date | Fecha estimada de zarpe |
| `estado_operacion` | text | `abierta`, `cerrada`, `pendiente`, `cancelada` |
| `enviado_transporte` | boolean | Si la op. fue enviada al módulo de transporte |
| `deleted_at` | timestamptz | Soft delete |
| **Transporte** | | |
| `transporte` | text | Empresa de transporte |
| `chofer` | text | Nombre del chofer |
| `rut_chofer` | text | RUT del chofer |
| `telefono_chofer` | text | Teléfono |
| `patente_camion` | text | Patente camión |
| `patente_remolque` | text | Patente remolque |
| `contenedor` | text | Número de contenedor |
| `sello` | text | Número de sello |
| `tara` | numeric | Tara del contenedor |
| `tramo` | text | Origen-Destino del tramo |
| `valor_tramo` | numeric | Valor del tramo |
| `moneda` | text | Moneda del tramo (`CLP`, `USD`, `EUR`) |
| **Facturación** | | |
| `numero_factura_asli` | text | N° factura ASLI (formato `TRA0001`) |
| `factura_transporte` | text | N° factura del transportista |
| `monto_facturado` | numeric | Total facturado (= suma de ítems de proforma) |
| `concepto_facturado` | text | Descripción/concepto |
| `tipo_cambio` | numeric | Tipo de cambio aplicado |
| `margen_estimado` | numeric | Margen estimado |
| `margen_real` | numeric | Margen real |
| `fecha_entrega_factura` | date | Fecha de entrega de factura al cliente |
| `fecha_pago_cliente` | date | Fecha de pago del cliente |
| `fecha_pago_transporte` | date | Fecha de pago al transporte |

### `transportes_empresas`
Empresas de transporte disponibles.

| Columna | Tipo |
|---------|------|
| `id` | uuid |
| `nombre` | text |
| `rut` | text |

### `transportes_choferes`
Choferes por empresa de transporte.

| Columna | Tipo |
|---------|------|
| `id` | uuid |
| `empresa_id` | uuid → `transportes_empresas.id` |
| `nombre` | text |
| `rut` | text |
| `telefono` | text |
| `activo` | boolean |

### `transportes_equipos`
Camiones/remolques por empresa.

| Columna | Tipo |
|---------|------|
| `id` | uuid |
| `empresa_id` | uuid → `transportes_empresas.id` |
| `patente_camion` | text |
| `patente_remolque` | text |
| `activo` | boolean |

### `transportes_tramos`
Tarifario de tramos (origen → destino + valor).

| Columna | Tipo |
|---------|------|
| `id` | uuid |
| `origen` | text |
| `destino` | text |
| `valor` | numeric |
| `moneda` | text |
| `activo` | boolean |

### `transportes_costos_extra`
Catálogo de costos adicionales para la proforma (Falso Flete, Seguro, Conexión Reefer, etc.).

| Columna | Tipo |
|---------|------|
| `id` | uuid |
| `concepto` | text |
| `tarifa_valor` | numeric (nullable) |
| `tarifa_texto` | text (nullable, ej. "según cobro") |
| `moneda` | text |
| `condicion` | text (nullable) |
| `activo` | boolean |

### `consignatarios`
Consignees/Notify parties por cliente.

| Columna | Tipo |
|---------|------|
| `id` | uuid |
| `nombre` | text |
| `cliente` | text |
| `destino` | text |
| `consignee_company` | text |
| `consignee_address` | text |
| `consignee_attn` | text |
| `consignee_uscc` | text |
| `consignee_mobile` | text |
| `consignee_email` | text |
| `consignee_zip` | text |
| `notify_company` | text |
| `notify_address` | text |
| `notify_attn` | text |
| `notify_uscc` | text |
| `notify_mobile` | text |
| `notify_email` | text |
| `notify_zip` | text |
| `activo` | boolean |
| `notas` | text |

### `usuarios`
Perfiles extendidos de usuarios autenticados.

| Columna | Tipo |
|---------|------|
| `id` | uuid |
| `auth_id` | uuid → `auth.users.id` |
| `nombre` | text |
| `email` | text |
| `rol` | enum: `superadmin`, `admin`, `ejecutivo`, `operador`, `cliente` |
| `activo` | boolean |

### `catalogos`
Tabla de listas de valores del sistema (monedas, tipos de carga, etc.).

| Columna | Tipo |
|---------|------|
| `id` | uuid |
| `tipo` | text (ej. `moneda`, `condicion_carga`) |
| `valor` | text |
| `activo` | boolean |

---

## Módulo de Transportes

### Flujo completo

```
1. Operaciones (reservas de carga)
   └─ enviado_transporte = true
           │
           ▼
2. Reserva ASLI (ReservaAsliContent)
   • Seleccionar operación
   • Asignar: empresa transp. → chofer → unidad → tramo
   • Campos: contenedor, sello, tara, depósito, fechas stacking
   • Guardar → graba en operaciones (transporte, chofer, patente, tramo, moneda...)
           │
           ▼
3. Facturación (FacturacionContent)
   • Seleccionar operación (datos de transporte pre-cargados)
   • N° factura ASLI auto-generado (TRA0001, TRA0002... reservado inmediatamente)
   • Tramo auto-cargado como ítem base de proforma
   • Agregar costos extra del catálogo (chips de adición rápida)
   • Monto facturado = suma automática de ítems (sin decimales si es CLP)
   • Exportar PDF (ventana con estilo proforma profesional)
   • Exportar Excel (xlsx-js-style con estilos completos)
   • Guardar → graba en operaciones (numero_factura_asli, monto_facturado, fechas...)
           │
           ▼
4. Facturas emitidas (FacturasTransporteContent)
   • Vista de registro de todas las facturas
   • Filtros: búsqueda, cliente, estado, rango de fechas
   • Totales por moneda
   • Export Excel básico
```

### Numeración de facturas TRA
- Formato: `TRA` + 4 dígitos con cero padding (ej. `TRA0001`, `TRA0042`)
- Se genera automáticamente al seleccionar una operación sin número previo
- Se **reserva inmediatamente** en la BD antes de mostrar el formulario para evitar duplicados
- Si la operación ya tiene número asignado, se carga el existente

---

## Patrones de Código

### Supabase client en componentes React
```typescript
// Siempre dentro de useMemo para evitar recreación
const supabase = useMemo(() => {
  try { return createClient(); } catch { return null; }
}, []);
```

### Formato de montos
```typescript
// Helper usado en FacturacionContent
const fmtAmt = (n: number, mon: string) => {
  const isCLP = mon.toUpperCase() === "CLP";
  return n.toLocaleString("es-CL", {
    minimumFractionDigits: isCLP ? 0 : 2,
    maximumFractionDigits: isCLP ? 0 : 2,
  });
};
// CLP: sin decimales. USD/EUR: 2 decimales.
```

### Exportación Excel con estilos
```typescript
import * as XLSX from "xlsx-js-style"; // NO usar "xlsx" plain

// Celda con estilo:
ws["A1"] = { v: "Texto", t: "s", s: { font: { bold: true }, fill: { fgColor: { rgb: "1D4ED8" } } } };

// Merge de celdas:
ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
```

### Responsive — patrón tabla/cards
```tsx
{/* Cards en móvil (< md) */}
<div className="md:hidden divide-y divide-neutral-100">
  {items.map(item => <div key={item.id} className="p-4">...</div>)}
</div>

{/* Tabla en desktop (≥ md) */}
<div className="hidden md:block overflow-x-auto">
  <table>...</table>
</div>
```

### RLS — estructura estándar de política
```sql
-- Superadmin/Admin: acceso total
CREATE POLICY "tabla_admin_all" ON public.tabla
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol IN ('superadmin','admin') AND u.activo = true)
  ) WITH CHECK (...mismo...);

-- Ejecutivo/Operador: solo lectura
CREATE POLICY "tabla_ejecutivo_read" ON public.tabla
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol IN ('ejecutivo','operador') AND u.activo = true)
  );
```

---

## Internacionalización (i18n)

Archivo: `src/lib/i18n/translations.ts`

```typescript
const translations = {
  es: { transporteAsli: { title: "...", ... }, facturacion: { ... } },
  en: { transporteAsli: { title: "...", ... }, facturacion: { ... } },
};

// Uso en componentes:
const { t, locale } = useLocale();
const tr = t.facturacion;
```

Agregar nuevas claves siempre en **ambos** idiomas (`es` y `en`).

---

## Navegación (Sidebar)

Archivo: `src/lib/site.ts`

```typescript
{
  labelKey: "claveDeTraducciones",
  id: "identificador-unico",
  href: "/ruta/pagina",
  superadminOnly: true, // opcional — oculta en sidebar para no-superadmin
}
```

Los ítems con `superadminOnly: true` solo aparecen si `isSuperadmin === true`.

---

## Variables de Entorno

```env
PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Definidas en `.env` (no commitear). Accesibles en el cliente con prefijo `PUBLIC_`.

---

## Migraciones Pendientes

La siguiente migración fue creada pero debe aplicarse manualmente en Supabase SQL Editor:

```
supabase/migrations/20260317000010_consignatarios_rls.sql
```

Aplica RLS a la tabla `consignatarios`:
- `superadmin`/`admin`: acceso total
- `ejecutivo`/`operador`: solo lectura
- `cliente`: sin acceso

---

## Convenciones

- **Nombres de archivos**: `PascalCase` para componentes React, `kebab-case` para páginas Astro
- **Estilos de estado**: emerald = ok/pagado, amber = pendiente, red = error/cancelado, brand-blue = activo/seleccionado
- **Soft delete**: `deleted_at IS NULL` en operaciones — nunca borrar físicamente
- **Fechas**: almacenar en ISO 8601, mostrar con `date-fns` + locale `es`
- **Monedas**: CLP sin decimales, USD/EUR con 2 decimales
- **Numeración facturas transporte**: formato `TRAxxxx` (TRA0001, TRA0002...)
