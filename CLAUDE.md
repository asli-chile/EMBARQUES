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
| Motion | Sistema propio en CSS (`src/styles/motion.css` + `src/lib/ui/motion.ts`) — ver [docs/MOTION-DESIGN.md](docs/MOTION-DESIGN.md) |

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
│   ├── navitrack/           # Seguimiento marítimo nuevo (superadmin) — ver docs/NAVITRACK.md
│   ├── documentos/          # Generación de documentos
│   ├── itinerario/          # Itinerarios navieros
│   ├── ui/                  # Componentes reutilizables (Combobox, etc.)
│   └── layout/              # AppShell, Header, AppIconRail (rail lateral), guards
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
    └── BaseLayout.astro      # Layout raíz: monta AppShell (Header + NavBanner)
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

## Dashboard

`/dashboard` monta `DashboardPanel`, que resuelve el acceso por rol (usuario externo → `DashboardVisitorContent`; sin rol → `RoleForbidden`) y alterna entre dos vistas con las pestañas de `DashboardViewTabs`:

| Vista | Componente | Para qué sirve |
|-------|-----------|----------------|
| **En curso** | `DashboardContent` | Operación del día: alertas de corte documental y fin de stacking, próximos zarpes a 7 días, transporte pendiente, mapa de puertos. Filtra por la temporada activa. |
| **Histórico** | `DashboardHistoricoContent` | Volumen acumulado con selector de temporada: operaciones, contenedores, pallets, kilos netos y cajas, más desglose por mes de zarpe, tipo de unidad y especie. Excluye las canceladas, porque nunca movieron carga. |

Las tarjetas del histórico muestran la **cobertura** de cada dato (cuántas operaciones lo tienen cargado) y un guion cuando nadie lo llenó. Es deliberado: `pallets`, `peso_neto` y las cajas de 25/5 kg están casi vacíos en producción, y un cero se leería como un error del dashboard en vez de como un vacío de captura.

## NaviTrack — Seguimiento marítimo (en desarrollo)

`/navitrack` es la **nueva** experiencia de tracking, exclusiva de `superadmin`.
Convive con `/tracking`, que sigue en producción.

> **Regla:** ningún cambio de NaviTrack toca `src/components/tracking/`. Si algo
> de ahí hace falta, se copia o se extrae a un módulo compartido.

Documentación completa: **[docs/NAVITRACK.md](docs/NAVITRACK.md)** — datos
disponibles y los que no, resolución de posición (AIS → manual → estimada),
etapas y umbrales, jerarquía de la información y cómo extenderlo.

Lo mínimo para no perder tiempo:

- La ruta se cablea en **cinco** archivos (`pages/navitrack.astro`, `AppShell.tsx`,
  `site.ts`, `routeChrome.ts`, `routePrefetch.ts`); la página Astro es solo un
  cascarón y `AppShell` resuelve el componente por `pathname`.
- El AIS se consulta **solo** para el embarque abierto (una llamada al proveedor
  por lectura). La flota usa posición estimada sobre la ruta.
- El buque se resuelve por **IMO/MMSI del catálogo `naves`**, no buscando por
  nombre a mano como en `/tracking`.
- `operaciones.eta` es columna `date`: **no mostrar horas inventadas**. Solo el
  ETA del AIS lleva hora.
- La lógica pura (geodesia, etapa, alertas, timeline) vive en
  `navitrack-model.ts` y `navitrack-estado.ts`, sin React.

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

## Navegación

Los ítems se declaran en `src/lib/site.ts`, se filtran por rol en
`src/lib/sidebarFilter.ts` y los renderiza el rail lateral
`src/components/layout/AppIconRail.tsx` (iconos siempre visibles, etiquetas al
expandir). El ícono de cada ítem sale de `src/lib/ui/sidebarIcons.ts`.

```typescript
{
  labelKey: "claveDeTraducciones",
  id: "identificador-unico",
  href: "/ruta/pagina",
  superadminOnly: true, // opcional — oculta en sidebar para no-superadmin
}
```

Los ítems con `superadminOnly: true` solo aparecen si `isSuperadmin === true`.
Ocultar el ítem no protege la ruta: el acceso lo impone `ConfigGuard` en
`AppShell.tsx` y, en última instancia, RLS.

---

