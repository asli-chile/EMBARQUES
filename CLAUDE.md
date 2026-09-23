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

Las tarjetas del histórico muestran la **cobertura** de cada dato (cuántas operaciones lo tienen cargado) y un guion cuando nadie lo llenó. Es deliberado: `peso_neto` está casi vacío en producción, y un cero se leería como un error del dashboard en vez de como un vacío de captura.

Los indicadores de **pallets y de cajas de 25/5 kg se retiraron** el 17-09-2026: llevaban tanto tiempo en guion que ocupaban cuatro de las seis tarjetas de primera línea para no decir nada. `pallets` sobrevive como contexto —promedio por operación en la cabecera del gráfico mensual, y detalle de las barras y del ranking por especie—; las cajas ya no se consultan. Si algún día se capturan de verdad, la tarjeta se vuelve a agregar con su cobertura, como el resto.

## NaviTrack — Seguimiento marítimo (en desarrollo)

`/navitrack` es **el** módulo de seguimiento: el 13-09-2026 reemplazó a
`/tracking`, que se eliminó (`src/components/tracking/` y `/api/shiptracking/*`).
`/tracking` sobrevive solo como redirección, y **ya no es una ruta pública**:
para seguir un embarque hay que iniciar sesión.

Quién entra y con cuánto poder:

| Rol | Ve | Decide recaladas y transbordos | Gasta créditos AIS |
|-----|----|-------------------------------|--------------------|
| `superadmin` | todos | sí | **sí, el único** |
| `admin` | todos | sí | no |
| `ejecutivo` | los de sus empresas | sí, sobre lo suyo | no |
| `operador` | todos | no | no |
| `cliente` | los de sus empresas | no | no |

Qué embarques ve cada uno **no lo decide la pantalla**: lo decide RLS sobre
`operaciones`. Gastar es un eje aparte de decidir, porque el plan de créditos es
uno solo para toda la empresa.

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

## Mis Documentos

`/documentos/mis-documentos` ([MisDocumentosContent.tsx](src/components/documentos/MisDocumentosContent.tsx))
responde una sola pregunta: **a qué embarque le falta papeleo**.

Dos ejes que se parecen y no son lo mismo:

| | De qué habla | De dónde sale |
|---|---|---|
| Estado del papeleo | Completo / en curso / sin documentos | `estadoDocsDe()`, cuenta documentos contra tipos exigibles |
| Estado del viaje | En tránsito, cancelada, solicitada… | `operaciones.estado_operacion` |

En la **lista** el color de la tarjeta habla del viaje; en la **ficha** de un
embarque, del papeleo. Mezclarlos deja al lector sin saber cuál está viendo.

- Los once tipos se agrupan en cuatro etapas (`GRUPOS_DOCUMENTO`), en el orden
  del viaje, que es también el orden en que se buscan. En la pestaña "Todos" los
  grupos se separan con una línea más gruesa del borde de siempre.
- **La etapa no tiene color propio.** Lo tuvo —violeta, azul, celeste y
  esmeralda de Tailwind— y era lo único así en todo el ERP: acá el color
  significa **estado** (`--estado-*`) o selección (`--dash-neon`), nunca
  categoría. Cuatro tonos más, por bien elegidos que estén, desentonan con el
  resto y además compiten con el chip de estado de la misma fila. El grupo se
  identifica por su nombre y su contador.
- `TIPOS_FUERA` retira tipos de la pantalla **y de la cuenta**. Se filtra en vez
  de borrar del catálogo: la columna y el histórico siguen en la base. Si se
  retira uno de la vista sin sacarlo de la cuenta, el contador pide un documento
  que ya no se muestra.
- `visibleTipos` va en `useMemo`. No es optimización: de esa lista cuelgan un
  Set, las funciones de carga y los efectos que llaman a `setState`, así que
  recalcularla en cada render deja la pantalla en bucle infinito.
- Los estados usan los tokens de marca (`estado--ok|curso|espera|atencion|transito`).

