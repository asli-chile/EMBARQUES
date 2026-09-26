# NaviTrack — Seguimiento de embarques

Guía del módulo `/navitrack`: qué es, qué datos tiene de verdad y cómo
extenderlo sin romper su carácter.

**En pantalla se llama "Seguimiento de embarques"**, para todos los roles.
`NaviTrack` quedó como nombre interno: la ruta, las tablas `navitrack_*`, los
archivos y esta guía. Renombrar eso costaría migraciones y memoria del equipo a
cambio de nada que el usuario note.

Complementa a [ESTILOS-VISUALES.md](./ESTILOS-VISUALES.md) (formas y color) y a
[MOTION-DESIGN.md](./MOTION-DESIGN.md) (movimiento). Este documento define el
**criterio** del módulo.

---

## 1. La regla

> **NaviTrack es el módulo de seguimiento. Ya no hay otro.**

Se construyó al lado de `/tracking` para no arriesgar lo que estaba en
producción, y el **13-09-2026** lo reemplazó: `src/components/tracking/` y
`/api/shiptracking/*` se eliminaron, y `/tracking` quedó como una redirección a
`/navitrack`. Lo único que se rescató de ahí es la carga manual de posición,
hoy [NavitrackCoordsManual.tsx](../src/components/navitrack/NavitrackCoordsManual.tsx).

Tres consecuencias que conviene tener presentes:

- **El seguimiento dejó de ser público.** `/tracking` se podía abrir sin
  sesión; NaviTrack no, porque todo lo que muestra sale de `operaciones` vía
  RLS. Fue una decisión, no un efecto secundario.
- **Lo usa toda la empresa**, no solo el superadmin. Ver §6 bis.
- **Se perdió la búsqueda libre de buques por nombre.** El módulo viejo dejaba
  consultar cualquier nombre contra el proveedor; NaviTrack resuelve el buque
  por IMO/MMSI del catálogo `naves`, que es más confiable y más barato. El
  Panel de Rastreo **no** la reemplaza: su botón de buscar IMO opera sobre una
  nave que ya está en el catálogo. Para consultar un buque que no está ahí, hoy
  hay que darlo de alta primero.

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
├── NavitrackCoordsManual.tsx # Posición a mano, heredada del módulo anterior
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
| `arribo_at`, `arribo_anunciado_at` | Cuándo llegó y para cuándo se anunció |
| `ingreso_stacking`, `corte_documental`, `fin_stacking` | Hitos reales del timeline |
| `tracking_manual_lat/lng` | Posición cargada a mano cuando no hay AIS |

De `navieras`: `logo_url`, la marca que acompaña al número de contenedor en la
cabecera del embarque.

De `naves`: `imo` y `mmsi`, que es lo que permite resolver el AIS **solo**.

### No existe (y por qué importa)

1. **La hora de cada escala.** Desde el 15-09-2026 sí se guardan los port calls
   intermedios (ver "El recorrido real" más abajo), pero solo el **hecho**: que
   el buque paró ahí. Cuándo atracó y cuándo zarpó no se saben, así que la
   escala se muestra **sin fecha**. El `atdUtc` del proveedor parece el zarpe de
   ese puerto y no lo es: en la serie guardada, 6 de 7 naves cambiaron de
   `lastPort` más veces de las que cambió su `atdUtc`, y el CMA CGM CARL ANTOINE
   declaró Posorja y luego Caucedo con el mismo 06-SEP. Se guarda en
   `zarpe_at` por si algún día se entiende, pero **no se muestra**.
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

### El recorrido real del buque

El AIS informa **dos** puertos en cada lectura y durante un tiempo se usó solo
uno: `destination`, el que el buque anuncia. `lastPort`, el que acaba de dejar,
se descartaba dentro del JSON crudo. La pantalla quedaba con un historial que
solo hablaba del futuro: "Rotterdam, por verificar" y, del Caribe por donde ya
había pasado el embarque, nada.