## Variables de Entorno

```env
PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Definidas en `.env` (no commitear). Accesibles en el cliente con prefijo `PUBLIC_`.

### CSRF y proxy en Vercel

Astro valida el encabezado `Origin` en POST (`security.checkOrigin`, activo por defecto). Detrás del proxy de Vercel, la URL interna del servidor no coincide con la del navegador, así que hay que declarar los dominios permitidos en `astro.config.mjs`:

```js
security: {
  allowedDomains: [
    { hostname: "www.asli.cl", protocol: "https" },
    { hostname: "asli.cl", protocol: "https" },
    { hostname: "**.vercel.app", protocol: "https" }, // previews
  ],
},
```

**Nota:** Astro solo aplica `checkOrigin` a POST con `Content-Type` de formulario (`application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`). Los endpoints JSON (`/api/auth/*`, `/api/admin/*`) no quedan cubiertos por esta protección; la sesión sigue siendo la barrera principal.

Si en Vercel definiste una variable `ORIGIN`, usa el formato completo: `https://www.asli.cl` (con `https://`, sin barra final). Si el sitio también se abre como `https://asli.cl` sin `www`, conviene redirigir siempre al canónico o mantener ambos en `allowedDomains` (como arriba).

---

## Política de Contraseñas

El mínimo es de **12 caracteres**, definido en un solo lugar: `src/lib/auth/password.ts`. Ese módulo exporta la constante, los mensajes de error y los placeholders, y lo consumen tanto las rutas API (`signup`, `create-user`, `activate-user`, `reset-user`, `change-password`) como los formularios (`UsuariosContent.tsx`, `RegistroForm.tsx`).

Al cambiar el mínimo, editar **solo** `PASSWORD_MIN_LENGTH`; el resto se deriva. Las únicas cadenas que hay que ajustar aparte son `placeholderPassword` en `src/lib/i18n/translations.ts` (versiones `es` y `en`), porque el sistema de traducciones no admite valores calculados.

Complemento recomendado en Supabase Dashboard (Auth → Policies): activar la detección de contraseñas filtradas, que compara contra bases de datos de brechas conocidas y no requiere cambios en el código.

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

Temporadas (aplicar en orden):

```
supabase/migrations/20260829000004_temporadas.sql
supabase/migrations/20260829000005_correlativo_por_temporada.sql
supabase/migrations/20260829000006_temporadas_grant_service_role.sql
supabase/migrations/20260829000007_temporada_2025_2026_renumerar.sql
```

- La primera crea el catálogo `temporadas` (nombre libre, una sola activa, escritura solo `superadmin`), deja `2025-2026` como activa y clasifica las operaciones existentes en ella.
- La segunda cambia la numeración: `correlativo` y `ref_asli` pasan a ser por temporada, así cada temporada empieza en `A00001`. La unicidad deja de ser global y pasa a `(temporada, correlativo)` / `(temporada, ref_asli)`.
- La tercera otorga los permisos de `service_role` que faltaban en las tablas nuevas.
- La cuarta unifica los cuatro textos heredados de la importación (`CHERRY 25-26`, `2026`, `TEMP 25-26`, `2025-2026`) en `2025-2026` y renumera esa temporada desde `A00001` en orden de ingreso.

Para revisar el estado de las temporadas en la base: `npm run db:temporadas-inventario`.

Dashboard:

```
supabase/migrations/20260830000001_dashboard_resumen_rpc.sql
```

Crea la función `public.dashboard_resumen(p_temporada, p_empresas)`, que devuelve en un solo JSON todos los agregados del dashboard (KPIs, estados, próximos zarpes, top clientes/navieras/especies, conteo por puerto, vía marítima/aérea y zarpes por semana), más los índices de `etd`, `corte_documental` y `fin_stacking` que sostienen sus filtros de fecha.

Es `SECURITY INVOKER`: las políticas RLS de `operaciones` siguen aplicando al usuario que llama, y los parámetros solo replican los filtros que el frontend ya hacía. **Mientras no se aplique, el dashboard sigue calculando los agregados en el navegador**; el cambio de `DashboardContent.tsx` para consumir la función queda pendiente de verificar la migración contra la base.

Dueño de reserva:

```
supabase/migrations/20260831000001_dueno_reserva_catalogo.sql
```

Convierte el campo "Dueño de reserva" de `Crear reserva` en un catálogo de base de datos: siembra `catalogos` con `categoria = 'dueno_reserva'` (ASLI, CHILFRESH, SURLOGISTICA), incorpora cualquier otro valor que ya exista en `operaciones.dueno_reserva` y agrega la política de `INSERT` sobre `catalogos` para el personal interno (`superadmin`, `admin`, `ejecutivo`, `operador`), que antes solo tenía lectura.

**Mientras no se aplique, el combobox aparecerá vacío** (no hay valores sembrados) y el alta de empresas nuevas fallará por RLS.

Transportes:

```
supabase/migrations/20260831000002_reservas_ext_operacion_id.sql
```

Agrega `transportes_reservas_ext.operacion_id` (FK a `operaciones`, `ON DELETE SET NULL`) con su índice, y hace backfill del histórico por número de booking **solo cuando ese booking identifica una única operación viva**; si hay ambigüedad la deja en `NULL` a propósito.

Antes el cruce entre la reserva externa y su operación se hacía comparando el texto del booking con `.limit(1)`, de modo que dos embarques con el mismo booking podían intercambiar instructivo y PDF de booking. **Mientras no se aplique, las reservas externas nuevas no guardarán el vínculo** y la pantalla las tratará como reservas manuales (datos del embarque editables a mano, como antes).

Seguridad:

```
supabase/migrations/20260831000002_revoke_anon_operaciones_clientes.sql
```

Revoca los `GRANT ALL ... TO anon` que las migraciones iniciales dejaron sobre `operaciones` y `clientes`. Hoy RLS ya bloquea a `anon` en ambas tablas (no queda ninguna política dirigida a ese rol), pero mientras los GRANT sigan vigentes, RLS es la **única** barrera: si alguien lo desactiva por error o crea una política sin `TO authenticated`, esas tablas quedarían legibles y escribibles con la anon key, que es pública por diseño.

`authenticated` y `service_role` conservan sus privilegios, así que **aplicarla no cambia nada en el funcionamiento del ERP**. Para verificar que quedó aplicada, la propia migración incluye la consulta al final: no debe devolver filas.

NaviTrack:

```
supabase/migrations/20260911000001_navitrack_transbordos.sql
```

Crea `navitrack_transbordos`, la decisión humana (confirmado / descartado) sobre
cada alerta de posible transbordo de `/navitrack`. La detección compara el
destino que declara el AIS con el POD comprometido, y eso es una señal, no un
hecho: el destino AIS lo escribe la tripulación a mano.

**Aplicada el 11-09-2026** en el proyecto BDASLI. El código tolera que la tabla
no exista, por si se levanta otro entorno sin ella.

```
supabase/migrations/20260911000002_navieras_logo.sql
```

Agrega `navieras.logo_url` para mostrar la marca de la naviera en la cabecera del
embarque. **Aplicada el 11-09-2026.**

```
supabase/migrations/20260911000003_navieras_logo_seed.sql
```

Carga los logos que ya viven en `https://www.asli.cl/img/<naviera>.webp` — mismo
dominio que sirve el ERP, así que no hay que subirlos de nuevo. **Aplicada el
11-09-2026**: 10 de las 14 navieras quedaron con logo; EVERGREEN, HAPAG-LLOYD,
SEABOARD y UNIFER siguen en `NULL` porque esos archivos no existen en el sitio, y
se muestran con monograma. Al subirlos, basta un `UPDATE` igual a los del
archivo.

```
supabase/migrations/20260911000004_navitrack_ais_cache.sql
supabase/migrations/20260911000005_navitrack_activar_callao_express.sql
```

Caché de posiciones AIS y control de gasto: agrega `naves.tracking_activo` (lista
blanca de rastreo) y la tabla `navitrack_ais_lecturas`, donde **cada fila es una
llamada al proveedor**, o sea un crédito. **Ambas aplicadas el 11-09-2026**, con
`CALLAO EXPRESS` (IMO 9777606) como única nave habilitada. Ver
[docs/NAVITRACK.md](docs/NAVITRACK.md) §4 para los tres frenos de gasto.

```
supabase/migrations/20260911000006_navitrack_lecturas_tipo.sql
supabase/migrations/20260912000001_navitrack_escalas.sql
```

Panel de Rastreo e historial de escalas. La primera distingue en
`navitrack_ais_lecturas.tipo` qué consulta gastó cada crédito (`posicion`,
`busqueda`, `escalas`); la segunda crea `navitrack_escalas`, el caché de port
calls que alimenta la pestaña Escalas. **Ambas aplicadas el 12-09-2026.**
`port-calls-by-vessel` es la consulta más cara: la documentación del proveedor
dice 1 crédito en una página y 5 en otra, así que el código asume 5 y la cachea
24 h.

```
supabase/migrations/20260912000002_navitrack_tramos.sql
supabase/migrations/20260912000003_navitrack_avisos.sql
```

Transbordo real y chequeo diario. **Ambas aplicadas el 12-09-2026.**

`navitrack_tramos` es el modelo que faltaba: `operaciones` guarda un solo buque
(`nave`, `viaje`), así que no había forma de representar un transbordo. La regla
de lectura es **sin filas = viaje directo; con filas = el viaje son esos tramos,
en orden**. No toca `operaciones`, que está en producción.
*Pendiente: todavía ninguna pantalla lee ni escribe esta tabla.*

`navitrack_avisos` registra lo que el chequeo diario ya notificó
(`UNIQUE (operacion_id, tipo, detalle)`), para que una desviación que dura dos
semanas no genere catorce correos idénticos. Un destino declarado **distinto**
sí vuelve a avisar.

### Chequeo diario y alerta por correo

`src/pages/api/navitrack/chequeo-diario.ts` lo dispara el cron de Vercel
declarado en `vercel.json` (`0 12 * * *` = 08:00 en Chile). Por cada nave con
`tracking_activo` hace **una** llamada a `get-vessel-location`: 1 crédito por
nave y por día. Con una nave, 150 créditos alcanzan para meses; con veinte, para
una semana.

Si el buque declara un destino distinto al POD, avisa por correo a
`NAVITRACK_ALERTAS_EMAIL` a través de la Edge Function `send-email`.

Para que funcione hay que dejar puestas estas variables:

| Variable | Dónde |
|----------|-------|
| `NAVITRACK_CRON_SECRET` (≥16 caracteres) | Vercel **y** secrets de la Edge Function, con el **mismo** valor |
| `NAVITRACK_ALERTAS_EMAIL` | Vercel |
| `DATADOCKED_API_KEY` | Vercel y `.env.local` |

`send-email` se extendió con una vía de cron: si llega `x-cron-secret` igual al
secreto, se salta la búsqueda del usuario y envía siempre desde el buzón
corporativo, **nunca suplantando a una persona**. El camino del usuario no
cambió. Esa función la usan Informativos y Documentos en producción, así que el
deploy (`npx supabase functions deploy send-email`) hay que hacerlo a
conciencia.

Esos logos son artes **oscuros sobre fondo transparente**, por eso la ficha de la
naviera va con fondo blanco cuando lleva imagen (`.nt-carrier:has(img)` en
`navitrack.css`): sobre el navy del tema oscuro desaparecerían.

Se pueden aplicar de tres formas:

- **CLI de Supabase** (el proyecto BDASLI ya está linkeado):
  `npx supabase db query --linked -f supabase/migrations/<archivo.sql>`.
  **No usar `supabase db push`**: este repo nunca llevó historial de migraciones
  en el CLI, así que intentaría re-ejecutar todo `supabase/migrations/`.
- `npm run db:migrate -- <archivo.sql>`, que necesita `DATABASE_URL` en
  `.env.local` (hoy no está definida).
- Pegando el SQL en el editor de Supabase.

---

## Convenciones

- **Nombres de archivos**: `PascalCase` para componentes React, `kebab-case` para páginas Astro
- **Estilos de estado**: emerald = ok/pagado, amber = pendiente, red = error/cancelado, brand-blue = activo/seleccionado
- **Soft delete**: `deleted_at IS NULL` en operaciones — nunca borrar físicamente
- **Fechas**: almacenar en ISO 8601, mostrar con `date-fns` + locale `es`
- **Monedas**: CLP sin decimales, USD/EUR con 2 decimales
- **Numeración facturas transporte**: formato `TRAxxxx` (TRA0001, TRA0002...)
