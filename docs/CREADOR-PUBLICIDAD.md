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

## Las 15 plantillas

Van agrupadas en cuatro familias, que es como se eligen en la pagina:

| Familia | Plantillas |
|---|---|
| Comercial | Hero pleno, Panel abajo, Panel arriba, Split diagonal, Oferta / temporada, Poster sandwich |
| Informativa | Banda + lista, Glosario, Paso a paso, Dato gigante, Comparativa |
| Minimalista | Minimal azul, Minimal claro |
| Noticias | Noticia, Cita / testimonio |

Las minimalistas y dos de las informativas no usan foto: el fondo es solido y
la pagina esconde el banco de imagenes cuando no hace falta.

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