Son dos ejes y conviene no mezclarlos:

| | Qué dice | Dónde vive |
|---|---|---|
| `estado` | Qué es ese puerto para la **carga**: `transbordo`, `parada_programada`, o sin itinerario todavía (`anunciada`, `recalada`) | Lo decide el itinerario del embarque (ver "Recaladas y transbordos") |
| `recalado_at` | Qué hizo el **buque**: consta que paró aquí | Hecho del AIS |

Del AIS salen dos hechos por puerto, y se guardan una sola vez:

- **Llegada** (`recalado_at`): el proveedor no la informa. `buscarLlegada()` la
  aproxima con la primera lectura ya guardada que vio al buque detenido
  (`moored`, `anchor`, `berth`) con ese puerto como destino, **antes del
  zarpe**. Sin ninguna así —el buque pudo estar ahí un rato demasiado corto
  para que el chequeo diario lo alcanzara a ver—, se usa el propio zarpe como
  cota: nunca se afirma una llegada posterior a la salida.

  No siempre es "hoy": si el seguimiento de un embarque empieza después de que
  el buque ya zarpó de un puerto (transbordo cargado tarde, o embarque que
  entró recién a la ventana), la primera lectura que **el chequeo diario**
  procesa para ese puerto puede ser de varios días después del zarpe real. Ahí
  es donde entra la búsqueda hacia atrás: sin ella, la llegada quedaba fechada
  con "cuándo nos enteramos" y podía caer después del zarpe. Ocurrió en once
  filas —el MSC BRUNELLA zarpó de Colón el 13-sept a las 04:07 y el sistema
  anotó su llegada el 17—, corregidas con
  `npm run navitrack:llegadas -- --aplicar`.
- **Zarpe** (`zarpe_at`): `atdUtc`, que viene junto a `lastPort` y es exacto.

Tres reglas que no conviene tocar sin entender el costo:

- **Se anota siempre, también en un viaje directo.** Directo significa "no hay
  transbordo", no "no lo cuentes": el cliente igual necesita saber por dónde
  pasó su carga.
- **El cliente las ve.** Es la única excepción a que solo vea lo decidido: una
  recalada es un hecho, no una averiguación interna en curso.
- **Hay que persistirlas.** El AIS solo informa la última parada: sin guardarla,
  cada puerto desaparece del historial en cuanto el buque toca el siguiente. Lo
  hace el chequeo diario, con la lectura ya pagada, sin créditos extra.

Para reconstruir lo anterior a esto desde las lecturas ya guardadas:

```bash
npm run navitrack:recaladas             # simulacro, no escribe
npm run navitrack:recaladas -- --aplicar
```

Está en TypeScript para importar `mismoPuerto()` del propio ERP. La primera
versión era `.mjs` con su propia regla de comparación y anotó "Buenaventura" y
"Buenaventura anch" como dos puertos: exactamente el bug que venía a arreglar.

### Un solo criterio de "mismo puerto"

`mismoPuerto()` (en `navitrack-model.ts`) es la única regla: texto normalizado
y, si eso no basta, la coordenada del catálogo, con 30 km de holgura. El AIS
reescribe el destino a medida que el buque se acerca —"Rotterdam Netherlands"
pasó a "Rotterdam anch Netherlands"— y comparando texto exacto eso son dos
puertos: se anotaban dos recaladas, se pedían dos verificaciones y el mapa
clavaba dos marcadores en el mismo punto.

### El proveedor y el gasto

El proveedor es **Data Docked** (`x-api-key`, `get-vessel-location?imo_or_mmsi=`).
Vive en [api/navitrack/vessel.ts](../src/pages/api/navitrack/vessel.ts), aparte
de `/api/shiptracking/*`, que sirve a `/tracking` con otro proveedor.

**Cada lectura cuesta un crédito**, así que el orden está invertido: la base
manda y el proveedor es el último recurso.

