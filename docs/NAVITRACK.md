# NaviTrack — Seguimiento marítimo (en desarrollo)

Guía del módulo `/navitrack`: qué es, por qué está separado de `/tracking`, qué
datos tiene de verdad y cómo extenderlo sin romper su carácter.

Complementa a [ESTILOS-VISUALES.md](./ESTILOS-VISUALES.md) (formas y color) y a
[MOTION-DESIGN.md](./MOTION-DESIGN.md) (movimiento). Este documento define el
**criterio** del módulo.

---

## 1. La regla

> **`/tracking` está en producción. NaviTrack se construye al lado, no encima.**

`/tracking` ([TrackingContent.tsx](../src/components/tracking/TrackingContent.tsx))
es el módulo que los usuarios ya usan. NaviTrack es la experiencia nueva y vive
en archivos propios, con ruta propia y acceso propio. **Ningún cambio de
NaviTrack debe tocar `src/components/tracking/`.** Si algo de ahí hace falta, se
copia o se extrae a un módulo compartido — nunca se modifica en el lugar.

La segunda regla, que define el tono del módulo:

> **La tecnología va detrás. La experiencia va delante.**

NaviTrack tiene que poder mostrarse a un cliente externo sin parecer una
herramienta interna. En pantalla no aparecen IDs internos, endpoints, nombres de
tabla, créditos del proveedor AIS ni errores de API. Cuando algo falla, la vista
degrada a lo que sí sabe y lo explica en lenguaje de negocio.

---

## 2. Dónde vive

```
src/components/navitrack/
├── NavitrackContent.tsx     # Shell: carga de datos, AIS, filtros, flota ↔ detalle
├── NavitrackFleet.tsx       # Dashboard de flota: 4 KPI + tabla
├── NavitrackShipment.tsx    # Vista journey de un embarque
├── NavitrackJourney.tsx     # Barra de progreso, timeline y flujo de transbordo
├── NavitrackMap.tsx         # Mapa: ruta recorrida/restante, puertos, buque
├── navitrack-model.ts       # Geodesia, posición y viaje (puro, sin React)
├── navitrack-estado.ts      # Etapa, ETA comparada, alertas y timeline (puro)
├── navitrack-format.ts      # Fechas, distancias y tiempos relativos
└── index.ts

src/styles/navitrack.css     # Piezas visuales propias del módulo
supabase/migrations/20260911000001_navitrack_transbordos.sql
```

La lógica pura vive aparte de los componentes a propósito: las derivaciones
(progreso, etapa, alertas) son criterio de negocio y se pueden razonar y probar
sin montar React.

### Cableado de la ruta

Astro no monta el componente desde la página: la página es un cascarón y el
`AppShell` resuelve por `pathname`. Para tocar la ruta hay **cinco** archivos:

| Archivo | Qué aporta |
|---|---|
| [src/pages/navitrack.astro](../src/pages/navitrack.astro) | La ruta; solo monta `BaseLayout` |
| [AppShell.tsx](../src/components/layout/AppShell.tsx) | `import` lazy + rama `pathname === "/navitrack"` dentro de `ConfigGuard allowAdmin={false}` |
| [site.ts](../src/lib/site.ts) | Ítem de menú con `superadminOnly: true` |
| [routeChrome.ts](../src/lib/ui/routeChrome.ts) | Clasifica `/navitrack` como `dashboard` (fondo oscuro del loader pre-hidratación) |
| [routePrefetch.ts](../src/lib/routePrefetch.ts) | Prefetch del chunk al pasar el mouse por el ítem |

El guard es de cliente, como el resto del ERP. **La barrera real es RLS.** Si
NaviTrack pasa a escribir datos sensibles, hay que validar el rol en el servidor:
los endpoints `/api/shiptracking/*` hoy exigen sesión, pero no superadmin.

---

## 3. Qué datos hay de verdad

Esta es la sección que más ahorra tiempo. El módulo se ve completo, pero está
construido sobre un conjunto de datos acotado.

### Sí existe

De `operaciones` (ver `NAVITRACK_OP_SELECT` en `navitrack-model.ts`):