**Lo que no existe** y conviene no prometer: observaciones por documento,
estados "en revisión" y "observado", documentos aduaneros (DUA, liberación) y
"descargar checklist". Aparecen en los mockups pero no hay campo ni tabla
detrás.

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

**En teléfono el rail no existe** (`hidden md:flex`): esos 64 px son el 16 % del
ancho y sus etiquetas aparecen al pasar el mouse, gesto que ahí no ocurre. La
navegación la lleva `AppMobileNav.tsx`, un panel deslizante que se abre desde el
botón del header y usa **los mismos ítems y el mismo filtrado por rol**; si
divergieran, alguien vería en el teléfono un módulo que en el escritorio no
tiene. El header, además, deja a la vista solo notificaciones y cuenta: tema,
idioma, "ver como" y contadores viven dentro del panel.

Todo el contenido de módulo va envuelto en `ModuleErrorBoundary`. Sin esa
barrera, un error de render en cualquier pantalla desmonta el árbol entero y
deja la aplicación en blanco —sin header, sin menú y sin mensaje—, que es
indistinguible de "no cargó". La ruta hace de llave de reinicio: navegar es el
reintento.

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

Se pueden aplicar de tres formas:

- **CLI de Supabase** (el proyecto BDASLI ya está linkeado):
  `npx supabase db query --linked -f supabase/migrations/<archivo.sql>`.
  **No usar `supabase db push`**: este repo nunca llevó historial de migraciones
  en el CLI, así que intentaría re-ejecutar todo `supabase/migrations/`.
- `npm run db:migrate -- <archivo.sql>`, que necesita `DATABASE_URL` en
  `.env.local` (hoy no está definida).
- Pegando el SQL en el editor de Supabase.

### Migraciones aplicadas

El historial —qué se aplicó, cuándo y por qué— vive en la bóveda de Obsidian
`C:\Users\rodri\OneDrive\Documentos\obsidian\ASLI` → `Migraciones/00 - Bitácora.md`,
no aquí: son ~25 migraciones ya corridas y este archivo se lee entero en cada sesión.
La bóveda está **fuera del repo** a propósito: guarda también reglas de negocio y
notas de cliente que no deben commitearse.

Lo aplicado hasta el 14-09-2026: todas las tablas de NaviTrack (`transbordos`,
`ais_lecturas`, `escalas`, `tramos`, `avisos`, `recaladas`, `viajes`, `corridas`),
`navieras.logo_url` con su siembra, y las políticas RLS de NaviTrack para cliente
(lectura) y para `admin`/`ejecutivo` (escritura).

> Que una migración esté en `supabase/migrations/` **no significa que esté aplicada**.
> La bitácora es el único registro de qué corrió de verdad.

### El saldo de créditos no se configura

Lo responde el proveedor en `my-credits`, y **esa consulta es gratis**
(comprobado: dos llamadas seguidas no mueven el saldo). Lo lee
`src/lib/navitrack/saldo.ts`, con caché en memoria de 3 minutos porque el
proveedor limita a 50 llamadas por minuto; el caché se invalida apenas se gasta.

Antes el panel calculaba `plan contratado − filas registradas`. Ese número solo
ve las consultas que pasan por los endpoints: mostraba 148 cuando el saldo real
era 216. **Si el proveedor no responde se muestra "—", nunca un número
estimado.**

### Chequeo diario y alerta por correo

`src/pages/api/navitrack/chequeo-diario.ts` lo dispara el cron de Vercel
declarado en `vercel.json` (`0 10 * * *` = 06:00 en Chile; Vercel lo ejecuta con
holgura, así que la hora real varía unos minutos).

**La corrida tiene un techo de tiempo, y ese techo se alcanzó.** El 14-09-2026
el chequeo consultaba las naves una tras otra, a unos tres segundos cada una:
con siete naves se pasaba del límite de duración de la función y moría a mitad
del recorrido. Desde fuera se veía como dos fallos distintos —faltaba una nave y
no llegaba el reporte— cuando era uno solo: nunca terminaba. El envío del
reporte va al final, así que era lo primero en perderse.

