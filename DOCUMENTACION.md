# ASLI Embarques — Documentación del Sistema

Sistema de gestión logística de exportaciones. Cubre todo el flujo operativo: desde la creación de una operación hasta la facturación del transporte, pasando por documentos y seguimiento de carga.

---

## Tabla de Contenidos

1. [Inicio](#inicio)
2. [Dashboard](#dashboard)
3. [Reservas](#reservas)
4. [Registros](#registros)
5. [Transportes](#transportes)
6. [Documentos](#documentos)
7. [Tracking](#tracking-público)
8. [Itinerario](#itinerario)
9. [Stacking](#stacking)
10. [Finanzas](#finanzas)
11. [Reportes](#reportes)
12. [Configuración](#configuración)
13. [Roles y Acceso](#roles-y-acceso)

---

## Inicio

Página de bienvenida accesible para visitantes sin sesión.

- Estadísticas en vivo: operaciones activas, contenedores, próximos zarpes, documentos pendientes
- Visualización del flujo de trabajo en 5 pasos: Crear → Transporte → Carga → Zarpe → Documentar
- Tabla comparativa antes/después del sistema
- Accesos rápidos a módulos principales
- Botones de acción: iniciar sesión, registrarse, solicitar demo

---

## Dashboard

Vista general para usuarios autenticados.

**Métricas visibles:**
- Total de operaciones y desglose por estado (Pendiente, En Proceso, En Tránsito, Arribado, Completado, Cancelado, Roleado)
- Operaciones de la semana y del mes
- Clientes activos

**Funciones:**
- Próximos zarpes (siguientes 7 días)
- Últimas 10 operaciones ingresadas
- Top 8 navieras por volumen
- Filtros por rango de fechas, estado, cliente y naviera
- Botón de refresco con indicador de última actualización

---

## Reservas

### Crear Reserva

Crea una nueva operación de exportación.

**Secciones del formulario:**

| Sección | Campos |
|---------|--------|
| General | Ejecutivo, cliente, consignatario, estado, tipo operación |
| Carga | Especie, país, temperatura, ventilación, tratamiento de frío, O₂/CO₂, tipo atmósfera, pallets, peso bruto/neto, tipo contenedor |
| Embarque | Naviera, nave, POL, POD, ETD, ETA, booking, AGA, DUS, SPS |
| Planta | Planta de presentación, citación, horarios de stacking |
| Depósito | Selección de depósito |
| Observaciones | Notas libres |

**Acciones disponibles:**
- Creación de cliente en el momento si no existe en el sistema
- Vista previa antes de guardar
- Guardar y enviar directamente al módulo de transportes

---

### Mis Reservas

Lista todas las reservas propias con opciones de gestión.

- Filtros por estado, cliente, naviera, especie y búsqueda libre
- Selección múltiple para enviar operaciones en bloque al módulo de transportes
- Vista tabla en desktop, tarjetas en móvil

---

### Papelera

Gestiona las operaciones eliminadas (borrado lógico).

- Restaurar operaciones eliminadas
- Eliminar definitivamente

---

## Registros

Tabla maestra de **todas** las operaciones del sistema con visibilidad completa por columnas.

**Grupos de columnas:**

| Grupo | Columnas principales |
|-------|---------------------|
| Básico | Correlativo, Ref ASLI, Fecha ingreso, Semana, Ejecutivo |
| Estado | Estado operación, Tipo operación |
| Comercial | Cliente, Consignatario, Incoterm, Forma de pago |
| Carga | Especie, País, Temperatura, Ventilación, Tratamiento frío, O₂/CO₂, Tipo atmósfera, Pallets, Peso bruto/neto, Tipo contenedor |
| Embarque | Naviera, Nave, POL, ETD, POD, ETA, Tránsito, Booking, AGA, DUS, SPS, N° guía |
| Planta | Planta presentación, Citación, Llegada/salida planta, Inicio/fin stacking |
| Depósito | Depósito asignado |
| Transporte | Empresa, Chofer, RUT, Teléfono, Patente camión, Patente remolque, Contenedor, Sello, Tara, Tramo, Valor, Moneda |
| Facturación | N° factura ASLI, Factura transporte, Monto facturado, Concepto, Tipo cambio, Margen estimado, Margen real, Fechas de pago |

**Acciones:**
- Ordenamiento y filtrado por cualquier columna
- Selección múltiple para acciones en lote
- Exportación a Excel con formato
- Vista de tarjetas en móvil

---

## Transportes

Módulo de gestión del transporte terrestre. Flujo: Reserva ASLI → Facturación → Facturas emitidas.

---

### Reserva ASLI

Asigna transporte propio (flota ASLI) a una operación.

**Flujo de asignación:**
1. Seleccionar operación enviada desde Reservas
2. Elegir empresa de transporte
3. Seleccionar chofer (nombre, RUT, teléfono)
4. Seleccionar equipo (patente camión + remolque)
5. Seleccionar tramo → tarifa y moneda se cargan automáticamente
6. Completar: contenedor, sello, tara
7. Completar fechas: citación, llegada/salida planta, inicio/fin stacking, ingreso depósito

---

### Reserva Externa

Registra transportistas terceros. Mismo flujo que Reserva ASLI con campos adicionales:

- Porteo con valor
- Falso flete con valor
- N° factura del transportista externo
- Estado de la reserva (Pendiente / En proceso / Entregado / Cancelada)

---

### Facturación

Genera proformas de factura de transporte.

**Flujo:**
1. Seleccionar operación → N° de factura `TRAxxxx` se reserva automáticamente
2. Datos de transporte pre-cargados desde la reserva
3. Armar ítems de proforma:
   - Ítem base: tramo con valor auto-cargado
   - Costos extra del catálogo (Falso Flete, Seguro, Conexión Reefer, etc.)
4. Total calculado automáticamente (CLP sin decimales, USD/EUR con 2 decimales)
5. Completar: concepto, tipo de cambio, márgenes, fechas de pago

**Exportaciones:**
- **PDF** — proforma con formato profesional
- **Excel** — planilla con estilos (`xlsx-js-style`)

> **Numeración TRA:** formato `TRA0001`, `TRA0002`... Se reserva al momento de seleccionar la operación para evitar duplicados.

---

### Facturas Emitidas

Registro histórico de todas las facturas de transporte generadas.

- Filtros por búsqueda, cliente, estado y rango de fechas
- Totales agrupados por moneda (CLP / USD / EUR)
- Exportación a Excel

---

## Documentos

### Mis Documentos

Gestión de archivos por operación de exportación.

**Tipos de documento soportados:**

| Tipo | Descripción |
|------|-------------|
| BOOKING | Confirmación de reserva naviera |
| INSTRUCTIVO_EMBARQUE | Instrucciones de embarque |
| FACTURA_GATE_OUT | Factura de salida de puerto |
| FACTURA_PROFORMA | Proforma comercial |
| CERTIFICADO_FITOSANITARIO | Certificado SAG/phytosanitario |
| CERTIFICADO_ORIGEN | Certificado de origen |
| BL / TELEX / SWB / AWB | Conocimiento de embarque |
| FACTURA_COMERCIAL | Factura comercial final |
| DUS | Declaración Única de Salida |
| FULLSET | Juego completo de documentos |

**Acciones:** subir, previsualizar y eliminar archivos por tipo.

---

### Crear Instructivo

Genera automáticamente un instructivo de embarque a partir de los datos de la operación. Exporta como PDF o Excel.

---

### Crear Proforma

Genera una proforma comercial con datos de la operación y facturación. Exporta como PDF o Excel.

---

## Tracking (Público)

Búsqueda de estado de carga **sin necesidad de iniciar sesión**.

**Busca por:** número de booking, N° de contenedor o referencia ASLI.

**Información visible:**
- Estado de la operación (con badge de color)
- Naviera, nave, POL, ETD, POD, ETA, tiempo de tránsito
- Cliente, contenedor, tipo de carga, especie

> No expone datos financieros ni información sensible.

---

## Itinerario

*Acceso: superadmin*

Gestión de itinerarios de líneas navieras con mapa interactivo.

**Funciones:**
- Crear, editar y eliminar itinerarios
- Agregar escalas (puerto, ETA, días de tránsito, área geográfica)
- Áreas: Asia, Europa, Américas, África, Oceanía
- Exportar itinerario a PDF
- Vista pública del itinerario para visitantes sin sesión

**Submódulos:**
- **Servicios por naviera** — lista de servicios únicos por línea naviera
- **Consorcios** — gestión de alianzas entre navieras

---

## Stacking

Calendario de ventanas de recepción de contenedores por itinerario.

**Funciones:**
- Definir horarios de apertura y cierre por día
- Visualizar días hasta el cutoff con códigos de color:
  - Verde: abierto con margen
  - Amarillo: cierre próximo
  - Rojo: cerrado / cutoff
- Capacidad por día
- Cutoff automático (1 día antes del ETD por defecto)
- Los borradores se guardan en el navegador (no requiere guardar en BD)

> Accessible para visitantes sin sesión (vista de consulta).

---

## Finanzas

Análisis financiero de las operaciones de exportación.

**Métricas:**
- Total facturado
- Total margen real
- Margen promedio por operación
- Cantidad de operaciones con facturación

**Vista por cliente:**
- Operaciones, pallets, peso neto, monto facturado, margen

**Filtros:** rango de fechas, cliente, estado.
**Exporta:** CSV con datos agregados.

> Los usuarios con rol `cliente` solo ven datos de sus propias empresas.

---

## Reportes

Análisis agregados del sistema.

**Vistas disponibles:**

| Vista | Detalle |
|-------|---------|
| Por cliente | Operaciones, pallets, peso, facturado, margen |
| Por naviera | Mismas métricas agrupadas por línea |
| Por estado | Desglose de operaciones según estado |
| Tendencia mensual | Serie de tiempo por mes de ingreso |

**Filtros:** fechas, estado, cliente, naviera.
**Exporta:** CSV con datos agregados.

---

## Configuración

*Acceso: superadmin*

### Usuarios

Gestión completa de cuentas del sistema.

- Crear usuarios con email, contraseña, nombre y rol
- Asignar empresas a usuarios (para roles cliente y ejecutivo)
- Cambiar rol y empresas asignadas
- Activar usuarios inactivos
- Resetear contraseñas
- Filtrar por rol o empresa

### Clientes (Empresas)

Catálogo de empresas clientes.

| Campo | Descripción |
|-------|-------------|
| Nombre | Razón social |
| Límite de crédito | Monto máximo de crédito |
| Condición de pago | Términos (ej. 30 días) |
| Descuento | Porcentaje de descuento |
| Activo | Estado de la empresa |

### Asignar Clientes

Vincula usuarios del sistema con las empresas que pueden gestionar.

### Transportes

Configuración del catálogo de transporte terrestre.

| Sección | Qué configura |
|---------|--------------|
| Empresas | Nombre y RUT de empresas transportistas |
| Choferes | Nombre, N° chofer, RUT y teléfono por empresa |
| Equipos | Patente camión y remolque por empresa |
| Tramos | Origen, destino, valor y moneda (tarifario) |

### Consignatarios

Catálogo de consignees y notify parties para los documentos de embarque.

**Campos por consignatario:**
- Nombre, cliente asociado, destino
- Consignee: company, dirección, atención, USCC, teléfono, email, zip
- Notify party: mismos campos

### Formatos de Documentos

Gestión de plantillas utilizadas para la generación automática de documentos (instructivos, proformas).

---

## Roles y Acceso

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `superadmin` | Administrador total | Todo el sistema sin restricciones |
| `admin` | Administrador operativo | CRUD completo excepto secciones superadmin |
| `ejecutivo` | Ejecutivo comercial | CRUD de sus operaciones, lectura de reportes |
| `operador` | Operador logístico | Lectura de operaciones, edición de transporte asignado |
| `cliente` | Usuario cliente final | Solo sus operaciones filtradas por empresa asignada |

### Acceso por módulo

| Módulo | superadmin | admin | ejecutivo | operador | cliente |
|--------|:----------:|:-----:|:---------:|:--------:|:-------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Crear Reserva | ✓ | ✓ | ✓ | — | — |
| Mis Reservas | ✓ | ✓ | ✓ | ✓ | ✓ |
| Registros | ✓ | ✓ | ✓ | ✓ | ✓ |
| Transporte ASLI | ✓ | ✓ | ✓ | ✓ | — |
| Facturación | ✓ | ✓ | ✓ | — | — |
| Documentos | ✓ | ✓ | ✓ | ✓ | — |
| Tracking | ✓ | ✓ | ✓ | ✓ | ✓ |
| Itinerario | ✓ | — | — | — | — |
| Stacking | ✓ | ✓ | ✓ | ✓ | ✓ |
| Finanzas | ✓ | ✓ | ✓ | — | ✓ * |
| Reportes | ✓ | ✓ | ✓ | — | — |
| Configuración | ✓ | — | — | — | — |

> \* Los clientes solo ven datos financieros de sus propias empresas.

---

## Tecnología

| Capa | Tecnología |
|------|-----------|
| Framework | Astro 5 + React 19 (islands) |
| Estilos | Tailwind CSS v4 |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Autenticación | Supabase Auth + tabla `usuarios` con roles |
| Excel | `xlsx-js-style` |
| Iconos | `@iconify/react` |
| Fechas | `date-fns` + locale `es` |