| Campo | Para qué lo usa NaviTrack |
|---|---|
| `pol`, `pod` | Extremos de la ruta, vía `getPortCoordinates()` |
| `etd`, `eta` | Progreso por calendario y ETA comprometida |
| `nave`, `viaje`, `naviera` | Identidad del buque y cruce con el catálogo |
| `estado_operacion` | Si ya zarpó (`ZARPADA` en adelante) |
| `arribo_confirmado` | Cierra el viaje al 100 % |
| `ingreso_stacking`, `corte_documental`, `fin_stacking` | Hitos reales del timeline |
| `tracking_manual_lat/lng` | Posición cargada a mano cuando no hay AIS |

De `navieras`: `logo_url`, la marca que acompaña al número de contenedor en la
cabecera del embarque.

De `naves`: `imo` y `mmsi`, que es lo que permite resolver el AIS **solo**.

### No existe (y por qué importa)

1. **Port calls intermedios.** El ERP no guarda escalas. Por eso el timeline
   muestra stacking → corte → zarpe → tránsito → arribo, y **no** "Singapur ✓,
   Panamá ✓". El mapa tampoco dibuja puertos de conexión. Cuando aparezca esa
   fuente, `construirTimeline()` ya está hecho para recibir más eventos.
2. **Hora en el ETA.** `operaciones.eta` es columna `date`. La ETA del embarque
   se muestra solo con día; la del AIS, que sí trae hora, se muestra completa.
   **No agregar una hora inventada:** haría que el módulo se lea preciso justo
   donde no lo es. Ver `navitrack-format.ts`, que documenta esta regla.
3. **Buque siguiente en un transbordo.** Se guarda el campo (`nave_siguiente`)
   pero nadie lo llena todavía; la UI muestra "Por confirmar".
4. **Logos de navieras.** El proyecto no trae ninguno y `navieras.logo_url` está
   vacía en las 14 navieras del catálogo. Por eso `NavieraLogo.tsx` dibuja un **monograma**: iniciales sobre un
   color estable derivado del nombre (hash a un tono HSL, evitando la franja
   amarilla que se lee como alerta). Al cargar una URL en el catálogo, la imagen
   reemplaza al monograma sin tocar código; si la URL falla, vuelve al monograma.

---

## 4. Cómo se resuelve la posición

Orden de confianza, en `resolvePosition()`:

```
AIS real  →  coordenada cargada a mano  →  estimación sobre la ruta
```

La estimación interpola el círculo máximo POL→POD según el avance del
calendario. **Siempre se declara su procedencia en pantalla** (`● AIS real` /
`○ Posición estimada`), con tono neutro: transparencia sin generar desconfianza.

### El proveedor y el gasto

El proveedor es **Data Docked** (`x-api-key`, `get-vessel-location?imo_or_mmsi=`).
Vive en [api/navitrack/vessel.ts](../src/pages/api/navitrack/vessel.ts), aparte
de `/api/shiptracking/*`, que sirve a `/tracking` con otro proveedor.

**Cada lectura cuesta un crédito**, así que el orden está invertido: la base
manda y el proveedor es el último recurso.

```
pantalla -> endpoint -> ¿hay lectura fresca en navitrack_ais_lecturas?
                           sí -> se devuelve, 0 créditos
                           no -> ¿la nave está en la lista blanca?
                                 ¿queda cupo diario?
                                 recién ahí se llama al proveedor
```

Tres frenos, todos en el servidor, porque la pantalla no puede decidir gastar:

| Freno | Dónde | Efecto |
|---|---|---|
| `naves.tracking_activo` | catálogo | Si la nave no está marcada, **nunca** se consulta |
| `NAVITRACK_AIS_TTL_MIN` (360) | env | Una lectura vale 6 h; son 4 créditos/día por nave |
| `NAVITRACK_AIS_MAX_DIA` (10) | env | Tope duro diario, red de seguridad ante un bug |

`navitrack_ais_lecturas` guarda **una fila por llamada real**: contar filas es
contar créditos. Como además guarda cada posición con su hora, es el insumo para
dibujar en el futuro la derrota real en vez de la geodésica teórica.

Si el proveedor falla o se acaban los créditos, se devuelve la última lectura
conocida en vez de dejar la pantalla en blanco.

**No hay sondeo automático.** Lo hubo (cada 5 min) y agotaba un plan de pruebas
en menos de una hora. Hoy se consulta al abrir el embarque y al pulsar
Actualizar, y el servidor decide si eso sale de la caché o del proveedor.