Por eso las consultas van **en paralelo** (`Promise.all`; el proveedor admite 50
por minuto) y `astro.config.mjs` declara `maxDuration: 60` en el adaptador. Al
sumar naves a la lista blanca, recordar que el costo en tiempo ya no crece en
serie, pero el de créditos sí: una consulta por nave y por día.

Se consulta **solo a las naves que llevan carga navegando**
(`enVentanaDeSeguimiento`), no a todas las que tienen `tracking_activo`. La
ventana abre con el zarpe —pegada al ETD, sin anticipación— y cierra por tres
niveles, en orden de confiabilidad; manda el primero que se cumpla:

| Nivel | Qué cierra la ventana |
|-------|----------------------|
| 1 | Alguien lo dijo: la operación pasó a un estado final o se marcó `arribo_confirmado` |
| 2 | Se vio: el AIS muestra al buque llegado al POD (`llegoAlPod`, sale de la lectura ya pagada) |
| 3 | Se agotó el plazo: pasaron `GRACIA_POST_ETA_DIAS` (2) desde la ETA |

Un buque con varias operaciones se sigue hasta que **todas** cierren: MSC
BRUNELLA descarga en Génova, Fos-sur-Mer y Leixões en el mismo viaje.

De un viaje con transbordo se sigue **solo la nave del tramo vigente**, no todas
las de la cadena. Sumarlas todas pagaba dos buques por la misma caja: en A00051,
MSC SERENA —que la entregó en Rodman y siguió a Thames con otra carga— y MSC
BOSTON, que la recibió.

El nivel 3 es un freno de emergencia, no el criterio. La ETA es la promesa que
la naviera hizo semanas antes y se mueve mucho: en diez días de observación los
buques corrieron su **propia** ETA declarada entre 0,8 y 17,2 días. Cortar en la
promesa deja de seguir justo al que se atrasó —el CMA CGM CARL ANTOINE iba a
+1,3 días de la suya entrando al Elba—. Si el nivel 2 funciona, al 3 no se llega.

Los dos días no salen de una medición: al 21-09-2026 había **una sola**
operación con arribo real registrado en toda la base. Cuando haya historial de
arribos, el número se puede calibrar en serio.

Si el buque declara un destino distinto al POD, avisa por correo a
`NAVITRACK_ALERTAS_EMAIL` a través de la Edge Function `send-email`.

Para que funcione hay que dejar puestas estas variables:

| Variable | Dónde |
|----------|-------|
| `NAVITRACK_CRON_SECRET` (≥16 caracteres) | Vercel **y** secrets de la Edge Function, con el **mismo** valor |
| `CRON_SECRET` | Vercel, si se usa la firma propia de Vercel. **Si están las dos, con el mismo valor**: son puertas distintas (Vercel entra con la suya, la Edge Function exige la suya) y tenerlas distintas hacía que el reporte se firmara con el secreto equivocado |
| `NAVITRACK_ALERTAS_EMAIL` | Vercel |
| `DATADOCKED_API_KEY` | Vercel y `.env.local` |

`send-email` se extendió con una vía de cron: si llega `x-cron-secret` igual al
secreto, se salta la búsqueda del usuario y envía siempre desde el buzón
corporativo, **nunca suplantando a una persona**. El camino del usuario no
cambió. Esa función la usan Informativos y Documentos en producción, así que el
deploy (`npx supabase functions deploy send-email`) hay que hacerlo a
conciencia.

---

## Storage

`storage.objects` tiene RLS activo. **Un bucket sin políticas es un bucket de
solo lectura**: sin una política que permita la operación, RLS la deniega, y
Supabase responde **400**, que se lee como "el archivo está mal" cuando en
realidad falta el permiso.

Cuatro buckets estaban así —`booking-docs`, `formatos-templates`,
`itinerarios-stacking`, `stacking-navieras`— y subir a ellos fallaba incluso
siendo superadmin. Como tres son públicos, **leer funcionaba**: fallaba solo al
escribir, que es lo que menos se prueba.

```
supabase/migrations/20260913000002_storage_policies_faltantes.sql
```

**Aplicada el 13-09-2026.** Quién puede escribir en cada uno:

