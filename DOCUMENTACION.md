# EMBARQUES — Documentación completa del sistema (ASLI)

> **Versión:** 2026-03 · **Stack:** Astro 5 + React 19 + Supabase + Tailwind CSS v4

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Roles y Permisos](#4-roles-y-permisos)
5. [Módulos del Sistema](#5-módulos-del-sistema)
6. [Sistema de Etiquetas](#6-sistema-de-etiquetas-templates)
7. [Base de Datos](#7-base-de-datos)
8. [Autenticación y Sesiones](#8-autenticación-y-sesiones)
9. [Email con Gmail API](#9-email-con-gmail-api)
10. [Internacionalización](#10-internacionalización)
11. [Exportación de Archivos](#11-exportación-de-archivos)
12. [Guía de Desarrollo](#12-guía-de-desarrollo)
13. [Variables de Entorno](#13-variables-de-entorno)
14. [Migraciones de Base de Datos](#14-migraciones-de-base-de-datos)

---

## 1. Visión General

**EMBARQUES** (plataforma de **ASLI** — Asesorías y Servicios Logísticos Integrales) es una aplicación web de gestión de exportaciones frutícolas. Permite a ejecutivos y operadores gestionar el ciclo completo de una operación de exportación: desde la creación de la reserva hasta la emisión de documentos, asignación de transporte y facturación.

### Flujo principal de una operación

```
RESERVA → TRANSPORTE ASLI → FACTURACIÓN → DOCUMENTOS
   |             |                |              |
Datos de      Asignar         Emitir          Generar
la operación  camión/chofer   factura TRA     proforma e
(naviera,     + tramo +       con costos      instructivo
 booking,     stacking        extra
 contenedor)
```

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | **Astro** (SSG/SSR híbrido) | 5.1.3 |
| UI | **React** (islands `client:load`) | 19.2 |
| Estilos | **Tailwind CSS** | 3.4 |
| Base de datos | **Supabase** (PostgreSQL + RLS) | — |
| Auth | **Supabase Auth** + tabla usuarios | — |
| Excel lectura | xlsx | 0.18.5 |
| Excel escritura con estilos | xlsx-js-style | 1.2.0 |
| PDF | jspdf + jspdf-autotable | 4.2 / 5.0 |
| Mapas | maplibre-gl + react-map-gl | 5.19 / 8.1 |
| Grid de datos | ag-grid-community / ag-grid-react | 35.1 |
| Iconos | @iconify/react (lucide: + typcn:) | 5.0.2 |
| Fechas | date-fns + locale es | 4.1.0 |
| OCR | tesseract.js | 5.1.0 |
| ZIP | jszip | 3.10.1 |
| Edge functions | Deno (en Supabase) | — |

---

## 3. Arquitectura del Sistema

### Estructura de directorios

```
src/
├── components/
│   ├── auth/            # Login, Registro, Modal de auth
│   ├── layout/          # AppShell, Sidebar, NavBanner, Header
│   ├── ui/              # Combobox, ConfirmDialog, AuthWidget
│   ├── reservas/        # CrearReserva, MisReservas, Papelera
│   ├── transportes/     # ReservaAsli, ReservaExt, Facturacion, Facturas
│   ├── documentos/      # CrearProforma, CrearInstructivo, MisDocumentos
│   ├── registros/       # Tabla global de operaciones (ag-Grid)
│   ├── reportes/        # Analytics y exportación
│   ├── finanzas/        # Márgenes y rentabilidad
│   ├── itinerario/      # Mapa + escalas + consorcios
│   ├── stacking/        # Coordinación de bodega
│   ├── tracking/        # Rastreo público
│   ├── configuracion/   # CRUD de configuración del sistema
│   ├── dashboard/       # KPIs y resumen
│   ├── clientes/        # Gestión de empresas cliente
│   └── usuarios/        # Gestión de usuarios (superadmin)
├── pages/               # Rutas Astro (file-based routing)
├── lib/
│   ├── supabase/        # client.ts, server.ts, admin.ts
│   ├── auth/            # AuthContext.tsx, requireSuperadmin.ts
│   ├── i18n/            # LocaleContext.tsx, translations.ts
│   ├── documentos/      # proforma-normalizer.ts, instructivo.ts
│   └── email/           # sendEmail.ts
├── styles/
│   └── globals.css      # Estilos globales + ag-Grid theme Excel
└── layouts/
    └── BaseLayout.astro # Layout raíz
```

### Rutas del sistema

| Ruta | Módulo | Acceso mínimo |
|------|--------|--------------|
| `/inicio` | Landing con info de la empresa | Público |
| `/servicios` | Descripción de servicios | Público |
| `/sobre-nosotros` | Información de ASLI | Público |
| `/tracking` | Rastreo de embarques | Público |
| `/itinerario` | Horarios navieros en mapa | Autenticado |
| `/stacking` | Coordinación de bodega | Autenticado |
| `/dashboard` | KPIs y resumen | Autenticado |
| `/reservas/crear` | Crear operación | ejecutivo |
| `/reservas/mis-reservas` | Listado de operaciones | ejecutivo |
| `/reservas/papelera` | Operaciones eliminadas | admin |
| `/transportes/reserva-asli` | Asignar transporte ASLI | operador |
| `/transportes/reserva-ext` | Reservas externas | operador |
| `/transportes/facturacion` | Facturación de transporte | admin |
| `/transportes/facturas` | Facturas emitidas | admin |
| `/documentos/crear-proforma` | Editor de proforma | ejecutivo |
| `/documentos/crear-instructivo` | Instructivo de embarque | ejecutivo |
| `/documentos/mis-documentos` | Repositorio de documentos | ejecutivo |
| `/registros` | Tabla maestra de operaciones | autenticado |
| `/reportes` | Analytics y exportación | autenticado |
| `/finanzas` | Márgenes y finanzas | admin |
| `/configuracion/*` | Configuración del sistema | superadmin |

### Patrón de componentes React

Cada módulo tiene:
- `XxxContent.tsx` — Componente principal (React island, `client:load`)
- `XxxVisitorPreview.tsx` — Vista de solo lectura para usuarios externos
- `index.ts` — Re-exporta todos los componentes del módulo

### Patrón Supabase en React

```typescript
// Siempre dentro de useMemo para evitar recreación
const supabase = useMemo(() => {
  try { return createClient(); } catch { return null; }
}, []);
```

---

## 4. Roles y Permisos

### Definición de roles

```typescript
type UserRole = "superadmin" | "admin" | "ejecutivo" | "operador" | "cliente" | "usuario";
```

| Rol | Operaciones | Transporte | Documentos | Facturación | Configuración |
|-----|:-----------:|:----------:|:----------:|:-----------:|:-------------:|
| superadmin | CRUD total | CRUD total | CRUD total | CRUD total | Sí |
| admin | CRUD total | CRUD total | CRUD total | CRUD total | No |
| ejecutivo | Crear + propias | Lectura | Crear + ver | Lectura | No |
| operador | Editar asignadas | Editar | Ver | Lectura | No |
| cliente | Solo propias | Lectura | Solo propias | No | No |

### Hook `useAuth()`

```typescript
const {
  user,           // Supabase Auth user (id, email, name)
  profile,        // Row de public.usuarios (rol, nombre, activo)
  isSuperadmin,   // rol === "superadmin"
  isAdmin,        // rol === "admin"
  isCliente,      // rol === "cliente"
  isExternalUser, // sin perfil en usuarios (visitante)
  empresaNombres, // ["EMPRESA A"] — para filtrar operaciones de clientes
  isLoading,
  refetch,
} = useAuth();
```

### RLS — Estructura estándar

```sql
-- Admin: acceso total
CREATE POLICY "tabla_admin_all" ON public.tabla
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol IN ('superadmin','admin') AND u.activo = true)
  );

-- Ejecutivo/Operador: solo lectura
CREATE POLICY "tabla_ejecutivo_read" ON public.tabla
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.usuarios u
      WHERE u.auth_id = auth.uid() AND u.rol IN ('ejecutivo','operador') AND u.activo = true)
  );
```

---

## 5. Módulos del Sistema

### 5.1 Reservas (Operaciones)

**Archivos:** `CrearReservaContent.tsx`, `MisReservasContent.tsx`

Módulo central. Cada operación es un embarque de exportación.

#### Crear Reserva

Formulario con 80+ campos agrupados:

| Sección | Campos principales |
|---------|--------------------|
| Identificación | ref_asli, correlativo, cliente, estado_operacion |
| Naviera | naviera, nave, booking, pol, pod, etd, eta |
| Carga | especie, variedad, calibre, pallets, peso_neto, peso_bruto |
| Contenedor | contenedor, sello, tara, tipo_unidad |
| Destino | consignatario, pais, incoterm, forma_pago |
| Planta | planta_presentacion, deposito |
| Temperatura | temperatura, ventilacion, tipo_atmosfera |
| Documentos | dus, csg, csp, booking_doc_url |
| Stacking | inicio_stacking, fin_stacking, ingreso_stacking |

#### Estados de operación

| Estado | Color | Descripción |
|--------|-------|-------------|
| abierta | Azul | En curso |
| cerrada | Verde | Completada |
| pendiente | Ámbar | Requiere acción |
| cancelada | Rojo | Cancelada |

#### Mis Reservas

- Listado con filtros (estado, cliente, fechas, búsqueda libre)
- Envío al módulo de transporte (`enviado_transporte = true`)
- Envío de Instructivo por email con PDF adjunto
- Acceso a documentos de la operación
- Soft delete hacia papelera

---

### 5.2 Transportes

**Archivos:** `ReservaAsliContent.tsx`, `FacturacionContent.tsx`, `FacturasTransporteContent.tsx`

#### Reserva ASLI

Asigna transporte propio de ASLI a una operación.

1. Seleccionar operación (con `enviado_transporte = true`)
2. Elegir empresa de transporte → carga choferes y equipos vinculados
3. Seleccionar chofer → autocompleta RUT y teléfono
4. Seleccionar equipo → autocompleta patentes
5. Elegir tramo → carga valor y moneda automáticamente
6. Completar: contenedor, sello, tara, depósito, fechas stacking
7. Guardar → escribe en `operaciones`
8. Opción: enviar Solicitud de Reserva por email (PDF adjunto)

**Tablas:** `operaciones`, `transportes_empresas`, `transportes_choferes`, `transportes_equipos`, `transportes_tramos`

#### Facturación

1. Seleccionar operación con transporte asignado
2. N° factura TRA se genera automáticamente y se reserva inmediatamente en BD
3. Tramo se agrega como ítem base
4. Agregar costos extra del catálogo con chips de adición rápida:
   - Falso Flete, Seguro, Conexión Reefer, Sello Adicional, etc.
5. Monto = suma automática (CLP sin decimales, USD/EUR con 2 decimales)
6. Exportar PDF o Excel
7. Guardar → escribe en `operaciones`

**Numeración TRA:** `TRA0001`, `TRA0042`... Se reserva inmediatamente al seleccionar operación para evitar duplicados entre usuarios simultáneos.

#### Facturas Emitidas

- Registro histórico con filtros
- Totales por moneda (CLP, USD, EUR separados)
- Exportación Excel

---

### 5.3 Documentos

**Archivos:** `CrearProformaContent.tsx`, `CrearInstructivoContent.tsx`, `MisDocumentosContent.tsx`

#### Crear Proforma

Editor completo de Proforma Invoice con 6 pestañas:

| Pestaña | Contenido |
|---------|-----------|
| Mercadería | Items: especie, variedad, calibre, cajas, pesos, precios (calculados automáticamente) |
| Partes | Exportador/Shipper + Consignee + Notify Party |
| Embarque | Naviera, nave, booking, POL, POD, ETD, ETA, contenedor, sello, tara, tipo |
| Condiciones | Incoterm, moneda, forma de pago |
| Documentos | DUS, CSG, CSP, guía de despacho, corte documental, observaciones |
| Etiquetas | Gestión de plantillas + detección automática de etiquetas |

**Cálculos automáticos de ítems:**

```
kg_neto_caja × cantidad_cajas = kg_neto_total
kg_bruto_caja × cantidad_cajas = kg_bruto_total
valor_caja / kg_neto_caja = valor_kilo  (si priceSource = "caja")
valor_kilo × kg_neto_caja = valor_caja  (si priceSource = "kilo")
valor_caja × cantidad_cajas = valor_total
```

**Importar desde Excel externo:** Sube un Excel de otro sistema. El normalizador detecta campos automáticamente usando aliases en español e inglés.

**Tablas:** `proformas`, `proforma_items`, `operaciones`, `consignatarios`, `formatos_documentos`

#### Tipos de documento admitidos

| Tipo | Descripción |
|------|-------------|
| BOOKING | Confirmación de booking naviero |
| SOLICITUD_RESERVA | Solicitud de reserva de transporte |
| INSTRUCTIVO_EMBARQUE | Instrucciones de embarque (IE) |
| FACTURA_GATE_OUT | Factura gate out |
| FACTURA_PROFORMA | Proforma de factura de venta |
| CERTIFICADO_FITOSANITARIO | Certificado fitosanitario |
| CERTIFICADO_ORIGEN | Certificado de origen |
| BL_TELEX_SWB_AWB | Bill of Lading / Telex / SWB / AWB |
| FACTURA_COMERCIAL | Factura comercial definitiva |
| DUS | Documento Único de Salida |
| FULLSET | Set completo de documentos |

---

### 5.4 Registros

**Archivo:** `RegistrosContent.tsx`

Tabla maestra con ag-Grid (estilo Excel verde). Muestra todos los campos de `operaciones` en columnas configurables, con filtros avanzados, ordenamiento multinivel, columnas pinned y exportación Excel.

---

### 5.5 Reportes

**Archivo:** `ReportesContent.tsx`

Analytics operacionales: operaciones por estado, cajas por especie, valor FOB por destino. Filtros avanzados. Exportación Excel.

---

### 5.6 Finanzas

**Archivo:** `FinanzasContent.tsx`

Margen estimado vs real, rentabilidad por cliente, totales por moneda, fechas de pago.

**Campos usados:** `monto_facturado`, `margen_estimado`, `margen_real`, `tipo_cambio`, `fecha_pago_cliente`, `fecha_pago_transporte`

---

### 5.7 Itinerario

**Archivos:** `ItinerarioContent.tsx`, `ItinerarioMap.tsx`

Horarios de líneas navieras en mapa interactivo (MapLibre GL).

**Subrutas:**
- `/itinerario/consorcios` — Alianzas navieras (Maersk/MSC, ONE/Yang Ming, etc.)
- `/itinerario/servicios` — Servicios con código de servicio por naviera

**Tablas:** `itinerarios`, `itinerario_escalas`, `navieras`, `naves`, `consorcios`, `servicios_unicos`

---

### 5.8 Stacking

**Archivo:** `StackingContent.tsx`

Coordinación de bodega: timeline de contenedores, OCR para documentos (`tesseract.js`), borradores locales.

**Campos en operaciones:** `inicio_stacking`, `fin_stacking`, `ingreso_stacking`

---

### 5.9 Tracking

**Archivo:** `TrackingContent.tsx`

Página pública de rastreo de embarques. Búsqueda por referencia ASLI sin necesidad de login.

---

### 5.10 Configuración (superadmin)

#### Usuarios

CRUD de usuarios: roles, activar/desactivar. **Tabla:** `usuarios`

#### Transportes

5 pestañas:

| Pestaña | Tabla | Descripción |
|---------|-------|-------------|
| Empresas | transportes_empresas | Empresas con RUT |
| Choferes | transportes_choferes | Nombre, RUT, teléfono, activo |
| Equipos | transportes_equipos | Patentes camión y remolque |
| Tramos | transportes_tramos | Tarifario origen → destino |
| Costos Extra | transportes_costos_extra | Catálogo: Falso Flete, Seguro, etc. |

#### Consignatarios

Master data de consignees y notify parties.

| Grupo | Campos |
|-------|--------|
| General | nombre, cliente, destino, activo, notas |
| Consignee | company, address, attn, uscc, mobile, email, zip |
| Notify Party | company, address, attn, uscc, mobile, email, zip |

#### Formatos de Documentos

Plantillas HTML o Excel con etiquetas `{{...}}` para generación automática.

| Campo | Descripción |
|-------|-------------|
| nombre | Nombre descriptivo de la plantilla |
| tipo | INSTRUCTIVO_EMBARQUE, FACTURA_PROFORMA, etc. |
| template_type | html o excel |
| contenido_html | Código HTML con etiquetas |
| excel_path | Ruta en Storage al archivo .xlsx plantilla |
| cliente | Filtro por cliente (null = global, aplica a todos) |

---

## 6. Sistema de Etiquetas (Templates)

El sistema reemplaza etiquetas `{{campo}}` en plantillas HTML o Excel con datos reales.

### Cómo funciona

1. Diseñas tu plantilla con etiquetas `{{nombre_del_campo}}`
2. Al exportar, cada etiqueta se reemplaza por su valor real
3. En HTML se soporta bloque repetible `{{#items}}...{{/items}}` para filas de productos
4. Las etiquetas son tolerantes a espacios y mayúsculas: `{{ Exportador }}` equivale a `{{exportador}}`

### Detección automática (pestaña "Etiquetas")

Al seleccionar una plantilla, el sistema escanea todas las `{{...}}` y las clasifica:

- **Verde** — Reconocida, se reemplazará. Muestra el valor actual de ese campo.
- **Ámbar** — No reconocida. Muestra botón con la etiqueta equivalente que sí funciona. Clic para copiar.

### Etiquetas disponibles — Proforma Invoice

#### Identificación

| Etiqueta | Valor | Alias aceptados |
|----------|-------|-----------------|
| `{{numero_proforma}}` | Número PRF0001 | `{{numero_documento}}` |
| `{{ref_asli}}` | Referencia ASLI-2026-001 | — |
| `{{correlativo}}` | Correlativo de la operación | — |
| `{{fecha}}` | Fecha de emisión | `{{fecha_emision}}` |

#### Exportador / Shipper

| Etiqueta | Valor | Alias aceptados |
|----------|-------|-----------------|
| `{{exportador}}` | Nombre empresa | `{{shipper}}`, `{{empresa_nombre}}` |
| `{{exportador_rut}}` | RUT empresa | `{{empresa_rut}}` |
| `{{exportador_direccion}}` | Dirección | `{{empresa_direccion}}` |

#### Consignee

| Etiqueta | Valor | Alias aceptados |
|----------|-------|-----------------|
| `{{consignee}}` | Nombre consignee | `{{importador}}`, `{{consignee_company}}` |
| `{{consignee_address}}` | Dirección | — |
| `{{consignee_pais}}` | País destino | `{{pais_destino}}` |
| `{{consignee_uscc}}` | USCC/USCI | `{{consignee_usci}}` |
| `{{consignee_attn}}` | Atención (contacto) | — |
| `{{consignee_email}}` | Email | — |
| `{{consignee_mobile}}` | Teléfono | — |
| `{{consignee_zip}}` | Código postal | — |

#### Notify Party

| Etiqueta | Valor | Alias aceptados |
|----------|-------|-----------------|
| `{{notify_company}}` | Empresa notify | `{{notify}}` |
| `{{notify_address}}` | Dirección | — |
| `{{notify_attn}}` | Atención | — |
| `{{notify_email}}` | Email | — |
| `{{notify_mobile}}` | Teléfono | — |
| `{{notify_zip}}` | ZIP | — |

#### Embarque

| Etiqueta | Valor | Alias aceptados |
|----------|-------|-----------------|
| `{{naviera}}` | Naviera | — |
| `{{nave}}` | Nombre nave | `{{vessel}}` |
| `{{booking}}` | N° booking | — |
| `{{pol}}` | Puerto de embarque | `{{puerto_embarque}}` |
| `{{pod}}` | Puerto de descarga | `{{puerto_descarga}}` |
| `{{destino_final}}` | Destino final | — |
| `{{etd}}` | Fecha zarpe | `{{fecha_embarque}}` |
| `{{eta}}` | Fecha arribo estimado | — |
| `{{contenedor}}` | N° contenedor | — |
| `{{sello}}` | N° sello | — |
| `{{tara}}` | Tara del contenedor | — |
| `{{tipo_contenedor}}` | Tipo (ej. 40' RF High Cube) | — |

#### Condiciones Comerciales

| Etiqueta | Valor | Alias aceptados |
|----------|-------|-----------------|
| `{{incoterm}}` | Cláusula de venta | `{{clausula_venta}}` |
| `{{moneda}}` | Moneda (USD, EUR, CLP) | — |
| `{{forma_pago}}` | Condición de pago | — |
| `{{pais_origen}}` | Siempre "Chile" | — |

#### Carga y Totales

| Etiqueta | Valor | Alias aceptados |
|----------|-------|-----------------|
| `{{especie}}` | Especie general | — |
| `{{descripcion_carga}}` | "Uva Red Globe; Pera Williams" | — |
| `{{temperatura}}` | Temperatura de transporte | — |
| `{{ventilacion}}` | Ventilación | — |
| `{{pallets}}` | N° pallets | — |
| `{{total_cajas}}` | Total de cajas | — |
| `{{total_peso_neto}}` | Peso neto total | `{{peso_neto_total}}` |
| `{{total_peso_bruto}}` | Peso bruto total | `{{peso_bruto_total}}` |
| `{{total_valor}}` | Monto con moneda "USD 25.400,00" | `{{fob_total}}` |
| `{{total_valor_numero}}` | Solo el número sin moneda | — |

#### Documentos de Exportación

| Etiqueta | Valor |
|----------|-------|
| `{{dus}}` | N° DUS |
| `{{csg}}` | N° CSG |
| `{{csp}}` | N° CSP |
| `{{numero_guia_despacho}}` | N° guía de despacho |
| `{{corte_documental}}` | Fecha corte documental |
| `{{observaciones}}` | Observaciones generales |

#### ASLI (valores fijos)

| Etiqueta | Valor |
|----------|-------|
| `{{asli_nombre}}` | Asesorías y Servicios Logísticos Integrales Ltda. |
| `{{asli_rut}}` | RUT de ASLI |
| `{{asli_email}}` | Email de ASLI |

### Ítems en HTML — bloque repetible

Envuelve las filas de la tabla de productos entre `{{#items}}` y `{{/items}}`:

```html
{{#items}}
<tr>
  <td>{{especie}}</td>
  <td>{{variedad}}</td>
  <td>{{calibre}}</td>
  <td>{{cajas}}</td>
  <td>{{kg_neto_caja}}</td>
  <td>{{kg_bruto_caja}}</td>
  <td>{{kg_neto_total}}</td>
  <td>{{kg_bruto_total}}</td>
  <td>{{precio_caja}}</td>
  <td>{{precio_kilo}}</td>
  <td>{{total_linea}}</td>
</tr>
{{/items}}
```

### Ítems en Excel — etiquetas numeradas

Para Excel usa etiquetas con el número de fila del ítem:

```
{{item_1_especie}}       {{item_1_variedad}}      {{item_1_calibre}}
{{item_1_cajas}}         {{item_1_kg_neto_caja}}  {{item_1_kg_bruto_caja}}
{{item_1_kg_neto_total}} {{item_1_kg_bruto_total}}
{{item_1_precio_caja}}   {{item_1_precio_kilo}}   {{item_1_total_linea}}
```

Repetir con `item_2_`, `item_3_`... hasta `item_30_`.

### Normalizador de Excel externo (`proforma-normalizer.ts`)

Al importar un Excel de otro sistema, detecta automáticamente campos usando aliases multiidioma:

| Campo estándar | Aliases reconocidos (muestra) |
|----------------|------------------------------|
| cliente | EXPORTADOR, SHIPPER, SELLER, SUPPLIER, EXPORTER |
| consignatario | CONSIGNEE, BUYER, IMPORTADOR, IMPORTER |
| nave | VESSEL, MOTONAVE, VSL, SHIP, NAME OF VESSEL |
| booking | BOOKING NUMBER, BOOKING NO, RESERVATION |
| pol | LOADING PORT, PORT OF LOADING, PUERTO EMBARQUE |
| pod | DISCHARGE PORT, PORT OF DISCHARGE, PUERTO DESTINO |
| etd | SAILING DATE, FECHA EMBARQUE, DEPARTURE DATE |
| peso_neto | NET WEIGHT, NETO, NET KG, TOTAL NET WEIGHT |
| monto_facturado | TOTAL USD, FOB TOTAL, GRAND TOTAL, INVOICE TOTAL |

---

## 7. Base de Datos

### Tabla `operaciones` (central)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| correlativo | int | Auto-incrementado |
| ref_asli | text | ASLI-2026-001 |
| cliente | text | Empresa exportadora |
| naviera | text | Naviera |
| nave | text | Nombre nave |
| booking | text | N° booking |
| pol | text | Puerto de embarque |
| pod | text | Puerto de destino |
| etd | date | Fecha zarpe estimada |
| eta | date | Fecha arribo estimada |
| estado_operacion | text | abierta / cerrada / pendiente / cancelada |
| enviado_transporte | boolean | Enviado al módulo de transporte |
| deleted_at | timestamptz | Soft delete (NULL = activo) |
| especie | text | Especie (uva, pera, arándano...) |
| variedad | text | Variedad |
| calibre | text | Calibre |
| pallets | int | N° pallets |
| peso_neto | numeric | Peso neto total |
| peso_bruto | numeric | Peso bruto total |
| tipo_unidad | text | Tipo de contenedor |
| temperatura | text | Set-point temperatura |
| ventilacion | int | % ventilación |
| transporte | text | Empresa de transporte |
| chofer | text | Nombre del chofer |
| rut_chofer | text | RUT del chofer |
| telefono_chofer | text | Teléfono |
| patente_camion | text | Patente camión |
| patente_remolque | text | Patente remolque |
| contenedor | text | N° contenedor |
| sello | text | N° sello |
| tara | numeric | Tara del contenedor |
| tramo | text | Origen-Destino |
| valor_tramo | numeric | Valor del tramo |
| moneda | text | CLP / USD / EUR |
| citacion | timestamptz | Citación a planta |
| llegada_planta | timestamptz | Llegada a planta |
| salida_planta | timestamptz | Salida de planta |
| inicio_stacking | date | Inicio stacking |
| fin_stacking | date | Fin stacking |
| ingreso_stacking | timestamptz | Ingreso efectivo a stacking |
| numero_factura_asli | text | TRA0001 |
| monto_facturado | numeric | Total facturado |
| tipo_cambio | numeric | Tipo de cambio aplicado |
| margen_estimado | numeric | Margen estimado |
| margen_real | numeric | Margen real |
| fecha_pago_cliente | date | Pago del cliente |
| fecha_pago_transporte | date | Pago al transporte |

### Otras tablas del sistema

| Tabla | Propósito |
|-------|-----------|
| proformas | Cabecera de proforma invoice |
| proforma_items | Líneas de ítems de proforma |
| formatos_documentos | Plantillas HTML/Excel de documentos |
| documentos | Archivos subidos (metadata + URL en Storage) |
| usuarios | Perfiles con rol, nombre, email, activo |
| usuarios_empresas | Many-to-many: usuarios cliente a empresas |
| empresas | Empresas exportadoras |
| consignatarios | Consignees y notify parties por cliente |
| catalogos | Listas de valores (monedas, condiciones, etc.) |
| transportes_empresas | Empresas de transporte |
| transportes_choferes | Choferes por empresa |
| transportes_equipos | Camiones/remolques |
| transportes_tramos | Tarifario de rutas |
| transportes_costos_extra | Catálogo de costos adicionales |
| transportes_reservas_ext | Reservas de transporte externo |
| navieras | Líneas navieras |
| naves | Buques/naves |
| itinerarios | Horarios navieros |
| itinerario_escalas | Escalas de cada itinerario |
| consorcios | Alianzas navieras |
| servicios_unicos | Servicios con código por naviera |
| sesiones_activas | Sesiones de usuario activas |
| conteo_visitas | Contador de visitas |

---

## 8. Autenticación y Sesiones

### Flujo de auth

1. Usuario se registra → Supabase Auth crea `auth.users`
2. Superadmin aprueba → crea row en `public.usuarios` con rol asignado
3. En cada carga: `useAuth()` consulta `public.usuarios` filtrando por `auth_id = auth.uid()`
4. Si no hay row en `usuarios` → usuario externo/visitante (`isExternalUser = true`)

### Clientes multi-empresa

Un usuario con rol `cliente` puede estar vinculado a múltiples empresas vía `usuarios_empresas`. El hook devuelve `empresaNombres: string[]` para filtrar operaciones por empresa.

### Sesiones activas

La tabla `sesiones_activas` permite mostrar cuántos usuarios están conectados en tiempo real (componente `OnlineUsersButton`).

---

## 9. Email con Gmail API

**Archivo:** `src/lib/email/sendEmail.ts`
**Edge Function:** `supabase/functions/send-email/`

La función usa una Service Account de Google con Domain-Wide Delegation para enviar emails en nombre del ejecutivo activo, incluyendo su firma de Gmail automáticamente.

### Arquitectura

```
Componente React
      |
      v
sendEmail(params)
      |
      v  supabase.functions.invoke("send-email")
      |
      v
Edge Function (Deno)
      |
      +-- Extrae email del JWT del usuario
      +-- Genera access_token via Service Account (JWT impersonation)
      +-- Obtiene firma Gmail del usuario (Gmail Settings API)
      +-- Construye email MIME multipart (texto + adjuntos base64)
      +-- Envía via Gmail API
```

### Uso

```typescript
import { sendEmail } from "@/lib/email/sendEmail";

const result = await sendEmail({
  to: "destinatario@ejemplo.com",
  subject: "Instructivo de Embarque ASLI-2026-001",
  body: "<p>Adjunto encontrará el IE...</p>",
  attachments: [
    {
      name: "IE_ASLI-2026-001.pdf",
      content: base64String,
      mimeType: "application/pdf",
    }
  ],
});
```

### Prerrequisitos

- Google Service Account con Domain-Wide Delegation habilitado
- Scopes requeridos: `gmail.send`, `gmail.settings.basic`
- Secrets configurados en Supabase Dashboard → Edge Functions → Secrets

---

## 10. Internacionalización

**Archivos:** `src/lib/i18n/LocaleContext.tsx`, `src/lib/i18n/translations.ts`

```typescript
const { t, locale, setLocale } = useLocale();
const tr = t.facturacion;

return <h1>{tr.title}</h1>;
```

**Regla:** Siempre agregar nuevas claves en **ambos** idiomas (`es` y `en`).

---

## 11. Exportación de Archivos

### Excel con estilos (`xlsx-js-style`)

```typescript
import * as XLSX from "xlsx-js-style";  // NO usar "xlsx" plain

ws["A1"] = {
  v: "Texto",
  t: "s",
  s: {
    font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1D6F42" } },    // verde Excel
    alignment: { horizontal: "center" },
    border: { bottom: { style: "thin" } },
  }
};

// Merge de celdas
ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

// Ancho de columnas
ws["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }];
```

### Formato de montos

```typescript
const fmtAmt = (n: number, mon: string) => {
  const isCLP = mon.toUpperCase() === "CLP";
  return n.toLocaleString("es-CL", {
    minimumFractionDigits: isCLP ? 0 : 2,
    maximumFractionDigits: isCLP ? 0 : 2,
  });
};
// CLP: "1.250.000"   (sin decimales)
// USD: "25.400,00"   (2 decimales)
```

### PDF (`jspdf` + `jspdf-autotable`)

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const doc = new jsPDF({ orientation: "landscape", unit: "mm" });
autoTable(doc, {
  head: [["Especie", "Cajas", "Kg Neto", "Valor"]],
  body: items.map(i => [i.especie, i.cajas, i.kg_neto, i.valor]),
  styles: { fontSize: 9 },
  headStyles: { fillColor: [29, 111, 66] },   // verde Excel
});
doc.save("proforma.pdf");
```

### Reemplazo de etiquetas en Excel (.xlsx con JSZip)

El sistema edita el XML interno del .xlsx directamente usando JSZip, reemplazando etiquetas `{{...}}` en cada celda.

---

## 12. Guía de Desarrollo

### Agregar campo a operaciones

```sql
-- 1. Migración SQL
ALTER TABLE operaciones ADD COLUMN nuevo_campo text;
```

```typescript
// 2. Tipo en el componente
type Operacion = { nuevo_campo: string | null; };

// 3. Incluir en SELECT
.select("..., nuevo_campo")

// 4. Input en el formulario
<input
  value={op.nuevo_campo ?? ""}
  onChange={e => setOp(p => ({ ...p, nuevo_campo: e.target.value }))}
/>
```

### Agregar etiqueta de proforma

```typescript
// En buildTagMap() — CrearProformaContent.tsx:
"{{nueva_etiqueta}}": header.nuevo_campo,
"{{alias_opcional}}": header.nuevo_campo,

// En PROFORMA_TAG_CATALOG:
{ tag: "{{nueva_etiqueta}}", label: "Descripción visible al usuario" }

// En TAG_SUGGESTION_ALIASES (para sugerencias en chips ámbar):
variante_comun: "{{nueva_etiqueta}}",
common_english: "{{nueva_etiqueta}}",
```

### Agregar módulo al sidebar

```typescript
// src/lib/site.ts
{
  labelKey: "nuevoModulo",    // clave en translations.ts
  id: "nuevo-modulo",
  href: "/nuevo-modulo",
  superadminOnly: false,      // true para ocultar a no-superadmin
}
```

Agregar `nuevoModulo` en `translations.ts` en ambos idiomas.

### Patrón de soft delete

```typescript
// Borrar (soft)
await supabase.from("operaciones")
  .update({ deleted_at: new Date().toISOString() }).eq("id", id);

// Restaurar
await supabase.from("operaciones")
  .update({ deleted_at: null }).eq("id", id);

// Siempre filtrar activos
.is("deleted_at", null)

// Papelera
.not("deleted_at", "is", null)
```

### Numeración de facturas TRA

```typescript
const { data } = await supabase
  .from("operaciones")
  .select("numero_factura_asli")
  .like("numero_factura_asli", "TRA%")
  .order("numero_factura_asli", { ascending: false })
  .limit(1).maybeSingle();

const last = data?.numero_factura_asli
  ? parseInt(data.numero_factura_asli.replace("TRA", ""), 10) : 0;
const newNum = `TRA${String(last + 1).padStart(4, "0")}`;

// Reservar inmediatamente para evitar duplicados
await supabase.from("operaciones")
  .update({ numero_factura_asli: newNum }).eq("id", operacionId);
```

### Colores de estado (convención)

| Estado | Color Tailwind | Uso |
|--------|---------------|-----|
| OK / Pagado / Activo | `emerald` | Estado cerrada, facturas pagadas |
| Pendiente / Advertencia | `amber` | Estado pendiente, etiquetas no reconocidas |
| Error / Cancelado | `red` | Estado cancelada, errores |
| Activo / Seleccionado | `blue` / `indigo` | Elemento seleccionado, estado abierta |
| Neutro / Borrador | `neutral` | Información secundaria |

### Tabla responsive (patrón)

```tsx
{/* Cards en móvil */}
<div className="md:hidden divide-y divide-neutral-100">
  {items.map(i => <div key={i.id} className="p-4">...</div>)}
</div>

{/* Tabla en desktop */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full text-sm">...</table>
</div>
```

---

## 13. Variables de Entorno

Archivo `.env` en la raíz del proyecto (no committear al repositorio):

```env
# Supabase — requeridas en cliente y servidor
PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Solo para scripts de backend y migraciones
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Las variables con prefijo `PUBLIC_` son accesibles desde el browser. Las sin prefijo solo en SSR/server.

---

## 14. Migraciones de Base de Datos

Archivos en `supabase/migrations/` con formato `YYYYMMDDHHMMSS_descripcion.sql`.

### Aplicar una migración

1. Abrir **Supabase Dashboard → SQL Editor**
2. Pegar el contenido del archivo `.sql`
3. Ejecutar y verificar

### Historial de migraciones

| Archivo | Descripción |
|---------|-------------|
| ..._create_clientes.sql | Tabla de empresas clientes |
| ..._create_operaciones.sql | Tabla central de operaciones |
| ..._create_usuarios.sql | Perfiles con roles |
| ..._auth_roles_rls.sql | Políticas RLS por rol |
| ..._usuarios_empresas.sql | Vinculación usuario-empresa |
| ..._itinerarios.sql | Horarios navieros |
| ..._servicios_unicos_consorcios.sql | Servicios y consorcios |
| ..._transportes_tramos.sql | Tarifario de rutas |
| ..._seed_transportes.sql | Datos iniciales de transporte |
| ..._transportes_reservas_ext.sql | Reservas externas |
| ..._formatos_documentos.sql | Plantillas de documentos |
| ..._consignatarios_rls.sql | RLS consignatarios (**PENDIENTE**) |
| ..._tratamiento_frio_tipo_atmosfera.sql | Cadena de frío y atmósfera |
| ..._visitas.sql | Contador de visitas |
| ..._sesiones_activas.sql | Sesiones activas en tiempo real |
| ..._proformas.sql | Tablas proforma (header + items) |
| ..._operaciones_ventilacion_integer.sql | Campo ventilacion como integer |

### Migración pendiente

```sql
-- Archivo: supabase/migrations/20260317000010_consignatarios_rls.sql
-- Aplicar en Supabase SQL Editor

-- Aplica RLS a la tabla consignatarios:
--   superadmin/admin: acceso total
--   ejecutivo/operador: solo lectura
--   cliente: sin acceso
```

---

*Documentación generada el 2026-03-22. Actualizar este archivo junto con cada cambio significativo en el código.*
