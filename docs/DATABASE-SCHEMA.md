# Esquema de Base de Datos - EMBARQUES

Este documento contiene la estructura de tablas y columnas de la base de datos en Supabase.

---

## operaciones
> Tabla principal de operaciones/reservas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| correlativo | bigint | Número correlativo |
| ingreso | timestamptz | Fecha de ingreso |
| semana | integer | Semana del año |
| ejecutivo | text | Nombre del ejecutivo |
| estado_operacion | text | Estado de la operación |
| tipo_operacion | text | Tipo de operación |
| cliente | text | Nombre del cliente |
| consignatario | text | Nombre del consignatario |
| incoterm | text | Incoterm |
| forma_pago | text | Forma de pago |
| especie | text | Especie/producto |
| pais | text | País destino |
| temperatura | text | Temperatura |
| ventilacion | text | Ventilación |
| pallets | integer | Cantidad de pallets |
| peso_bruto | numeric | Peso bruto |
| peso_neto | numeric | Peso neto |
| tipo_unidad | text | Tipo de contenedor |
| naviera | text | Nombre naviera |
| nave | text | Nombre nave |
| pol | text | Puerto de origen |
| etd | date | Fecha zarpe |
| pod | text | Puerto de destino |
| eta | date | Fecha arribo |
| tt | integer | Transit time (días) |
| booking | text | Número de booking |
| aga | text | Agencia de aduana |
| dus | text | DUS |
| sps | text | SPS |
| numero_guia_despacho | text | Guía de despacho |
| planta_presentacion | text | Planta de presentación |
| citacion | timestamptz | Fecha/hora citación |
| llegada_planta | timestamptz | Llegada a planta |
| salida_planta | timestamptz | Salida de planta |
| inicio_stacking | timestamptz | Inicio stacking |
| fin_stacking | timestamptz | Fin stacking |
| ingreso_stacking | timestamptz | Ingreso stacking |
| corte_documental | timestamptz | Corte documental |
| inf_late | timestamptz | Info late |
| late_inicio | timestamptz | Late inicio |
| late_fin | timestamptz | Late fin |
| xlate_inicio | timestamptz | XLate inicio |
| xlate_fin | timestamptz | XLate fin |
| deposito | text | Depósito |
| agendamiento_retiro | timestamptz | Agendamiento retiro |
| devolucion_unidad | timestamptz | Devolución unidad |
| transporte | text | Empresa de transporte |
| chofer | text | Nombre chofer |
| rut_chofer | text | RUT chofer |
| telefono_chofer | text | Teléfono chofer |
| patente_camion | text | Patente camión |
| patente_remolque | text | Patente remolque |
| contenedor | text | Número contenedor |
| sello | text | Número sello |
| tara | numeric | Tara |
| almacenamiento | integer | Días almacenamiento |
| tramo | text | Tramo |
| valor_tramo | numeric | Valor tramo |
| porteo | boolean | Tiene porteo |
| valor_porteo | numeric | Valor porteo |
| falso_flete | boolean | Falso flete |
| valor_falso_flete | numeric | Valor falso flete |
| factura_transporte | text | Factura transporte |
| monto_facturado | numeric | Monto facturado |
| numero_factura_asli | text | Número factura ASLI |
| concepto_facturado | text | Concepto facturado |
| moneda | text | Moneda |
| tipo_cambio | numeric | Tipo de cambio |
| margen_estimado | numeric | Margen estimado |
| margen_real | numeric | Margen real |
| fecha_confirmacion_booking | timestamptz | Confirmación booking |
| fecha_envio_documentacion | timestamptz | Envío documentación |
| fecha_entrega_bl | timestamptz | Entrega BL |
| fecha_entrega_factura | timestamptz | Entrega factura |
| fecha_pago_cliente | timestamptz | Pago cliente |
| fecha_pago_transporte | timestamptz | Pago transporte |
| fecha_cierre | timestamptz | Fecha cierre |
| prioridad | text | Prioridad |
| operacion_critica | boolean | Es operación crítica |
| origen_registro | text | Origen del registro |
| observaciones | text | Observaciones |
| ref_asli | text | Referencia ASLI |
| created_by | uuid | Creado por |
| updated_by | uuid | Actualizado por |
| created_at | timestamptz | Fecha creación |
| updated_at | timestamptz | Fecha actualización |
| deleted_at | timestamptz | Fecha eliminación |

