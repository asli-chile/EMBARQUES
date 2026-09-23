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

## Agregar una plantilla

1. Sumarla a `PLANTILLAS` en `plantillas.ts`, declarando qué campos de texto usa.
2. Agregar su rama de maqueta en `PiezaCanvas.tsx`.

El formulario se arma solo a partir de `campos`: no hay que tocarlo.

## Limitación conocida

La exportación usa el motor del navegador. En Chrome y Edge el PNG sale idéntico
a la vista previa (verificado). En Safari puede variar el contorno del titular,
que son ocho sombras superpuestas.
