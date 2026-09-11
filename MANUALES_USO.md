# EMBARQUES — Manuales de Uso por Rol

> **ASLI** — Asesorías y Servicios Logísticos Integrales  
> Plataforma de gestión de exportaciones frutícolas  
> Astro 5 + React 19 + Supabase

---

## Índice

1. [Manual para Cliente](#1-manual-para-cliente)
2. [Manual para Ejecutivo](#2-manual-para-ejecutivo)
3. [Manual para Superadmin](#3-manual-para-superadmin)
4. [Resumen de funcionalidades por rol](#4-resumen-de-funcionalidades-por-rol)

---

## 1. Manual para Cliente

### Tu experiencia en EMBARQUES

Como **cliente** de ASLI, tienes acceso a una plataforma diseñada específicamente para ti: te permite **seguir el estado de tus embarques en tiempo real**, consultar los detalles de cada operación y ver los documentos asociados —todo de manera clara, directa y sin pasos innecesarios.

Tu rol está enfocado en la **transparencia y comunicación**: sabes en todo momento qué está sucediendo con tus exportaciones y puedes interactuar con ASLI cuando lo necesites.

---

### Accediendo a la plataforma

1. Abre la aplicación en tu navegador.
2. Inicia sesión con tu email y contraseña (o regístrate si aún no tienes cuenta).
3. Si tu cuenta ya fue creada pero aún no tienes un rol asignado, comunícate con tu ejecutivo de ASLI para activarla.

Una vez dentro, verás una pantalla de inicio con información de ASLI y los accesos disponibles para tu perfil.

---

### Consultar tus operaciones

Desde la sección **Mis Reservas** o **Dashboard** (según tu acceso), puedes ver todas tus operaciones con una visión clara y ordenada:

- Referencia ASLI (ej: `ASLI-2026-001`)
- Empresa asociada
- Naviera y buque
- Número de booking
- Puerto de embarque (POL) y puerto de destino (POD)
- Fecha estimada de zarpe (ETD)
- Estado actual de cada operación

Puedes **filtrar** por estado, cliente, o buscar por referencia directamente. Esto te permite encontrar rápidamente la operación que necesitas consultar.

---

### Entendiendo los estados de tus operaciones

| Estado | Qué significa para ti |
|--------|-----------------------|
| **Abierta** | Tu operación está en curso, en proceso activo |
| **Cerrada** | Tu operación ha sido completada exitosamente |
| **Pendiente** | Requiere una acción o está en espera de un paso siguiente |
| **Cancelada** | La operación fue cancelada |

Esta información te da claridad inmediata sobre el estado actual de cada embarque.

---

### Acciones que puedes realizar

- **Ver los detalles** de cada operación para conocer toda la información relevante
- **Consultar los documentos** asociados a tu operación (proformas, instructivos, etc.)
- **Acceder al rastreo** de tus embarques

---

### Rastreo de embarques (`/tracking`)

Puedes usar la página de **tracking** de forma independiente, incluso sin iniciar sesión. Es una herramienta pública que te permite:

1. Ingresar tu referencia ASLI (ej: `ASLI-2026-001`)
2. Presionar buscar
3. Ver el estado actual de tu embarque, si está disponible

> Esta página es útil para compartir con tus propios clientes o contactos, ya que les permite consultar el estado de un embarque específico sin necesidad de credenciales.

---

### Documentos asociados

Cuando tengas documentos generados para tus operaciones —como proforma invoice o instructivo de embarque— podrás consultarlos y descargarlos desde tu área de documentos o desde la vista de tu operación.

---

### Citas y seguimiento logístico

Según tu configuración de acceso, también podrías ver información operacional como:

- Fechas de citación a planta
- Fechas de llegada y salida de planta
- Estado de ingreso a stacking (bodega)

Esto te permite mantener el control de los tiempos logísticos de tus operaciones.

---

### El valor de tu rol

Tu enfoque en EMBARQUES es la **visibilidad**. Tú no necesitas crear o gestionar operaciones ni configurar el sistema —eso lo hace el equipo de ASLI por ti— y eso te permite concentrarte en lo que importa: **saber qué está pasando con tus embarques y tener documentación disponible cuando la necesites**.

Tu experiencia está diseñada para ser **directa, sin fricción y con acceso inmediato** a la información que necesitas.

---

## 2. Manual para Ejecutivo

### Tu rol en EMBARQUES

Como **ejecutivo comercial** de ASLI, eres el responsable directo de gestionar las operaciones de exportación de tus clientes. EMBARQUES te da todas las herramientas para crear, documentar y acompañar cada embarque desde su inicio hasta su cierre, de manera eficiente y profesional.

Tu trabajo es central para el flujo del sistema, y la plataforma está diseñada para potenciarte: te permite gestionar múltiples operaciones, generar documentos profesionales y tener una visión completa del estado de tu cartera de trabajo.

---

### Dashboard (`/dashboard`)

Tu **punto de partida** al ingresar. El dashboard te da una visión global y actualizada de tu actividad operativa:

#### Métricas que verás

- Total de operaciones activas en tu cartera
- Operaciones pendientes de acción
- Operaciones confirmadas
- Operaciones canceladas
- Operaciones con arribo confirmado
- Zarpe del día, del día siguiente y de los próximos 7 días
- Cortes documentales próximos (próximos 3 días)
- Operaciones que necesitan asignación de transporte
- Operaciones sin documento de booking
- Operaciones críticas o con prioridad alta
- Operaciones con factura pendiente de emitir

#### Mapa interactivo

Verás un mapa con los puertos de origen y destino de tus operaciones, con indicadores que muestran cuántas operaciones pasan por cada puerto. Esto te da una perspectiva geográfica inmediata de tu actividad.

#### Próximos zarpes

Una lista ordenada por fecha con las operaciones que zarplan en los próximos días. Cada entrada muestra:
- Referencia ASLI
- Cliente
- Naviera
- Puerto de destino
- Días restantes para el zarpe

#### Alternar vistas

Puedes cambiar entre:
- **En curso** — operaciones activas ahora
- **Histórico** — operaciones cerradas y completadas

---

### Crear una operación (`/reservas/crear`)

Esta es tu acción principal. Cada operación representa un **embarque de exportación** completo.

#### Paso a paso

1. Accede a **Reservas → Crear** o presiona el botón "Nueva Operación".
2. Completa el formulario que está organizado en secciones lógicas:

##### Identificación
- **Referencia ASLI:** identificador único (ej: `ASLI-2026-001`)
- **Correlativo:** número secuencial interno
- **Cliente:** selecciona la empresa exportadora
- **Estado:** por defecto "abierta"

##### Naviera
- **Naviera:** nombre de la línea (Maersk, MSC, etc.)
- **Nave:** nombre del buque
- **Booking:** número de reserva con la naviera
- **POL:** puerto de embarque (origen)
- **POD:** puerto de destino
- **ETD:** fecha estimada de zarpe
- **ETA:** fecha estimada de arribo

##### Carga
- **Especie:** tipo de fruta (uva, pera, arándano, etc.)
- **Variedad:** variedad específica
- **Calibre:** calibre de la fruta
- **Pallets:** cantidad de pallets
- **Peso neto:** peso neto total
- **Peso bruto:** peso bruto total

##### Contenedor
- **Número de contenedor**
- **Sello**
- **Tara**
- **Tipo de unidad** (ej: 40' RF High Cube)

##### Destino
- **Consignatario:** consignee / destinatario final
- **País** de destino
- **Incoterm:** cláusula de venta (FOB, CIF, etc.)
- **Forma de pago**

##### Planta
- **Planta de presentación**
- **Depósito**

##### Temperatura y atmósfera
- **Temperatura** de transporte
- **Ventilación** (%)
- **Tipo de atmósfera** (controles O2, CO2, etc.)

##### Documentos
- **DUS** (Documento Único de Salida)
- **CSG**
- **CSP**
- **URL del documento de booking**

##### Stacking
- **Inicio de stacking**
- **Fin de stacking**
- **Ingreso a stacking**

3. Presiona **Guardar** cuando estés listo.

> Puedes guardar parcialmente y continuar luego. Los campos requeridos están claramente marcados.

---

### Mis reservas (`/reservas/mis-reservas`)

Aquí tienes un **listado completo** de todas tus operaciones, con herramientas para gestionarlas eficientemente.

#### Filtros disponibles

- **Estado:** abierta, cerrada, pendiente, cancelada
- **Cliente:** filtrar por empresa
- **Fechas:** rango de fechas de ingreso
- **Búsqueda libre:** buscar por referencia, naviera, booking, etc.

#### Acciones por operación

Para cada operación en tu lista puedes:

- **Ver detalles** → abre la operación completa
- **Editar** → modifica cualquier dato
- **Enviar al módulo de transporte** → prepara la operación para que el equipo de transporte la gestione
- **Enviar instructivo por email** → genera y envía el IE con PDF adjunto al destinatario
- **Acceder a documentos** → ve y descarga los documentos asociados
- **Eliminar** → la operación pasa a la papelera (solo visible por admin)

---

### Documentos (`/documentos`)

EMBURQUES te permite generar documentos profesionales para tus operaciones.

#### Crear Proforma Invoice (`/documentos/crear-proforma`)

Genera una **Proforma Invoice** profesional y completa.

##### Editor por pestañas

| Pestaña | Qué configuras |
|---------|---------------|
| **Mercadería** | Items: especie, variedad, calibre, cajas, pesos, precios |
| **Partes** | Exportador/Shipper, Consignee, Notify Party |
| **Embarque** | Naviera, nave, booking, POL, POD, ETD, ETA, contenedor, sello, tara |
| **Condiciones** | Incoterm, moneda, forma de pago |
| **Documentos** | DUS, CSG, CSP, guía de despacho, corte documental, observaciones |
| **Etiquetas** | Plantillas y detección automática de etiquetas |

##### Cálculos automáticos

Los cálculos de los ítems se hacen automáticamente:
- `kg neto por caja × cantidad de cajas = kg neto total`
- `kg bruto por caja × cantidad de cajas = kg bruto total`
- Precio por caja o por kilo —el sistema calcula según lo que ingreses
- `valor por caja × cantidad de cajas = valor total`

##### Importar desde Excel externo

Puedes subir un Excel generado por otro sistema. EMBARQUES detecta los campos automáticamente usando nombres tanto en español como en inglés (ej: "EXPORTADOR", "SHIPPER", "CONSIGNEE", "BUYER", "VESSEL", "BOOKING NUMBER", etc.).

##### Plantillas con etiquetas

Puedes usar plantillas predefinidas con etiquetas como `{{ref_asli}}`, `{{cliente}}`, `{{naviera}}`, `{{booking}}`, etc. El sistema reemplaza cada etiqueta con el dato real al generar el documento.

#### Crear Instructivo de Embarque (`/documentos/crear-instructivo`)

Genera el **IE (Instructivo de Embarque)** que se envía al depósito para coordinar el embarque.

El instructivo incluye:
- Datos completos de la operación
- Instrucciones de embarque
- Temperatura y atmósfera requerida
- Información del contenedor

Desde el editor puedes **enviarlo por email** directamente con PDF adjunto.

#### Mis documentos (`/documentos/mis-documentos`)

Accede a tu repositorio de documentos generados. Desde aquí puedes:
- Ver todos tus documentos
- Descargarlos
- Ver fecha de creación y la operación asociada

---

### Transporte (vista de consulta)

Como ejecutivo, tienes **acceso de lectura** a toda la información de transporte. Esto te permite:
- Consultar las reservas ASLI asignadas
- Ver reservas externas
- Revisar facturación de transporte
- Consultar facturas emitidas

Si necesitas realizar acciones en transporte (asignar, facturar), el equipo correspondiente (operador o admin) puede hacerlo. Tú tienes visibilidad completa.

---

### Reportes (`/reportes`)

Consulta estadísticas de tus operaciones y genera informes.

#### Lo que puedes ver

- Operaciones por estado
- Cajas por especie
- Valor FOB por destino
- Totales generales

#### Filtros

- Rango de fechas
- Estado de operación
- Cliente
- Naviera

#### Exportación

Puedes exportar los resultados a **Excel** para análisis o presentación externa.

---

### Finanzas (`/finanzas`)

Consulta el resumen financiero de tus operaciones.

#### Lo que incluye

- Total facturado
- Total margen
- Margen promedio por operación
- Operaciones con facturación
- Resumen por cliente (cliente, facturado, margen, operaciones)
- Estado de cobranza

#### Filtros

- Rango de fechas
- Cliente
- Estado de operación

Puedes exportar a **Excel**.

---

### Registros (`/registros`)

Una vista tipo **hoja de cálculo** de todas tus operaciones, con:
- Todos los campos disponibles en columnas
- Ordenamiento por columnas
- Filtros avanzados
- Exportación a Excel con formato

---

### Itinerario (`/itinerario`)

Consulta los **horarios de líneas navieras** visualizados en un mapa interactivo.

#### Subrutas disponibles

- **Consorcios:** alianzas entre navieras (Maersk/MSC, ONE/Yang Ming, etc.)
- **Servicios:** código de servicio por naviera

---

### Stacking (`/stacking`)

Coordina el **ingreso de contenedores a bodega**. Puedes ver:
- Timeline de contenedores
- Fechas de inicio y fin de stacking
- Estado de ingreso a stacking

---

### El valor de tu rol

Tu trabajo como ejecutivo es el **motor comercial** de ASLI. EMBARQUES te da herramientas para:
- Crear y gestionar operaciones completas
- Generar documentación profesional y exportable
- Tener visibilidad total de tu cartera
- Consultar información de transporte y finanzas

Esto te permite brindar un servicio profesional y ágil a tus clientes sin preocuparte por tareas administrativas que el sistema automatiza o que otros roles del equipo gestionan.

---

## 3. Manual para Superadmin

### Tu rol en EMBARQUES

Como **superadmin**, tienes acceso completo a todos los módulos del sistema, incluyendo la **configuración general**. Eres el responsable de mantener el sistema operativo, configurado y alineado con las necesidades de la organización.

Tu rol es clave para el funcionamiento del ecosistema completo: desde la creación de usuarios hasta la gestión de catálogos, pasando por la facturación y la consulta de todas las operaciones.

---

### Dashboard (`/dashboard`)

Verás los KPIs de **todo el sistema**, sin importar la empresa, el ejecutivo o el cliente:
- Total de operaciones
- Estado de cada operación
- Mapa de todos los puertos de origen y destino
- Próximos zarpes
- Operaciones críticas
- Operaciones sin booking
- Operaciones sin transporte
- Operaciones con factura pendiente

Puedes alternar entre vista "En curso" e "Histórico".

---

### Reservas — Acceso total

Como superadmin, puedes:
- Crear operaciones
- Editar cualquier operación
- Ver todas las operaciones del sistema
- Eliminar y restaurar desde la papelera

---

### Módulo de Transportes — Gestión completa

#### 1. Empresas de transporte

Gestiona las empresas de transporte de ASLI:
- Crear nueva empresa: nombre, RUT
- Editar empresa existente
- Activar / desactivar empresa

#### 2. Choferes

Gestiona los choferes por empresa:
- Nombre
- RUT
- Teléfono
- Empresa vinculada
- Estado: activo / inactivo

#### 3. Equipos

Gestiona camiones y remolques por empresa:
- Empresa vinculada
- Patente del camión
- Patente del remolque
- Estado: activo / inactivo

#### 4. Tramos

Define el tarifario de rutas:
- Origen
- Destino
- Valor
- Moneda (CLP, USD, EUR)
- Estado: activo / inactivo

> Al asignar un tramo a una operación, el valor se carga automáticamente.

#### 5. Costos extra

Catálogo de costos adicionales para la facturación de transporte:
- Concepto (ej: "Falso Flete", "Seguro", "Conexión Reefer")
- Valor de tarifa (numérico, opcional)
- Texto de tarifa (ej: "según cobro", opcional)
- Moneda
- Condición (opcional)
- Estado: activo / inactivo

> Estos costos aparecen como opciones rápidas al generar una factura de transporte.

---

### Reserva ASLI (`/transportes/reserva-asli`)

Aquí se **asigna el transporte** a una operación que ya fue enviada al módulo de transportes.

#### Pasos

1. Selecciona una operación con `enviado_transporte = true`.
2. Elige la **empresa de transporte** → se cargan automáticamente sus choferes y equipos.
3. Selecciona el **chofer** → se autocompleta RUT y teléfono.
4. Selecciona el **equipo** → se autocompleta patentes.
5. Elige el **tramo** → se carga valor y moneda automáticamente.
6. Completa datos de:
   - Contenedor
   - Sello
   - Tara
   - Depósito
   - Fechas de stacking
7. Guarda la asignación.
8. Opcional: **envía Solicitud de Reserva por email** con PDF adjunto.

---

### Reserva externa (`/transportes/reserva-ext`)

Gestiona reservas de transporte externo (cuando el transporte no es de ASLI):
- Crear reserva externa
- Ver historial
- Editar

---

### Facturación de transporte (`/transportes/facturacion`)

Emite la **factura TRA** para una operación con transporte asignado.

#### Pasos

1. Selecciona una operación con transporte asignado.
2. El **número de factura TRA** se genera automáticamente y se reserva inmediatamente (para evitar duplicados). Formato: `TRA0001`, `TRA0042`, etc.
3. El tramo se agrega como ítem base automáticamente.
4. Agrega **costos extra** desde el catálogo:
   - Falso Flete
   - Seguro
   - Conexión Reefer
   - Sello Adicional
   - Otros configurados
5. El **monto total** se calcula automáticamente:
   - CLP: sin decimales (ej: `1.250.000`)
   - USD/EUR: con 2 decimales (ej: `25.400,00`)
6. Exporta a **PDF** o **Excel**.
7. Guarda → se registra en la operación: `numero_factura_asli`, `monto_facturado`, etc.

#### Facturas emitidas (`/transportes/facturas`)

Consulta el historial completo de facturas TRA:
- Filtros por fecha, cliente, etc.
- Totales separados por moneda
- Exportación a Excel

---

### Configuración del sistema

Todas las secciones de configuración están disponibles para ti.

#### 1. Usuarios (`/configuracion/usuarios`)

Gestiona todos los usuarios del sistema:
- **Crear** nuevo usuario (después de que se registra, se crea su perfil aquí)
- **Asignar rol:** superadmin, admin, ejecutivo, operador, cliente
- **Activar / desactivar** usuario
- **Editar** nombre, email, etc.

#### Roles del sistema

| Rol | Enfoque |
|-----|---------|
| **superadmin** | Administrador total — acceso completo + configuración |
| **admin** | Administrador operativo — gestión completa de operaciones, transportes, documentos, facturación |
| **ejecutivo** | Ejecutivo comercial — crea y gestiona operaciones, genera documentos, consulta transporte y finanzas |
| **operador** | Operador logístico — gestiona transporte asignado, edita operaciones |
| **cliente** | Usuario cliente — consulta sus operaciones y documentos |

#### 2. Empresas y clientes

Gestiona las empresas exportadoras del sistema.

#### 3. Asignación de clientes a empresas

Vincula empresas a clientes.

#### 4. Asignación de ejecutivos

Asigna ejecutivos a empresas/clientes.

#### 5. Consignatarios (`/configuracion/consignatarios`)

Master data de consignees y notify parties:
- **General:** nombre, cliente, destino, activo, notas
- **Consignee:** empresa, dirección, contacto, USCC, teléfono, email, código postal
- **Notify Party:** empresa, dirección, contacto, USCC, teléfono, email, código postal

#### 6. Formatos de documentos (`/configuracion/formatos-documentos`)

Define plantillas para la generación automática de documentos:
- **Nombre:** nombre descriptivo
- **Tipo:** tipo de documento (`INSTRUCTIVO_EMBARQUE`, `FACTURA_PROFORMA`, etc.)
- **Tipo de plantilla:** HTML o Excel
- **Contenido HTML:** código HTML con etiquetas `{{...}}`
- **Ruta Excel:** ruta en Storage al archivo .xlsx plantilla (si es Excel)
- **Cliente:** filtro por cliente (null = global, aplica a todos)

**Etiquetas disponibles:** `{{ref_asli}}`, `{{cliente}}`, `{{naviera}}`, `{{booking}}`, `{{contenedor}}`, etc. El sistema las reemplaza con los datos reales al generar el documento.

#### 7. Temporadas (`/configuracion/temporadas`)

Gestiona las temporadas del año para filtrar y agrupar operaciones.

---

### Papelera de operaciones (`/reservas/papelera`)

Accede a las operaciones eliminadas (soft delete). Puedes:
- Ver operaciones eliminadas
- **Restaurar** una operación eliminada
- **Eliminar definitivamente** (hard delete)

---

### Documentos — Gestión completa

Puedes generar todos los tipos de documentos del sistema:
- Proforma Invoice
- Instructivo de Embarque
- Factura Gate Out
- Factura Commercial
- Certificado Fitosanitario
- Certificado de Origen
- BL / Telex / SWB / AWB
- DUS
- Full Set

---

### Reportes — Estadísticas del sistema completo

Consulta estadísticas de todas las operaciones:
- Operaciones por estado
- Cajas por especie
- Valor FOB por destino
- Filtros avanzados
- Exportación a Excel

---

### Finanzas — Visión total del sistema

Consulta el resumen financiero completo:
- Total facturado (todas las operaciones)
- Total margen
- Margen promedio por operación
- Operaciones con facturación
- Resumen por cliente
- Estado de cobranza

#### Campos financieros clave

- `monto_facturado`: total facturado
- `margen_estimado`: margen estimado al crear
- `margen_real`: margen real al cerrar
- `tipo_cambio`: tipo de cambio aplicado
- `fecha_pago_cliente`: fecha de pago del cliente
- `fecha_pago_transporte`: fecha de pago al transporte

---

### Registros — Tabla maestra completa

Acceso a la tabla completa con todos los campos:
- 80+ columnas visibles
- Ordenamiento multinivel
- Filtros avanzados
- Exportación Excel con formato

---

### Tracking (`/tracking`)

Página pública de rastreo. Puedes verificar su funcionamiento y compartirla con quien necesite consultar una referencia.

---

### Itinerario (`/itinerario`)

Gestiona las rutas navieras:
- Navieras
- Naves
- Itinerarios y escalas
- Consorcios navieras
- Servicios únicos por naviera

---

### Stacking (`/stacking`)

Coordina la bodega:
- Timeline de contenedores
- Fechas de stacking
- OCR de documentos (si configurado)

---

### Acciones periódicas del superadmin

1. **Crear perfiles de usuario** cuando nuevos usuarios se registran
2. **Configurar empresas y clientes** cuando llegan nuevos exportadores
3. **Mantener el catálogo de consignatarios** actualizado
4. **Actualizar costos de transporte** (tramos y costos extra) según tarifas vigentes
5. **Gestionar choferes y equipos** de las empresas de transporte
6. **Revisar operaciones críticas** y pendientes
7. **Emitir facturas TRA** pendientes
8. **Exportar reportes** para análisis de gestión

---

### El valor de tu rol

Como superadmin, tienes la **visión completa del sistema** y la capacidad de configurarlo para que todos los demás roles trabajen de manera eficiente. Tu gestión es lo que permite que ejecutivos, operadores y clientes tengan una experiencia fluida y profesional.

---

## 4. Resumen de funcionalidades por rol

Esta tabla muestra las funcionalidades disponibles según cada rol. Cada rol tiene acceso a las secciones que le permiten desempeñar su trabajo de manera completa y profesional.

| Funcionalidad | Cliente | Ejecutivo | Operador | Admin | Superadmin |
|---------------|:-------:|:---------:|:--------:|:-----:|:----------:|
| Inicio / Landing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Login / Registro | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tracking (público) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅* | ✅ | ✅ | ✅ | ✅ |
| Crear operación | — | ✅ | — | ✅ | ✅ |
| Mis reservas | ✅* | ✅ | ✅ | ✅ | ✅ |
| Papelera de operaciones | — | — | — | ✅ | ✅ |
| Ver transportes | — | ✅ (lectura) | ✅ | ✅ | ✅ |
| Reserva ASLI (asignar) | — | — | ✅ | ✅ | ✅ |
| Reserva externa | — | — | ✅ | ✅ | ✅ |
| Facturación de transporte | — | — | — | ✅ | ✅ |
| Facturas emitidas | — | — | — | ✅ | ✅ |
| Crear proforma | — | ✅ | — | ✅ | ✅ |
| Crear instructivo | — | ✅ | — | ✅ | ✅ |
| Mis documentos | ✅* | ✅ | ✅ | ✅ | ✅ |
| Reportes | — | ✅ | ✅ | ✅ | ✅ |
| Finanzas | — | ✅ | ✅ | ✅ | ✅ |
| Registros | — | ✅ | ✅ | ✅ | ✅ |
| Itinerario | — | ✅ | ✅ | ✅ | ✅ |
| Stacking | — | ✅ | ✅ | ✅ | ✅ |
| Configuración: Usuarios | — | — | — | — | ✅ |
| Configuración: Transportes | — | — | — | — | ✅ |
| Configuración: Consignatarios | — | — | — | — | ✅ |
| Configuración: Formatos | — | — | — | — | ✅ |
| Configuración: Temporadas | — | — | — | — | ✅ |
| Asignar clientes-empresas | — | — | — | — | ✅ |
| Asignar ejecutivos | — | — | — | — | ✅ |
| Marketing / Servicios / Sobre nosotros | ✅ | ✅ | ✅ | ✅ | ✅ |

> \* Acceso limitado al scope de la empresa asignada.

---

### Estados de operación

| Estado | Significado |
|--------|-------------|
| **Abierta** | En curso — operación activa |
| **Cerrada** | Completada exitosamente |
| **Pendiente** | Requiere acción o está en espera |
| **Cancelada** | Cancelada |

---

### Menú principal de navegación

Las secciones que aparecen en el menú dependen de tu rol. Estas son todas las secciones disponibles en el sistema:

- **Inicio** (`/inicio`)
- **Dashboard** (`/dashboard`)
- **Reservas** → Crear + Mis reservas + Papelera
- **Transportes** → Reserva ASLI + Reserva Ext + Facturación + Facturas
- **Documentos** → Crear proforma + Crear instructivo + Mis documentos
- **Reportes** (`/reportes`)
- **Finanzas** (`/finanzas`)
- **Registros** (`/registros`)
- **Itinerario** (`/itinerario`)
- **Stacking** (`/stacking`)
- **Configuración** (solo superadmin)

---

> **Documento creado para presentar y guiar el uso de EMBARQUES por parte de cada rol del sistema.**  
> Versión 1.0 — Septiembre 2026