**Navegar no gasta.** Quien paga es el chequeo diario; la pantalla solo lee lo
que él dejó guardado, las veces que haga falta.

```
pantalla  -> endpoint -> devuelve la última fila de navitrack_ais_lecturas
                         siempre, 0 créditos

cron      -> proveedor -> 1 crédito por nave con tracking_activo, y guarda la fila
forzar=1  -> proveedor -> acto deliberado de quien puede gastar
```

Hasta el 16-09-2026 el endpoint decidía por antigüedad: pasado el TTL, abrir un
embarque llamaba al proveedor. Como el cron corre una vez al día, a las seis
horas de esa corrida cualquier apertura empezaba a pagar, y el gasto quedaba
atado a cuánta gente mirara la pantalla —lo más difícil de prever y lo que menos
debería costar—. Se iban dos o tres créditos diarios así.

Los frenos, todos en el servidor, porque la pantalla no puede decidir gastar:

| Freno | Dónde | Efecto |
|---|---|---|
| `naves.tracking_activo` | catálogo | Si la nave no está marcada, **nunca** se consulta |
| `NAVITRACK_AIS_MAX_DIA` (10) | env | Tope duro diario, red de seguridad ante un bug |
| `NAVITRACK_AIS_TTL_MIN` (360) | env | Ya no dispara gasto: solo sirve para decir cuánto falta para la próxima lectura del cron |

`navitrack_ais_lecturas` guarda **una fila por llamada real**: contar filas es
contar créditos. Como además guarda cada posición con su hora, es el insumo para
dibujar en el futuro la derrota real en vez de la geodésica teórica.

Si el proveedor falla o se acaban los créditos, se devuelve la última lectura
conocida en vez de dejar la pantalla en blanco.

**No hay sondeo automático.** Lo hubo (cada 5 min) y agotaba un plan de pruebas
en menos de una hora. Hoy el proveedor se consulta una vez al día desde el cron,
y a mano desde el panel de rastreo, que avisa el costo antes.

```bash
npm run ais:probar -- --activas   # qué se está rastreando (no gasta)
npm run ais:probar -- --gasto     # créditos consumidos    (no gasta)
```

### Por qué el AIS solo se pide en el detalle

Pedirlo para los ~300 embarques de la tabla gastaría el plan sin que nadie mire
ese dato. Entonces:

- **Flota**: sin AIS. Etapa y posición salen de fechas, ruta y coordenada cargada.
- **Detalle**: lee la base. Abrirlo cuantas veces se quiera no cuesta nada.
- **Arribados: nunca.** `estaArribado()` corta la consulta antes de hacerla. No es
  solo ahorro: cerrado el viaje, el buque zarpa en otro destino, así que su
  posición AIS ya no describe esta carga y mostrarla sería un dato falso. Por eso
  la vista del embarque cerrado lo dice en vez de dibujar un buque en cualquier
  parte del mundo.
- **Antes del zarpe: tampoco.** Misma razón, vista del otro lado: el buque que
  vendrá a buscar la carga está haciendo un viaje ajeno. Lo corta `yaZarpo()`
  (en `navitrack-model.ts`, que es de donde lo leen también la etapa y el
  progreso). Mientras la carga no sale, el avance es **0 %** y la posición es el
  puerto de origen: con la posición del buque, un contenedor que todavía
  esperaba en San Antonio mostraba "30 % del trayecto" y el barco a mitad del
  Pacífico.

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
| `PROXIMO_DESTINO` | amber | Arriba dentro de `PROXIMO_DIAS` (1): hoy o mañana |
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
Vercel (`0 10 * * *`, **07:00 en Chile** en horario de verano; en invierno,
06:00). Es el uso más barato del proveedor: **una** llamada a
`get-vessel-location` por nave, o sea 1 crédito por nave y por día.

No por cada nave con `tracking_activo`, sino por las que **llevan carga
navegando**. Lo decide `enVentanaDeSeguimiento`, y la ventana tiene una apertura
y tres cierres.