```bash
npm run ais:probar -- --activas   # qué se está rastreando (no gasta)
npm run ais:probar -- --gasto     # créditos consumidos    (no gasta)
```

### Por qué el AIS solo se pide en el detalle

Pedirlo para los ~300 embarques de la tabla gastaría el plan sin que nadie mire
ese dato. Entonces:

- **Flota**: sin AIS. Etapa y posición salen de fechas, ruta y coordenada cargada.
- **Detalle**: una llamada al abrir el embarque + refresco cada 5 minutos.
- **Arribados: nunca.** `estaArribado()` corta la consulta antes de hacerla. No es
  solo ahorro: cerrado el viaje, el buque zarpa en otro destino, así que su
  posición AIS ya no describe esta carga y mostrarla sería un dato falso. Por eso
  la vista del embarque cerrado lo dice en vez de dibujar un buque en cualquier
  parte del mundo.

El buque se identifica por **IMO/MMSI del catálogo `naves`**, cruzando por nombre
normalizado (`claveNave()` quita acentos y el viaje pegado: `MSC BRUNELLA 635R` →
`MSC BRUNELLA`). Si el buque no tiene IMO ni MMSI cargado, la vista lo dice y cae
a posición estimada.

Para llenar el catálogo hay tres caminos: a mano en
`/configuracion/naves-tracking` (tiene OCR para leerlos de una captura), o con
`scripts/resolver-naves-imo.mjs`:

```bash
npm run ais:resolver-naves -- --fuente wikidata             # simula, gratis
npm run ais:resolver-naves -- --fuente wikidata --aplicar   # guarda, gratis
npm run ais:resolver-naves -- --fuente datadocked --limite 20 --aplicar  # 1 crédito c/u
```

**Trampa comprobada:** limpiar el sufijo de viaje es peligroso. Un número puro al
final **es parte del nombre** — `WAN HAI 512`, `612`, `613`… son barcos
distintos —, mientras que un sufijo que mezcla letras y dígitos (`635R`, `W012`)
sí es viaje. Una primera versión los fusionó y asignó un mismo IMO a siete
buques. Por eso `nombreBase()` solo recorta sufijos alfanuméricos mixtos, y hay
una lista de nombres de naviera (`WAN HAI`, `MSC`, `TBN`…) que se descartan: si
la limpieza deja solo eso, no es un barco.

Para verificar que no se repitió el error:

```sql
SELECT imo, count(*), string_agg(nombre, ' | ')
  FROM public.naves WHERE imo IS NOT NULL
  GROUP BY imo HAVING count(*) > 1;
```

### La ruta es un círculo máximo, no una recta

Dibujar la ruta como recta en Mercator haría que Asia–Chile cruce continentes. Se
usa círculo máximo, **desenrollando el antimeridiano**: sin eso, una ruta que
pasa de +180 a −180 se dibuja como una línea que cruza el mundo al revés. Ver
`greatCirclePath()`.

---

## 5. Etapas

Definidas en `navitrack-estado.ts`. Cada una tiene un tono, que es el mismo
acento que ya usan los KPI del dashboard — no una paleta nueva.

| Etapa | Tono | Cuándo |
|---|---|---|
| `EN_ORIGEN` | teal | Aún no zarpa |
| `EN_TRANSITO` | emerald | Navegando, ETA lejos |
| `PROXIMO_DESTINO` | amber | Arriba dentro de `PROXIMO_DIAS` (5) |
| `POSIBLE_TRANSBORDO` | orange | Destino AIS ≠ POD, sin resolver |
| `TRANSBORDO_CONFIRMADO` | sky | Alguien confirmó el transbordo |
| `POSIBLE_RETRASO` | rose | ETA AIS ≥ `RETRASO_HORAS` (24) tarde, o ETA ya pasó |
| `ARRIBADO` | teal | `arribo_confirmado` o estado final |

La flota se parte en dos vistas, **En seguimiento** y **Arribados**, porque son
listas distintas y no dos filtros de la misma: una es operación y la otra es
historia. Los cuatro KPI describen lo que está en curso, así que no se muestran
sobre los arribados, y cambiar de vista limpia el filtro activo.

