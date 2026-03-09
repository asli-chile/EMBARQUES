# Documentación Funcional — EMBARQUES

Documento que describe **qué hace** el sistema EMBARQUES: propósito, módulos y capacidades para la empresa **Asesorías y Servicios Logísticos Integrales Ltda. (ASLI)**.

---

## Índice

1. [Propósito del sistema](#propósito-del-sistema)
2. [Usuarios y roles](#usuarios-y-roles)
3. [Módulos y funcionalidades](#módulos-y-funcionalidades)
4. [Flujos principales](#flujos-principales)
5. [Área pública vs. panel interno](#área-pública-vs-panel-interno)

---

## Propósito del sistema

**EMBARQUES** es una aplicación web de gestión logística para ASLI. Permite:

- **Gestionar operaciones** de exportación e importación (embarques marítimos).
- **Registrar reservas** de transporte terrestre vinculadas a operaciones.
- **Facturar** servicios de transporte.
- **Emitir documentos** (instructivos, proformas) para clientes.
- **Hacer seguimiento** de envíos de forma pública (tracking).
- **Administrar** clientes, usuarios, formatos y catálogos.

El sistema trabaja con datos de operaciones marítimas (naviera, nave, puerto origen/destino, ETD/ETA, booking, contenedor) y terrestres (transporte, chofer, patentes, planta, depósito, stacking).

---

## Usuarios y roles

| Rol | Acceso | Descripción |
|-----|--------|-------------|
| **admin** | Completo | Ve todo, crea cuentas de usuario, gestiona configuración (clientes, formatos, usuarios). |
| **ejecutivo** | Operativo completo | Acceso a Dashboard, Registros, Reservas, Transportes, Documentos, Reportes, Finanzas. |
| **operador** | Operativo completo | Igual que ejecutivo. |
| **usuario** | Operativo completo | Igual que ejecutivo. |
| **cliente** | Limitado | Solo ve operaciones de las empresas/clientes asignados por el admin. |

Los roles **admin** y **cliente** requieren configuración previa (asignación de empresas en Configuración → Asignar clientes-empresas).

---

## Módulos y funcionalidades

### Área pública (sin login)

| Página | Qué hace |
|--------|----------|
| **Inicio** | Página principal de la empresa. |
| **Servicios** | Información de los servicios que ofrece ASLI. |
| **Sobre nosotros** | Información de la empresa. |
| **Tracking** | Consulta pública: el visitante ingresa número de contenedor, booking o referencia ASLI y ve el estado de la operación (PENDIENTE, EN_PROCESO, ZARPE, EN_TRANSITO, ARRIBADO, COMPLETADO, CANCELADO) y datos del viaje. |
| **Itinerario** | Información de itinerarios de naves/viajes. |

### Dashboard

Panel principal para usuarios autenticados. Muestra resumen de operaciones y acceso rápido a los módulos.

### Registros

Vista general de **operaciones** (embarques). Cada operación incluye:

- Datos comerciales: cliente, consignatario, incoterm, forma de pago, especie, país, temperatura, ventilación.
- Datos marítimos: naviera, nave, POL, POD, ETD, ETA, booking, contenedor.
- Datos terrestres: planta, depósito, transporte, chofer, patentes, citación, stacking.
- Datos financieros: tramo, porteo, falso flete, facturación, margen.
- Estados: estado de operación, prioridad, operación crítica.

Las operaciones se pueden filtrar, editar y gestionar desde esta vista.

### Reservas

| Submódulo | Qué hace |
|-----------|----------|
| **Crear reserva** | Crear nuevas reservas de transporte vinculadas a operaciones. |
| **Mis reservas** | Listar y gestionar reservas propias. |
| **Papelera** | Recuperar o eliminar reservas borradas. |

### Transportes

| Submódulo | Qué hace |
|-----------|----------|
| **Reserva ASLI** | Gestión de reservas de transporte propias de ASLI: asignar transporte, chofer, patentes, depósito, citación, stacking, tramo, porteo, falso flete. Incluye vista previa para visitantes (sin login) con datos de muestra. |
| **Reserva externa** | Reservas de transporte gestionadas por terceros. |
| **Facturación** | Facturación de servicios de transporte: factura transporte, monto facturado, número factura ASLI, concepto, moneda, tipo de cambio, margen. |

### Documentos

| Submódulo | Qué hace |
|-----------|----------|
| **Mis documentos** | Ver y gestionar documentos generados. |
| **Crear instructivo** | Generar instructivos de despacho para clientes. |
| **Crear proforma** | Generar proformas comerciales. |

### Reportes

Reportes y análisis sobre operaciones y desempeño.

### Finanzas

Gestión financiera: flujos de caja, pagos, cobros, etc.

### Configuración (solo admin)

| Submódulo | Qué hace |
|-----------|----------|
| **Clientes** | Administrar clientes (empresas): términos comerciales, límite de crédito, condición de pago, descuento. |
| **Asignar clientes-empresas** | Vincular usuarios con empresas para control de acceso (rol cliente). |
| **Formatos documentos** | Configurar plantillas de instructivos, proformas, etc. |
| **Usuarios** | Crear y gestionar cuentas de usuario. |

---

## Flujos principales

### 1. Operación completa (embarque)

1. Se crea o importa una **operación** (Registros o seed).
2. Se asigna ejecutivo, cliente, incoterm, especie, país, etc.
3. Se registran datos marítimos: naviera, nave, POL, POD, ETD, ETA, booking, contenedor.
4. Se gestiona el transporte terrestre: reserva en Reserva ASLI, asignación de chofer, patentes, planta, depósito, citación, stacking.
5. Se factura en **Facturación**.
6. Se generan **documentos** (instructivo, proforma) si aplica.
7. El cliente puede hacer **tracking** público con contenedor, booking o ref ASLI.

### 2. Reserva de transporte

1. Usuario crea **reserva** (Reservas → Crear reserva).
2. Se vincula a una operación existente.
3. En Transportes → Reserva ASLI se completa: transporte, chofer, depósito, horarios, tramo, porteo, etc.
4. En Facturación se registran montos y facturas.

### 3. Seguimiento público (tracking)

1. Visitante entra a `/tracking` sin login.
2. Ingresa número de **contenedor**, **booking** o **referencia ASLI**.
3. El sistema consulta operaciones habilitadas para tracking público.
4. Muestra estado y datos del viaje (ETD, ETA, POD, etc.).

---

## Área pública vs. panel interno

| Área | Requiere login | Usuarios |
|------|----------------|----------|
| Inicio, Servicios, Sobre nosotros | No | Cualquiera |
| Tracking, Itinerario | No | Cualquiera (tracking consulta datos habilitados) |
| Dashboard, Registros, Reservas, Transportes, Documentos, Reportes, Finanzas | Sí | admin, ejecutivo, operador, usuario, cliente |
| Configuración | Sí | Solo admin |

---

## Idiomas

El sistema soporta **español (ES)** y **inglés (EN)**. La preferencia se guarda en el navegador y se aplica a la navegación, sidebar, header y tracking.

---

*Documento de referencia funcional. Para detalles técnicos, ver [README.md](../README.md), [ESTRUCTURA.md](ESTRUCTURA.md) y [DATABASE-SCHEMA.md](DATABASE-SCHEMA.md).*
