# Creador de publicidad

Genera las piezas de redes de ASLI (1080×1350) siguiendo la identidad de la
marca, y las descarga listas para publicar o para enviar por correo.

**Ruta:** `/embarques/creador-publicidad` · **Acceso:** solo superadmin.

## Cómo está armado

| Pieza | Dónde |
|---|---|
| Receta visual (la identidad) | `src/styles/marketing-pieza.css` |
| Tipografías auto-hospedadas | `src/styles/marketing-fuentes.css` + `public/fonts/marketing/` |
| Plantillas y modelo de datos | `src/components/marketing-creador/plantillas.ts` |
| La pieza que se exporta | `src/components/marketing-creador/PiezaCanvas.tsx` |
| Formulario, banco y descarga | `src/components/marketing-creador/CreadorPublicidadContent.tsx` |
| Banco de imágenes | Supabase Storage, bucket público `marketing-banco` |

El origen de la receta son las piezas reales del feed de `@asli_chile`. El mismo
CSS existe como archivos sueltos en el repo de gráficas (`graficas/asli-base.css`),
que es donde se prototipan composiciones nuevas antes de traerlas acá.

## Decisiones que conviene no deshacer sin leer esto

**La pieza mide 1080×1350 px reales, siempre.** La vista previa la encoge con
`transform: scale()`, no cambiando medidas. Así lo que se ve y lo que se
descarga son el mismo nodo del DOM y no se pueden desincronizar. Por eso en
`marketing-pieza.css` no hay `rem` ni unidades de viewport: con `rem` el PNG
saldría de otro tamaño según el zoom del navegador.

**Las tipografías están auto-hospedadas.** El exportador incrusta las fuentes
leyendo las hojas de estilo del documento, y una hoja de otro dominio no siempre
se puede leer: con Google Fonts el resultado dependía de si había respondido.
Para actualizarlas: `node scripts/bajar-fuentes-marketing.mjs`.

**El PNG se genera dos veces.** La primera pasada de `html-to-image` suele salir
sin la foto de fondo, porque la descarga mientras serializa; la segunda ya la
tiene en caché. Quitar la primera llamada hace que la primera descarga de cada
sesión salga sin foto.

**El bucket es público.** Las fotos son stock, sin datos de nadie. Con un bucket
privado habría que firmar cada URL y el exportador se cae por CORS.

## Banco de imágenes

El bucket tiene `fotos/` y un `banco.json` con la categoría y el estado de cada
foto:

- `ok` — se puede usar.
- `revisar` — puede tener una marca de otra empresa; mirarla grande antes.
- `vetada` — tiene marca de una naviera o aerolínea legible. No aparece en la
  grilla salvo que se marque la casilla.

Para reponer o ampliar el banco:

```bash
node --env-file=.env scripts/subir-banco-marketing.mjs --dir <carpeta> --dry-run
node --env-file=.env scripts/subir-banco-marketing.mjs --dir <carpeta>
```

La carpeta lleva los `.jpg` ya optimizados (lado corto 1300 px, calidad ~78) y un
`banco.json` al lado. El script es idempotente: correrlo de nuevo reemplaza y no
duplica. Agregar una foto no necesita desplegar: basta subir el archivo y
actualizar el JSON.

## Las plantillas

Son 67, agrupadas en seis familias. Se eligen desde un desplegable y no desde
una grilla de botones: con esta cantidad, los botones se comian la pantalla.

| Familia | Para que sirve |
|---|---|
| Comercial | Captacion y venta: foto fuerte y llamado a la accion |
| Informativa | Explicar y enumerar: listas, pasos, checklists, tarjetas, tablas |
| Datos y graficos | Cifras, barras, dona de porcentaje, linea de tiempo |
| Minimalista | Mucho aire y poco texto, con y sin foto |
| Noticias | Novedades, hitos, citas y testimonios |
| Redes y educativo | Series, carruseles, preguntas y datos curiosos |

## Elementos de contenido

Cada plantilla declara cuales usa y el formulario se arma solo. Los que llevan
dos partes se escriben una por linea con una barra al medio:

| Elemento | Formato |
|---|---|
| Lista / checklist | un item por linea |
| Pasos | un paso por linea, se numeran solos |
| Tarjetas | `titulo \| texto` |
| Barras | `etiqueta \| numero del 0 al 100` |
| Cifras | `numero \| etiqueta` |
| Hitos | `fecha \| que paso` |
| Tabla | `concepto \| valor` |
| Columnas | titulo y puntos por columna |
| Dato / dona | la cifra y que significa |

La dona se dibuja como SVG y no con `conic-gradient`: el exportador serializa
SVG sin problemas, y el gradiente conico sale con bandas.

## Agregar una plantilla

Basta con sumarla a `PLANTILLAS` en `plantillas.ts`. `campos` arma el
formulario y `maqueta` arma el lienzo, asi que **PiezaCanvas no se toca** salvo
que haga falta un tipo de fondo que todavia no exista.

`maqueta` esta en px reales de la pieza (1080x1350): donde empieza el bloque de
texto, donde el panel, de que alto es el logo. Conviene copiar la maqueta de
una plantilla parecida y correr los numeros, en vez de escribirla desde cero.

## Encuadre de la foto

Tres controles: acercar (100-250%), mover en vertical y mover en horizontal.
El horizontal se activa solo al acercar, porque sin zoom no hay nada que
correr. El acercamiento va por `transform: scale()` y no por `background-size`,
para que el encuadre siga significando lo mismo con y sin zoom.

## Color de la media flecha

Blanco, rojo, azul o crema. Cada plantilla puede declarar cual le calza al
salir (`flechaPorDefecto`): la minimal clara arranca en azul, porque sobre
crema la blanca no se ve.

## Limitación conocida

La exportación usa el motor del navegador. En Chrome y Edge el PNG sale idéntico
a la vista previa (verificado). En Safari puede variar el contorno del titular,
que son ocho sombras superpuestas.

## Subir imagenes desde la pagina

Hay dos botones de subida: uno para fotos del banco (con su categoria) y otro
para el logo del evento o del cliente, que aparece solo en las plantillas de
ferias y visitas.

La subida pasa por `src/pages/api/marketing/banco.ts` y no va directo del
navegador al bucket: el bucket es publico solo de lectura, escribir exige la
llave de servicio y esa no puede viajar al cliente. El endpoint revisa que sea
superadmin, sube el archivo y actualiza `banco.json`.

El navegador reduce la imagen antes de mandarla: las fotos a 1300 px de lado
corto en JPEG, los logos a 600 px en PNG para no perder la transparencia. Asi
la funcion no necesita una libreria de imagenes ni recibir archivos enormes.

Los logos quedan guardados en `logos/` del mismo bucket y se ofrecen en las
siguientes piezas, sin volver a subirlos.

## Ferias y visitas

Son 25 plantillas para cuando estamos en terreno. Todas llevan el logo del
evento o del cliente junto al de ASLI, en dupla centrada y separados por una
linea; en las composiciones donde no cabe, el invitado va suelto en su esquina.

El logo invitado se dibuja dentro de una caja de tamano fijo con `object-fit`.
Los logos ajenos vienen cuadrados, apaisados o verticales: fijarle ancho o alto
a la imagen deformaba unos y recortaba otros.

Ademas del titular, estas plantillas tienen tres datos propios del evento:
fecha, lugar y numero de stand, que salen como etiquetas con borde (el stand
va destacado en rojo).

**Si el logo invitado es oscuro**, conviene usar "Feria en claro": sobre fondo
crema un logo oscuro se lee, y sobre foto o panel azul se pierde. La otra
opcion es subir una version blanca del logo.

## Tamano de la vista previa

La pieza se muestra al tamano que entre en el hueco disponible: se mide la
columna con un ResizeObserver y se calcula la escala contra el ancho y contra
el alto, quedandose con la menor. Antes era una escala fija y en pantallas
grandes la pieza quedaba chica con media columna vacia.

En pantallas angostas solo se mira el ancho: ahi la columna crece con su
contenido, asi que leer el alto se realimentaria.