**Abre con el zarpe**, pegada al ETD. Antes abría dos días antes, por si el
zarpe se adelantaba; se quitó el 21-09-2026 porque costaba dos créditos en cada
viaje que empezaba para cubrir un adelanto que, cuando ocurre, solo atrasa un
día el inicio del seguimiento. Antes del zarpe el buque hace otro viaje: esa
posición mide un embarque ajeno y `resolvePosition` la ignora, así que se pagaba
por un dato que después no se puede mostrar.

**Cierra por tres niveles**, en orden de confiabilidad. Manda el primero que se
cumpla:

| Nivel | Quién lo afirma | Cómo |
|-------|-----------------|------|
| 1 | Una persona | La operación pasó a un estado final (`esFinal`) o se marcó `arribo_confirmado` |
| 2 | El AIS | `llegoAlPod()`: el buque está quieto en el POD, o el POD ya figura como su `lastPort` |
| 3 | El calendario | Pasaron `GRACIA_POST_ETA_DIAS` (2) desde la ETA prometida |

El nivel 2 sale de la lectura que **ya se pagó**: no cuesta un crédito extra. La
comparación de nombres la hace `mismoPuerto()`, que resuelve "HAMBURGO" contra
"Hamburg Germany" y, si los textos no calzan, cae a la distancia entre
coordenadas. Está verificado contra los seis POD en uso (Hamburgo, Génova,
Leixões, Fos-sur-Mer, Seattle, San Antonio).

Una nave con varias operaciones se sigue hasta que **todas** cierren. No es un
detalle: MSC BRUNELLA descarga en Génova, Fos-sur-Mer y Leixões en un mismo
viaje, y soltar la nave en el primer POD dejaría dos embarques a ciegas.

**De un transbordo se sigue solo el tramo vigente.** Antes se sumaban todas las
naves de la cadena más `operaciones.nave`, así que A00051 pagaba dos buques por
la misma caja: MSC SERENA, que la entregó en Rodman el 18-09-2026 y siguió a
Thames con otra carga, y MSC BOSTON, que la recibió. `sincronizarSeguimiento`
apagaba a la que entregó y la ventana la volvía a encender en la misma corrida.
Cuál es el tramo vigente lo deciden las dos con el mismo criterio,
`crearTramoCerrado()` en `ventana.ts` —consta la recalada en su POD, o pasaron
`GRACIA_POST_ETA_DIAS` desde la llegada anunciada—; si difirieran, una apagaría
la nave que la otra paga. La gracia existe porque la fecha es la de la naviera:
cortando en ella se dejaba de leer al buque justo antes de llegar al
transbordo, y se perdían la llegada y el zarpe reales.

**Lo que declara el AIS se atribuye a la nave vigente de cada carga**, no a
`operaciones.nave`. Con la columna, los puertos de la nave que recibe la carga
no se anotaban nunca, y los de la que ya la soltó sí: en A00051, MSC SERENA dejó
la carga en Rodman y su paso por Cristóbal y Thames quedó en el historial como
si la caja hubiera ido a Inglaterra. La ventana expone `vigentePorOp` y el
chequeo diario consulta por esos ids. Si el tramo vigente no tiene nave —la
carga llegó a un transbordo que se cargó solo con el puerto—, no se le atribuye
nada a nadie hasta que alguien indique la nave.

Esa misma función tampoco soltaba la nave cuando la operación estaba cerrada:
miraba solo `arribo_confirmado`, que casi nadie marca. MSC SERENA arrastraba
cuatro operaciones en `OPERACION_CERRADA` desde julio y quedaba retenida por
ellas. Ahora usa `esFinal`, igual que la ventana.