Los umbrales son constantes exportadas (`RETRASO_HORAS`, `PROXIMO_DIAS`,
`POSICION_ANTIGUA_HORAS`). Cambiarlos es cambiar criterio de negocio: hacerlo ahí
y en un solo lugar.

**El rojo no es automático.** Una diferencia de ETA menor a 6 h es ruido del
propio AIS y se muestra como "En fecha"; entre 6 y 24 h es leve (ámbar); sobre
24 h es alta (rosa). Ver `compararEta()`.

---

## 6. Transbordo

La detección compara el destino que declara el AIS con el POD comprometido
(`destinoAisDiscrepa()`). **Es una señal, no un hecho**: los capitanes escriben
el destino a mano y abundan las abreviaturas (`CLSAI`, `CL SAI`, `SAN ANTONIO`).
Por eso siempre se presenta como "posible" y la resuelve una persona.

La decisión se guarda en `navitrack_transbordos` (una fila por operación).

> `supabase/migrations/20260911000001_navitrack_transbordos.sql` — **aplicada el
> 11-09-2026** en BDASLI. El código igual tolera que la tabla no exista (ignora el
> error de lectura), por si se levanta otro entorno sin ella.

### El viaje con transbordo: `navitrack_tramos`

Confirmar un transbordo no es solo marcar una casilla: el viaje pasa a tener dos
buques. `operaciones` no puede expresar eso (guarda un `nave` y un `viaje`), y no
se toca porque la usan todos los módulos.

`navitrack_tramos` guarda la cadena. La regla de lectura es corta:

```
sin filas  -> viaje directo, vale lo que dice `operaciones`
con filas  -> el viaje son estos tramos, en orden (`orden` 1, 2, …)
```

El `pod` del tramo 1 es el **puerto de conexión**. `origen` dice de dónde salió
el tramo (`erp` copiado de la operación, `ais` deducido de la señal, `manual`
cargado por una persona) y `confirmado` distingue lo que ya ocurrió de lo que
todavía es previsión.

> `supabase/migrations/20260912000002_navitrack_tramos.sql` — **aplicada el
> 12-09-2026**. Agrega además `navitrack_transbordos.tramo_id`, para enlazar la
> alerta con el tramo que la resolvió.
>
> **Pendiente:** la tabla existe pero ninguna pantalla la lee ni la escribe. El
> flujo de confirmar transbordo debería crear el tramo 1 copiando la operación y
> el tramo 2 con el buque siguiente.

### El chequeo diario

`src/pages/api/navitrack/chequeo-diario.ts` corre una vez al día por cron de
Vercel (`0 12 * * *`, 08:00 en Chile). Es el uso más barato del proveedor:
**una** llamada a `get-vessel-location` por nave con `tracking_activo`, o sea
1 crédito por nave y por día.

Cuando el destino declarado no calza con el POD, avisa por correo. Tres cosas lo
callan a propósito:

1. una decisión previa en `navitrack_transbordos` (ya lo resolvió una persona);
2. un aviso ya enviado con **ese mismo** destino en `navitrack_avisos`;
3. la operación marcada como arribada.

El correo sale por la Edge Function `send-email`, que acepta una vía de cron con
`x-cron-secret` y envía desde el buzón corporativo. El endpoint se protege con
`NAVITRACK_CRON_SECRET` (≥16 caracteres): sin él devuelve 403, porque cualquiera
que lo llamara gastaría créditos ajenos.

---

## 7. Jerarquía de la información

El orden no es decorativo; es el orden en que un operador necesita las respuestas:

```
1. Estado          ¿en qué etapa está?
2. Ubicación       ¿dónde está?
3. ETA             ¿cuándo llega?
4. Ruta / progreso ¿cuánto falta?
5. Incidencias     ¿hay algún problema?
6. Timeline        ¿qué pasó hasta ahora?
7. Datos del buque ¿con qué está viajando?
8. Técnico         solo si alguien lo busca
```

Al agregar algo nuevo, ubicarlo en esa escala antes de elegir dónde ponerlo. Si
no cabe en 1–7, probablemente pertenece a administración o debug, no a esta
pantalla.

### Densidad

Ni dashboard vacío ni 30 métricas. Los cuatro KPI de la flota son el filtro real
de la tabla (click alterna), no adorno: por eso no hay además un control
segmentado que haga lo mismo. **Antes de sumar un control, revisar si otro ya
cubre esa intención.**