El panel de herramientas tiene ancho maximo. Sin el, en una pantalla de 1920
los campos de una linea se estiraban a 1300 px y eran incomodos de leer.

## Probar en local

El servidor de desarrollo puede quedarse con la cache de dependencias de Vite
desactualizada y entonces **React no hidrata**: la pagina se ve pero nada
responde, y en consola aparece "Failed to fetch dynamically imported module".

Se arregla arrancando con `npx astro dev --force`, que fuerza a Vite a
reoptimizar. Si el puerto sigue tomado por una instancia anterior, matarla
primero: el servidor viejo se queda con el 4321 y el nuevo no llega a levantar.

## Ajuste manual de posiciones

El botón "Ajustar posiciones" permite mover y redimensionar los elementos de
contenido. La identidad —media flecha, logo de ASLI y pie con la dirección— no
se toca: es lo que mantiene a las piezas reconocibles entre sí.

### Por qué se "congela" al entrar

Los textos viven apilados en un flujo vertical: la plantilla dice dónde empieza
el bloque y el resto cae solo. Para moverlos sueltos hace falta que cada uno
tenga coordenada propia, y si cada uno arrancara en una coordenada inventada la
pieza saltaría al entrar al modo.

Por eso al activarlo se **miden** todos los elementos en su posición actual y se
guardan esas coordenadas. El paso de apilado a libre no mueve nada de lugar.
Mientras un elemento no tenga ajuste sigue en el flujo, así que las 92
plantillas funcionan igual que antes para quien no toque nada.

### Guías e imán

Al arrastrar se comparan tres puntos del elemento —su borde inicial, su centro
y su borde final— contra el centro del lienzo y contra los márgenes. Si alguno
queda a menos de 8 px, el elemento se pega y aparece la guía. Comparar los tres
puntos es lo que hace que alinear "por el centro del elemento" y "por sus
extremos" funcionen igual de bien.

La guía del centro se pinta celeste y las de margen rosadas, porque centrar es
lo que más se busca.

### Todo se calcula en píxeles del lienzo

La vista previa está encogida con `transform: scale()`, así que cada movimiento
del puntero se divide por esa escala antes de aplicarse. Sin eso, arrastrar
10 px en pantalla movería el elemento 26 px en la pieza.

### La UI del editor no entra en el PNG

Durante la exportación el lienzo se dibuja sin editor, así que no existen ni las
manijas ni los contornos; además el exportador descarta cualquier nodo con la
clase `editor-ui`, y las guías viven fuera de la pieza. Está verificado con una
prueba automatizada que apaga el modo y cuenta que no quede nada.

### Dos trampas que ya costaron

- **No llamar a `setPieza` dentro del updater de `setAjustando`.** Un setState
  dentro del updater de otro es un efecto lateral y React lo descarta: el modo
  se activaba pero no congelaba nada.
- **El puntero se sigue en `window`, no en el elemento.** Si se arrastra rápido
  el cursor se sale del elemento y los eventos dejarían de llegar.

## Formatos de salida

Tres relaciones de aspecto: publicación 4:5 (1080×1350), historia 9:16
(1080×1920) y cuadrada 1:1 (1080×1080).

Las 92 maquetas están escritas para 1080×1350. Para los otros formatos se
multiplica **toda coordenada vertical** por `alto / 1350`, tanto en el canvas
(logo, bloque, paneles) como en el CSS, que usa la variable `--k` en las
bandas, los velos y las franjas. Así la composición se mantiene proporcional en
vez de amontonarse arriba.

**En los formatos más bajos que 4:5 el bloque de texto también se achica.** Al
comprimir solo las posiciones, el texto conservaba su tamaño y terminaba
montándose sobre el pie en el formato cuadrado. Nunca se agranda: en historia
sobra alto, y agrandar la letra la dejaría desproporcionada.

El JPG de correo calcula su alto desde la proporción real de la pieza; antes
tenía 750 fijo y habría deformado los otros formatos.

Al cambiar de formato, los ajustes manuales quedan con las coordenadas del
formato anterior. La página lo avisa, y con "Devolver todo a la plantilla" se
recalcula.

## Qué se puede mover

