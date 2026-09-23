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

## Correo HTML

El tercer boton de descarga arma el correo completo: exporta la pieza, la sube
al bucket en `correos/` y genera un `.html` que apunta a esa URL. Tambien lo
deja en el portapapeles, para pegarlo directo en Gmail o en el editor de codigo
de la plataforma de envios.

**La pieza viaja como imagen, no como HTML replicado.** No es comodidad: la
identidad depende de `clip-path` (la media flecha), de ocho sombras
superpuestas (el contorno rojo del titular), de `transform` y de tipografias
web. Outlook de escritorio renderiza con el motor de Word e ignora todo eso, asi
que una replica en HTML llegaria descuadrada, sin flecha y con el titular en la
tipografia por defecto. Como imagen llega identica en todos los clientes.

Lo que si va como texto real, fuera de la imagen, es el titular, la bajada y el
boton: Gmail y Outlook bloquean imagenes por defecto, y asi el mensaje se
entiende igual y el enlace sigue siendo clickeable. El boton lleva VML para que
Outlook lo dibuje, y los enlaces llevan UTM con el nombre de la pieza.

La imagen no puede ir como `data:` URI: los clientes de correo no las muestran.
Por eso hace falta subirla y referenciarla por URL.