| Bucket | Escritura |
|--------|-----------|
| `documentos` | cualquier autenticado (política previa) |
| `booking-docs` | superadmin, admin, ejecutivo, operador |
| `itinerarios-stacking`, `stacking-navieras` | superadmin, admin |
| `formatos-templates` | solo superadmin |

Al crear un bucket nuevo, crear sus políticas en la misma migración. La consulta
de verificación al final de ese archivo lista los buckets que quedaron sin
ninguna.

### Documentos por cliente

```
supabase/migrations/20260913000003_storage_documentos_por_cliente.sql
```

**Aplicada el 13-09-2026.** Las políticas de `documentos` decían solo
`bucket_id = 'documentos'`, sin mirar quién pedía ni de quién era el archivo.
Cualquier cuenta de cliente podía listar y descargar los BL y facturas de todos
los demás, y **borrar los 208 archivos**. El bucket guarda juegos completos de
BL —título sobre la carga— y facturas comerciales.

Ahora: el **cliente ve y descarga solo los documentos de sus operaciones**, y no
sube, modifica ni borra. El personal interno mantiene el acceso completo.

La pertenencia sale de `public.storage_doc_es_del_cliente(name)`, que extrae el
id de operación de la ruta y lo compara con
`private.get_cliente_nombres_for_user()` — la misma función con la que
`operaciones` decide qué ve un cliente, para que documentos y operaciones nunca
digan cosas distintas.

**Al personal interno no se le aplica pertenencia** a propósito: de los 57 ids
de operación que hay en las rutas, 56 apuntan a operaciones que ya no existen
(huérfanas de importaciones anteriores), y atarlos a esa relación dejaría 207
de 208 archivos inaccesibles para quien trabaja con ellos.

---

## Permisos: son dos capas, no una

Un 403 al escribir puede venir de **dos sitios distintos**, y arreglar uno solo
no sirve:

1. **El GRANT de tabla.** Si `authenticated` no tiene `INSERT`/`UPDATE`,
   PostgREST responde 403 **antes** de mirar RLS.
2. **La política RLS.** Con el GRANT puesto, decide quién puede.

`depositos` tenía política de lectura y ningún GRANT de escritura: editar la
celda en Registros daba 403 aunque el usuario fuera superadmin. Agregar la
política no bastó; hacía falta también el GRANT.

Al crear una tabla que se escriba desde el navegador, van las dos cosas en la
misma migración. Esta consulta lista las que tienen política de escritura sin
el GRANT que la habilita:

```sql
SELECT c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.relname
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
   AND p.cmd IN ('ALL','INSERT','UPDATE','DELETE')
 GROUP BY c.relname
HAVING NOT EXISTS (
   SELECT 1 FROM information_schema.role_table_grants g
    WHERE g.table_schema = 'public' AND g.table_name = c.relname
      AND g.grantee = 'authenticated'
      AND g.privilege_type IN ('INSERT','UPDATE','DELETE'));
```

### RLS activo no significa cerrado

`consignatarios` tenía RLS activo, tres políticas correctas por rol y su
migración "aplicada", y aun así se leía **entera sin iniciar sesión**: 2 de 2
filas con la anon key, que es pública por diseño y viaja en el navegador de
cualquiera. La tabla guarda consignee y notify de los clientes —empresa,
dirección, contacto, correo, teléfono, USCC—.

La culpable era una política heredada que nadie quitó:

```
"Lectura pública consignatarios"  SELECT  roles={public}  USING (true)
```

Dos cosas que conviene no olvidar:

1. **Las políticas se suman.** Una sola con `USING (true)` para `public` anula a
   todas las demás por bien escritas que estén. Agregar políticas nunca cierra
   nada: hay que **quitar** la que abre.
2. **`public` incluye a `anon`.** No es "los usuarios de la aplicación": es
   todo el mundo.

Y el corolario incómodo: el advisor de seguridad de Supabase **no marca esto**.
Mira si RLS está activo, y acá lo estaba. Un aviso limpio de Supabase no es
prueba de que una tabla esté cerrada.