Los elementos de contenido, el logo de ASLI y el pie con la dirección. La media
flecha es lo único fijo: es el ancla de identidad de la pieza.

El logo y el pie no viven en el flujo —nacen con posición propia— así que su
envoltorio es el que posiciona y el hijo pasa a estático. Sin eso, el
`translateX(-50%)` que centra el logo lo descolocaba apenas se movía. El pie
además va con z-index por encima: es el dato de contacto y no puede quedar
tapado por algo que alguien arrastró encima.

## El panel de herramientas

Está dividido en cuatro pestañas, en el orden real de trabajo: **Plantilla**,
**Contenido**, **Imagen** y **Estilo**. Antes iba todo apilado y había que
scrollear media pantalla para llegar a la foto.

- **Plantilla**: formato y elección de plantilla.
- **Contenido**: los campos de texto que declara la plantilla.
- **Imagen**: banco de fotos, subida y encuadre.
- **Estilo**: color de la flecha y ajuste manual de posiciones.

### Las plantillas se eligen viéndolas

La grilla dibuja **la pieza de verdad** en miniatura, con el contenido que hay
cargado en ese momento, no una muestra genérica: así se ve cómo va a quedar el
texto propio en esa composición. Antes era un desplegable y solo se leía el
nombre, que con 92 plantillas no dice nada.

Se muestra **una familia por vez** (los chips de arriba). Con las 92 a la vez
habría 92 lienzos vivos en el DOM, cada uno con sus capas y su foto.

La miniatura se dibuja con `ajustes: {}`: muestra la plantilla limpia, sin los
movimientos a mano de la pieza en curso, que no tendrían sentido en otra
composición.

El selector de formato dibuja la silueta de cada proporción, que se entiende
antes que el texto.

## Recursos de composición

Mover números en la maqueta no alcanza para que dos piezas se vean distintas:
la familia Comercial tenía siete variantes de "foto arriba, panel azul en
diagonal, titular centrado con contorno rojo". Se ven todas iguales en el feed.

Por eso hay palancas que cambian el **tipo** de composición, no su medida. Se
declaran en la maqueta:

| Palanca | Qué hace |
|---|---|
| `panelVariante` | Corte del panel: diagonal (por defecto), `recto` o `invertida` |
| `arco` | Borde inferior curvo en la foto |
| `bandaLateral` | Franja de color con el rótulo en vertical |
| `marcoInterior` | Marco que encuadra la pieza |
| `cajaTexto` | El bloque de texto sobre una caja sólida (`navy`, `roja`, `crema`) |
| `titularPlano` | Titular sin el contorno rojo |
| `filete` | Filete rojo bajo el titular, para las que no llevan cinta |

Dos detalles que costaron:

- **El contorno rojo del titular sobra sobre una caja sólida**: ahí ensucia en
  vez de destacar. Por eso `cajaTexto` va casi siempre con `titularPlano`.
- **El rótulo vertical va con `writing-mode`, no con `rotate`.** Al rotar, la
  caja conserva su tamaño horizontal y un texto largo se salía de la franja.

## Alineación de los textos

Tres botones en la pestaña Contenido: izquierda, centro y derecha. Cada
plantilla propone una; si se elige otra, manda la elegida, y con "Usar la de la
plantilla" se vuelve atrás.

Las clases `al-*` van **al final de la hoja** a propósito: así le ganan a la
alineación que pone la maqueta sin tener que subir la especificidad.

Alinear no es solo `text-align`, porque los elementos no se comportan igual:

- **Filas** (chips, datos del evento, cifras): son flex, así que obedecen a
  `justify-content`, no a `text-align`.
- **Bloques con ancho máximo** (bajada, listas, pasos, hitos, tabla, barras):
  se centran con `margin: auto`, así que se mueven cambiando el margen. El
  texto adentro sigue leyéndose desde la izquierda aunque la lista esté a la
  derecha, que es lo correcto.
- **Las cifras** se repartían el ancho con `flex: 1`, así que alinearlas no
  hacía nada y parecía que el control estaba roto. Fuera del centro dejan de
  estirarse y se agrupan hacia el lado elegido.