---

## ejecutivos
> Ejecutivos de la empresa

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| empresa_id | uuid | FK a empresas |
| nombre | text | Nombre |
| cargo | text | Cargo |
| telefono | text | Teléfono |
| email | text | Email |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

---

## empresas
> Empresas/clientes

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| nombre | text | Nombre empresa |
| cliente_abr | text | Abreviatura |
| created_at | timestamptz | Fecha creación |

---

## usuarios
> Usuarios del sistema

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| empresa_id | uuid | FK a empresas |
| nombre | text | Nombre |
| email | text | Email |
| rol | USER-DEFINED | Rol (ENUM) |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

---

## especies
> Tipos de productos/especies

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| nombre | text | Nombre |
| categoria | text | Categoría |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

---

## navieras
> Líneas navieras

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| nombre | text | Nombre |
| codigo | text | Código |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

---

## naves
> Barcos/naves

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| nombre | text | Nombre |
| imo | text | Código IMO |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

---

## navieras_naves
> Relación navieras-naves

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| naviera_id | uuid | FK a navieras |
| nave_id | uuid | FK a naves |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

---

## plantas
> Plantas de procesamiento

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| nombre | text | Nombre |
| SIGLA | text | Sigla |
| direccion | text | Dirección |
| ciudad | text | Ciudad |
| region | text | Región |
| contacto | text | Contacto |
| telefono | text | Teléfono |
| correo | text | Correo |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

---

## depositos
> Depósitos de contenedores

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| nombre | text | Nombre |
| direccion | text | Dirección |
| ciudad | text | Ciudad |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

---

## destinos
> Puertos de destino (POD)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| nombre | text | Nombre |
| pais | text | País |
| codigo_puerto | text | Código puerto |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

---

## puertos_origen
> Puertos de origen (POL)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| nombre | text | Nombre |
| codigo | text | Código |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

---

## consignatarios
> Consignatarios

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| nombre | text | Nombre |
| cliente | text | Cliente |
| destino | text | Destino |
| consignee_company | text | Empresa consignatario |
| consignee_address | text | Dirección |
| consignee_attn | text | Atención |
| consignee_uscc | text | USCC |
| consignee_mobile | text | Móvil |
| consignee_email | text | Email |
| consignee_zip | text | Código postal |
| notify_company | text | Empresa notify |
| notify_address | text | Dirección notify |
| notify_attn | text | Atención notify |
| notify_uscc | text | USCC notify |
| notify_mobile | text | Móvil notify |
| notify_email | text | Email notify |
| notify_zip | text | ZIP notify |
| activo | boolean | Estado activo |
| notas | text | Notas |
| created_by | uuid | Creado por |
| created_at | timestamptz | Fecha creación |
| updated_at | timestamptz | Fecha actualización |

---

## clientes
> Clientes (relación con empresas)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| empresa_id | uuid | FK a empresas |
| limite_credito | numeric | Límite de crédito |
| condicion_pago | text | Condición de pago |
| descuento | numeric | Descuento |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |
| updated_at | timestamptz | Fecha actualización |

---

## agencias_aduana
> Agencias de aduana

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| nombre | text | Nombre |
| razon_social | text | Razón social |
| rut | text | RUT |
| direccion | text | Dirección |
| ciudad | text | Ciudad |
| contacto | text | Contacto |
| telefono | text | Teléfono |
| correo | text | Correo |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

---

## catalogos
> Catálogos del sistema (listas de valores)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | ID único |
| categoria | text | Categoría |
| valor | text | Valor |
| descripcion | text | Descripción |
| orden | integer | Orden |
| activo | boolean | Estado activo |
| created_at | timestamptz | Fecha creación |

**Categorías disponibles:**
- `estado_operacion`
- `tipo_operacion`
- `incoterm`
- `forma_pago`
- `tipo_unidad`
- `moneda`
- `prioridad`
- `ventilacion`

---

*Última actualización: 2026-02-28*