**El nivel 3 es un freno de emergencia, no el criterio.** La ETA es la promesa
que la naviera hizo semanas antes de zarpar, y se mueve mucho: en diez días de
observación los buques corrieron su *propia* ETA declarada entre 0,8 y 17,2 días
—MSC SERENA la revisó ocho veces—. Cortar en la promesa deja de seguir justo al
buque que se atrasó, que es cuando más falta hace: el CMA CGM CARL ANTOINE iba a
+1,3 días de la suya cuando entraba al Elba. Si el nivel 2 funciona, al 3 no se
llega nunca; cuando se llega, es señal de que la señal de llegada no apareció.

Los dos días no salen de una medición, porque no hay con qué medir: al
21-09-2026 existía **una sola** operación con arribo real registrado en toda la
base (A00042, llegó a +1 día de lo prometido). Cuando haya historial de arribos,
el número se puede calibrar en serio — ver `docs/IDEAS-PENDIENTES.md`.

**Sin ETA no hay nivel 3.** Ese embarque queda dependiendo de que alguien lo
cierre o de que el AIS vea la llegada. Es un hueco deliberado: dejar de seguir
una carga que zarpó de verdad, solo porque nadie cargó su ETA, es peor que el
crédito que cuesta. El chequeo los nombra en el reporte (`enVentanaSinEta`) para
que el hueco se vea en vez de costar en silencio.

Las naves saltadas se nombran en el reporte ("Todavía sin zarpar") y quedan en
`navitrack_corridas.detalle`: una nave que desaparece del correo sin explicación
se lee como que falló.

La actualización manual (`/api/navitrack/actualizar`) ya lo hacía bien: su
`planificar()` solo apunta a las naves cuya carga zarpó.

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

## Recaladas y transbordos: lo anunciado y lo que pasó

El AIS declara el **próximo puerto**, no el destino final: un buque de
Valparaíso a Leixões anuncia Callao, Balboa, Rotterdam, Amberes… Cuál de ellos
es un transbordo no lo puede decir el dato, pero la naviera sí, y lo dice al
confirmar la reserva. Por eso **se pregunta una vez por embarque, no una vez
por puerto** (desde el 25-09-2026; antes cada puerto quedaba "por verificar" el
día de su llegada y alguien tenía que elegir entre cuatro opciones).

El **itinerario** se carga en la ventana `NavitrackItinerario.tsx` y lo guarda
`POST /api/navitrack/itinerario`:

| Modo | Qué se carga | Qué pasa con los puertos del AIS |
|---|---|---|
| Directo | Nada más | Todos son `parada_programada` |
| Con transbordo | Uno o más transbordos, en orden. Por cada uno: **puerto** (obligatorio), nave que recibe la carga, llegada y zarpe anunciados con hora UTC opcional | El que coincide con un transbordo es `transbordo`; **todos los demás**, antes o después, son `parada_programada` |
| Sin indicar | — | Se anotan sin decidir (`anunciada` / `recalada`). La ficha y el reporte diario piden el itinerario, una sola vez |

Cómo se guarda: el modo en `navitrack_viajes` y los transbordos como la cadena
de `navitrack_tramos` (N transbordos = N + 1 tramos; el primero sale de la
operación). Guardar **reescribe la cadena entera**, así que editar un puerto o
una nave es tan simple como la primera carga. Lo ocurrido no se toca: vive en
`navitrack_recaladas`. La regla de clasificación está en un solo lugar,
`estadoSegunItinerario()` de `src/lib/navitrack/itinerario.ts`, y la usan el
chequeo diario y el endpoint. Una cadena de tramos sin fila en
`navitrack_viajes` cuenta como "con transbordo" (así quedó A00042).