La única comprobación que vale es pedir la tabla por HTTP con la anon key y ver
qué responde:

```bash
curl -s -o /dev/null -w "%{http_code}
"   "$PUBLIC_SUPABASE_URL/rest/v1/<tabla>?select=*&limit=1"   -H "apikey: $PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $PUBLIC_SUPABASE_ANON_KEY"
# 401 = cerrada.  200 = lo que devuelva lo ve cualquiera.
```

Cerrado el 15-09-2026 en `20260915000002_consignatarios_cerrar_lectura_publica.sql`,
por las dos capas: se quitó la política y se revocó el GRANT de `anon`.

### Qué puede leer `anon`, y nada más

La anon key va en el navegador de cualquiera: **lo que `anon` pueda leer es
público**. Seis tablas lo necesitan, porque las consultan de verdad los
endpoints de `/api/public/*` con `createAnonClient()`:

```
itinerarios   itinerario_escalas   naves   navieras   navieras_naves   destinos
```

Más `conteo_visitas`, que es un contador de una fila sin dato de nadie y lo lee
el header antes de iniciar sesión. **Esa es la lista completa.** El
15-09-2026 se revocó `anon` de todo lo demás
(`20260915000003_revocar_anon_tablas_internas.sql`): `empresas`, `plantas`,
`depositos`, `especies`, `catalogos`, `puertos_origen`, `documentos` y
`sesiones_activas`.

El permiso se decide por lo que la tabla **es**, no por lo que tiene cargado
hoy. `plantas` estaba expuesta y sus columnas de contacto, teléfono y correo
venían vacías; con eso se argumentó que no había nada publicado. Es un mal
argumento: la tabla existe para llenarse, y el día que alguien cargue los
contactos quedan publicados sin que nada avise.

Revocar `anon` no rompe el ERP: las pantallas internas entran como
`authenticated`, que tiene sus propios GRANT. Y no hay carrera de arranque —
`_getAccessToken()` de supabase-js hace `await auth.getSession()` en **cada**
petición y solo cae a la anon key si no hay sesión, así que una consulta
disparada antes de que termine de montar el guard igual viaja con el JWT.

Hoy devuelve ocho tablas, pero **ninguna es un error**: `clientes`,
`consorcios`, `servicios_unicos*` y `usuarios` solo se escriben desde endpoints
con `service_role`, que no pasa por RLS ni por GRANTs, y
`conteo_visitas` tiene la política en `false` a propósito porque el contador
sube por función. Antes de conceder permisos, comprobar si la tabla se escribe
de verdad desde el navegador.

---

## Convenciones

- **Nombres de archivos**: `PascalCase` para componentes React, `kebab-case` para páginas Astro
- **Estilos de estado**: salen de la paleta de ASLI, no de la de Tailwind. Los
  tokens viven en `src/styles/dashboard-neon.css`: `--estado-ok` (oliva
  #669900), `--estado-curso` (teal #007A7B), `--estado-espera` (gris #6B7280) y
  `--estado-error` (rojo #B91C1C). Se derivan con `color-mix` de los hex del
  manual (`src/lib/brand.ts`) porque esos tonos, pensados para papel, no
  contrastan sobre el navy del ERP; en tema claro se usa el hex tal cual.
  Se aplican con las clases `estado--ok|curso|espera|error` en el contenedor y
  `estado-chip` / `estado-barra` / `estado-icono` en las piezas, para que una
  tarjeta no pueda mostrar el chip de un estado y la barra de otro.
  **`--estado-atencion` (ámbar) es la única excepción**: la paleta corporativa
  no tiene un tono para "algo que mirar hoy", y pintarlo con un color de marca
  lo haría pasar por éxito o por error.
- **Soft delete**: `deleted_at IS NULL` en operaciones — nunca borrar físicamente
- **Fechas**: almacenar en ISO 8601, mostrar con `date-fns` + locale `es`
- **Monedas**: CLP sin decimales, USD/EUR con 2 decimales
- **Numeración facturas transporte**: formato `TRAxxxx` (TRA0001, TRA0002...)