---

## 8. La pizarra del embarque

El detalle es una **pizarra de una sola pantalla**: en `lg` y superiores no hay
scroll de página. El alto se reparte con flex y `min-h-0`:

```
barra superior      shrink-0
encabezado          shrink-0   identidad + etapa + avance + ruta/ETA
bloque central      flex-1     [ mapa con pestañas | ETA + historia ]
franja indicadores  shrink-0   5 tarjetas
nota de procedencia shrink-0
```

Reglas para no romperlo:

- **Todo lo que se agregue arriba o abajo va `shrink-0`**; lo que debe absorber
  el alto sobrante va `flex-1 min-h-0`. Sin `min-h-0` un hijo flex nunca se
  encoge por debajo de su contenido y reaparece el scroll de página.
- **Solo la historia del viaje scrollea por dentro**, porque es la única lista de
  largo variable. Si una sección nueva puede crecer, va dentro de una pestaña o
  con su propio `overflow-y-auto`, nunca empujando la página.
- **Bajo `lg` la pizarra no cabe** y la vista vuelve a ser una columna con
  scroll (`lg:overflow-hidden` en la raíz). Forzar la pizarra en un teléfono
  produciría texto ilegible; esto es deliberado.
- El panel izquierdo tiene pestañas (**Vista de ruta**, **Información del
  buque**, y **Transbordo** solo cuando hay algo que resolver). Las pestañas son
  el lugar donde va lo que no cabe: sumar una sección nueva ahí no le quita alto
  a nada.

---

## 9. Cómo extenderlo

**Agregar un evento al timeline** → `construirTimeline()` en
`navitrack-estado.ts`. Cada evento declara `certeza` (`REAL` / `CONFIRMADO` /
`ESTIMADO`); si el dato es una fecha programada que aún no ocurrió, es
`ESTIMADO`. Sumar su ícono en `EVENTO_ICON` y su clave en `EVENTO_LABEL`
(`NavitrackJourney.tsx`), y el texto en **ambos** idiomas.

**Agregar una alerta** → `construirAlertas()`, más entradas en `ALERTA_TITULO`,
`ALERTA_DETALLE` y `ALERTA_ICON` (`NavitrackShipment.tsx`). La severidad elige el
tono: `info` → teal, `atencion` → ámbar, `critica` → rosa.

**Agregar una etapa** → `NavitrackEtapa` + `ETAPA_META` + la rama en
`resolverEstado()` + `ETAPA_LABEL_KEY` en `NavitrackShipment.tsx` + el tono en
`navitrack.css` si es uno nuevo.

**Agregar una columna a la tabla de flota** → el encabezado sale de un array en
`NavitrackFleet.tsx`; hay que agregar la clave ahí, la celda en el `<tbody>` y el
dato en la tarjeta móvil, que es una vista distinta y no se actualiza sola.

**Textos** → todo pasa por `t.navitrack` en
[translations.ts](../src/lib/i18n/translations.ts), en `es` **y** `en`. Ningún
texto se escribe suelto en el JSX.

### Trampa conocida de CSS

`.navitrack` va en el **mismo** elemento que `.dash-neon.tracking-brand`. Por eso
los overrides de tema claro se escriben **sin espacio**:

```css
/* correcto */
.dash-neon[data-theme="light"].navitrack .nt-tone--amber { … }

/* nunca coincide: exigiría que .navitrack fuera descendiente */
.dash-neon[data-theme="light"] .navitrack .nt-tone--amber { … }
```

---

## 10. Verificación

```bash
npx tsc --noEmit -p tsconfig.json   # el módulo debe salir limpio
npm run build                        # compila mapa, CSS y chunks
npm run dev                          # /navitrack, con usuario superadmin
```

La lógica geográfica no se puede revisar a ojo. Al tocar `navitrack-model.ts`,
comprobar al menos: distancia Shanghái–San Antonio ≈ 18.700 km; la polilínea de
esa ruta no debe tener saltos de longitud mayores a ~20° entre puntos
consecutivos (si aparece un salto de 360°, se rompió el desenrollado del
antimeridiano); y el punto medio de la ruta debe dar `routeFraction()` ≈ 0,5.