Muchas navieras informan el transbordo **solo con el puerto** ("transbordo en
Rodman"). Se carga así, y cuando el buque llega a ese puerto —según el AIS, o
porque pasó la fecha anunciada— la ficha pide la nave ("Falta la nave en
Rodman") y el reporte diario la lista hasta que alguien la indique
(`transbordosSinNave()`). Es lo único que el sistema pide completar.

Las naves nuevas se agregan al catálogo **apagadas y sin gastar**: el
seguimiento pasa a cada una el día en que su tramo se vuelve el vigente, y lo
hace `sincronizarSeguimiento`, que también le busca el IMO si le falta.

`authenticated` no tiene `DELETE` sobre `navitrack_recaladas`, y está bien:
desde el navegador nadie borra historia. Cuando un puerto deja de ser transbordo
y el buque nunca pasó por él, el endpoint lo retira con la clave de servicio,
acotado a filas que ya leyó con la sesión del usuario.

**Los extremos del viaje no son recaladas.** Ni el POL ni el POD son escalas:
en el origen el buque todavía está cargando, y el destino es donde la carga
termina. La comparación la hace `mismoPuerto`, no un cotejo de texto: el AIS
escribe "Hamburg Germany" donde el ERP dice "HAMBURGO". Durante un tiempo la
función que anota lo anunciado descartaba solo el destino, y con un cotejo de
texto que tampoco reconocía esos dos nombres; el A00052 quedó pidiendo que
alguien decidiera si la carga cambiaba de barco en el puerto del que aún no
había salido.

### La hora del transbordo

`navitrack_tramos` guarda el día en `etd`/`eta` y la hora en `etd_hora`/
`eta_hora`, **en UTC**, que es como la anuncia la naviera.

Van en columnas separadas porque la hora es opcional: a veces dan día y hora, a
veces solo el día. Con un `timestamptz` único no habría forma de distinguir "el
20 a las 00:00" de "el 20, hora desconocida", el formulario obligaría a poner
una hora para poder guardar, y ese "12:00" de relleno ensucia justo la
comparación que estas columnas existen para permitir.

**Lo anunciado no se pisa nunca.** Es una estimación que casi nunca se cumple
—el atraque depende del clima y de que haya sitio en el puerto, así que un buque
anunciado en Italia el 20 a las 14:00 puede entrar el 19 o el 21— y su valor
está justamente en ser la promesa contra la que se mide. La llegada real la deja
el AIS solo, en `navitrack_recaladas.recalado_at`, sin gastar créditos.

`desvioAnuncio()` calcula la diferencia, y **la precisión sigue al dato**: con
hora anunciada responde en horas; sin ella, en días. Decir "+13 h" contra un
anuncio que solo dijo "el 20" sería inventar una precisión que no existe.

## 6 bis. Quién entra, y con cuánto poder

Tres permisos independientes, porque no son el mismo eje. Se resuelven en
`NavitrackContent.tsx` y se llaman igual en todo el módulo:

| | `puedeVer` | `puedeDecidir` | `puedeGastar` |
|---|---|---|---|
| superadmin | todos | sí | **sí** |
| admin | todos | sí | no |
| ejecutivo | los de sus empresas | sí, sobre lo suyo | no |
| operador | todos | no | no |
| cliente | los de sus empresas | no | no |

- **`puedeVer`** no decide qué embarques se ven: eso lo hace RLS sobre
  `operaciones`. La pantalla solo dibuja lo que la base devolvió, **con una
  excepción**: "ver como" cambia el perfil efectivo en el navegador pero no la
  sesión contra Supabase, así que la base sigue respondiendo como superadmin.
  Por eso la consulta se acota además por `empresaNombres` cuando el rol
  efectivo es cliente o ejecutivo (`empresasAcotadas` en `NavitrackContent`).
  Sin eso, un superadmin mirando "como cliente" veía los embarques de todos.
- **`puedeDecidir`** es cargar o editar el itinerario (directo o transbordo) y
  marcar el arribo. Es una afirmación de ASLI sobre el viaje.
- **`puedeGastar`** es consultar al proveedor AIS. Cada llamada es un crédito y
  el plan es uno para toda la empresa: quién lo gasta es una decisión, no un
  permiso más. Por eso un ejecutivo decide sobre el viaje pero no consulta, y
  su posición sale de la última lectura guardada.

Cuando alguien carga un transbordo hacia una nave sin IMO, el endpoint **guarda
igual** y la nave queda sin identificador hasta que el chequeo diario la busque
(o hasta que se escriba el IMO en la misma ventana, que lo pide solo en ese
caso). La respuesta lo dice, para que no sorprenda una posición estimada.

### Además, el cliente ve menos

`modo` (`NavitrackVista`: `"interna" | "cliente"`) no es permiso sino criterio
de contenido, y viaja hasta `navitrack-estado.ts` para que etapa, alerta y color
no puedan contradecirse.

| | Personal | Cliente |
|---|---|---|
| Sospecha de transbordo (solo sin itinerario) | La ve y la resuelve cargando el itinerario | **No la ve** |
| Transbordos del itinerario | Sí, editables | Sí: cadena de tramos, historia y lista de transbordos |
| Puertos del recorrido | Todos | Paradas, transbordos y recaladas; no los `anunciada` sin itinerario |
| Alerta "puerto sin ubicación" | Sí | No: es para quien mantiene el catálogo |
| Pestaña Escalas y Panel de Rastreo | Solo quien gasta | No |

**Por qué el cliente no ve la sospecha.** La detección compara el destino que
la tripulación escribe a mano contra el POD (§6). Acierta lo suficiente para
que alguien mire, no para anunciarle a un cliente un problema que la mayoría de
las veces no existe. Lo que ya se revisó sí se muestra.

**Por qué el cliente no gasta créditos.** Cada lectura del proveedor es un
crédito y el gasto es una decisión de ASLI, no de quien abre la pantalla. El
cliente lee la última posición guardada — la misma que alimenta la tabla de
flota, refrescada por el chequeo diario sin que nadie tenga que entrar.

### Cómo se sostiene

Tres capas, y la de pantalla es la menos importante:

1. **RLS.** `20260913000005_navitrack_staff_write.sql` da escritura a admin
   (todas) y ejecutivo (las de sus empresas, con la misma condición que
   `operaciones`). `20260913000004_navitrack_cliente_read.sql` da `SELECT` —y
   nada más— sobre recaladas, tramos, transbordos y viajes de **sus**
   operaciones,
   resolviendo la pertenencia con `private.get_cliente_nombres_for_user()`, la
   misma función que usan `operaciones` y los documentos. De
   `navitrack_ais_lecturas` solo se abren las filas de tipo `posicion`: no
   cuelgan de una operación y dónde navega un buque es información pública.
2. **Los endpoints.** `itinerario` y `arribo` aceptan a los tres decisores y no
   gastan nada; `vessel`, `escalas`, `rastreo` y `actualizar` siguen
   exigiendo superadmin, porque todos terminan en el proveedor.
3. **La pantalla.** `soloLectura` apaga acciones y `modo` decide qué se muestra.

Al agregar algo que escriba o gaste, la pregunta es la 1 y la 2, no la 3.

---

## 6 ter. El arribo a destino

Es la última pregunta del viaje y se responde desde la misma ventana que el
itinerario (`NavitrackItinerario.tsx`), en un bloque aparte bajo el título
"Llegada a destino". Aparte, porque el itinerario habla de por dónde viaja la
carga y esto, de que el viaje terminó: mezclarlos invita a marcar el arribo en
un transbordo, que apaga la verificación de un embarque que sigue navegando.

Son dos hechos distintos, no uno:

| | Qué dice | Qué cambia |
|---|---|---|
| **Arribo anunciado** | La naviera dio fecha de llegada al POD | Solo `arribo_anunciado_at`. La carga sigue en tránsito y el buque se sigue consultando |
| **Ya arribó a destino** | Llegó, y en qué fecha | `arribo_confirmado = true` + `arribo_at`. El chequeo diario deja de verificar este embarque |

Guarda `POST /api/navitrack/arribo` (`decision`: `anunciado`, `confirmado` o
`deshacer`). Deciden los mismos que deciden recaladas —superadmin, admin y
ejecutivo—, y el ejecutivo solo alcanza lo suyo porque RLS no le deja ver el
resto.

Tres cosas que no hace, y conviene no prometer:

- **No toca `estado_operacion`.** El arribo no es un estado del flujo
  (FLUJO-DE-TRABAJO.md §4.11): la operación cierra con el fullset, y una carga
  puede llegar estando ya en `DOCUMENTACION_EN_REVISION`. Escribirlo ahí la haría
  retroceder en el papeleo. Mis Reservas y Registros lo muestran **al lado** del
  badge de estado, con `ArriboChip`.
- **No apaga la nave por esta carga.** El crédito se gasta por nave, no por
  embarque: sacarla de la lista blanca porque esta carga llegó le quitaría la
  posición a las otras que sigue llevando. Sí la apaga cuando **no le queda
  ninguna**, contando los dos caminos por los que una carga apunta a un buque —la
  columna `operaciones.nave` y `navitrack_tramos`—; si no, quedaría pagando un
  crédito diario por un viaje ajeno. Se comprueba solo al confirmar un arribo, no
  en cada corrida, para no tocar una nave que alguien puso a mano en la lista sin
  carga todavía. `sincronizarSeguimiento` no cubre este caso: solo actúa sobre
  cadenas de transbordo y nunca apaga una nave sin sucesor. Deshacer el arribo la
  vuelve a encender, si tiene identificador con el que consultarla.
- **No avisa al cliente.** `arribo_avisado_at` existe desde la migración de
  estados y nadie lo escribe todavía.

Se puede deshacer: la ventana ofrece "Deshacer el arribo" en lugar de repetir la
pregunta cuando el embarque ya figura arribado.

### Prometido contra real

Con el arribo fechado se puede medir lo único que no se medía: si la llegada
cumplió lo que se dijo en la reserva. El cálculo vive en
`src/lib/operaciones/desvioEta.ts` —módulo puro, sin React ni Supabase— y lo
consumen la ficha del embarque, Reportes y el dashboard histórico, para que las
tres den el mismo número.

**El cero es `eta_original`, no `eta`.** Son cosas distintas:

| Columna | Qué es |
|---|---|
| `eta_original` | La primera fecha de llegada que se supo del embarque: la promesa. La congela un trigger y el camino normal no la toca |
| `eta` | El ETA vigente, que la naviera reprograma y alguien actualiza |

Medir contra `eta` da siempre una desviación cercana a cero: cuando el buque se
atrasa, el ETA se corrige y la promesa anterior desaparece. Eso mide si avisaron,
no si cumplieron. Por eso la migración `20260917000002` agrega `eta_original` y
un trigger que además registra **cada** cambio de `eta` en `operaciones_cambios`
—en la base y no en la pantalla, porque `eta` se escribe desde la grilla, desde
Mis Reservas, desde las importaciones y desde endpoints con `service_role`, y
auditarlo en el cliente solo habría cubierto el primero: eso es exactamente lo
que pasó hasta ahora, con 45 filas de auditoría y todas de `estado_operacion`—.

El desvío va en **días con signo y sin banda de tolerancia**: negativo si llegó
antes, positivo si después, cero solo el día exacto. Llegar antes no es un
problema pero tampoco es cumplir —mueve stacking, bodega y retiro igual que un
atraso—, así que adelanto y atraso no comparten color y el verde se reserva para
el día exacto.

Dos honestidades que las pantallas tienen que mantener:

- **`eta_original_heredada`.** Las 110 operaciones anteriores al 17-09-2026
  rellenaron su cero con el `eta` vigente, que pudo venir ya revisado. Su desvío
  subestima el atraso y se dice donde se muestre.
- **Sin arribo fechado no hay desvío.** Un arribo marcado sin día —los que vienen
  del estado `ARRIBADO` legado— no entra en el cálculo. Poner cero los contaría
  como cumplidos.

Los resúmenes usan **mediana**, no promedio: un embarque con un mes de atraso
arrastraría el número de toda la temporada.

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
