# Sistema de Motion Design — EMBARQUES

Guía del sistema de animaciones del ERP: qué existe, cómo usarlo y, sobre todo,
cuándo **no** animar.

Complementa a [ESTILOS-VISUALES.md](./ESTILOS-VISUALES.md), que define las formas
y los colores. Este documento define el **movimiento**.

---

## 1. La regla

> **Animate meaningfully, not decoratively.**
> Anima con intención, no de adorno.

Una animación solo se justifica si comunica una de estas cinco cosas:

| Comunica | Ejemplo en el ERP |
|---|---|
| **Aparición** | Una fila nueva entra en la tabla de clientes |
| **Desaparición** | Un modal se cierra y el contenido de atrás vuelve a ser el foco |
| **Cambio de estado** | Un toggle pasa de Inactivo a Activo |
| **Jerarquía** | El hero entra antes que la toolbar, y la toolbar antes que la tabla |
| **Feedback de interacción** | Un botón se hunde un 1,5 % al presionarlo |

Si una animación no entra en ninguna de esas cinco filas, **no se agrega**.

### Reglas técnicas

1. Solo se animan `transform` y `opacity` (y `scale`, que es un `transform`
   independiente). Estas propiedades corren en el compositor de la GPU: no
   obligan al navegador a recalcular el layout y sostienen 60 FPS.
2. No se animan `width`, `height`, `top`, `left` ni `margin`: cada frame
   dispararía un *reflow* de la página completa.
3. `box-shadow` solo se transiciona en el anillo de foco de los formularios,
   donde el costo es despreciable y la alternativa (que aparezca de golpe) se
   siente tosca.
4. Nunca `linear` en animaciones principales. Única excepción: el spinner, donde
   una rotación continua con easing se percibiría como un tirón.
5. Los movimientos son pequeños: entre 4 y 24 px. Las escalas, entre 0,97 y 1.

---

## 2. Dónde vive el sistema

| Archivo | Rol |
|---|---|
| [`src/styles/motion.css`](../src/styles/motion.css) | **Fuente de verdad.** Tokens como variables CSS + todas las clases de utilidad |
| [`src/lib/ui/motion.ts`](../src/lib/ui/motion.ts) | Espejo en TypeScript de los mismos valores, para timeouts de React y stagger inline |
| [`tailwind.config.ts`](../tailwind.config.ts) | Expone los tokens como utilidades (`duration-fast`, `ease-enter`…) |
| [`src/hooks/useOverlayTransition.ts`](../src/hooks/useOverlayTransition.ts) | Ciclo de vida animado de modales y paneles |
| [`src/components/ui/Skeleton.tsx`](../src/components/ui/Skeleton.tsx) | Skeletons con shimmer |
| [`src/components/ui/ModalShell.tsx`](../src/components/ui/ModalShell.tsx) | Cáscara de modal con entrada y salida |

`motion.css` se importa una sola vez, al inicio de
[`src/styles/globals.css`](../src/styles/globals.css), que a su vez carga
`BaseLayout.astro`. No hace falta importarlo en ningún componente.

> **Si cambias un valor, cámbialo en los dos sitios** (`motion.css` y
> `motion.ts`). Son deliberadamente redundantes: el CSS no puede darle a React
> el número que necesita para un `setTimeout`.

---

## 3. Tokens

### Duración

Escala corta a propósito: por encima de ~520 ms la interfaz se siente lenta.

| Token | Valor | Se usa para |
|---|---|---|
| `--motion-duration-instant` | 90 ms | Feedback táctil: press, hover |
| `--motion-duration-fast` | 160 ms | Cambios de estado, colores, **salidas** |
| `--motion-duration-base` | 240 ms | Entrada y salida de elementos |
| `--motion-duration-slow` | 360 ms | Modales, paneles, drawers |
| `--motion-duration-slower` | 520 ms | Transición de vista completa |

La salida siempre es más rápida que la entrada: nadie debe esperar a que algo
se vaya.

### Easing

| Token | Curva | Carácter |
|---|---|---|
| `--motion-ease-enter` | `cubic-bezier(0.22, 1, 0.36, 1)` | Desacelera fuerte. Llega y se asienta: da la sensación de inercia |
| `--motion-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Acelera. Se va y no vuelve |
| `--motion-ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Simétrica. Cambios de color y de estado |
| `--motion-ease-emphasis` | `cubic-bezier(0.34, 1.24, 0.64, 1)` | Rebote apenas perceptible. Uso excepcional |

### Delay, stagger y distancia

| Token | Valor |
|---|---|
| `--motion-delay-none` / `-short` / `-medium` | 0 / 60 / 120 ms |
| `--motion-stagger-tight` / `-base` / `-loose` | 30 / 45 / 70 ms |
| `--motion-distance-xs` / `-sm` / `-md` / `-lg` | 4 / 8 / 14 / 24 px |
| `--motion-scale-from` / `--motion-scale-press` | 0.97 / 0.985 |

### Uso desde Tailwind

Los tokens de duración y easing están registrados en `tailwind.config.ts`:

```tsx
<div className="transition-colors duration-fast ease-standard" />
<div className="transition-transform duration-slow ease-enter" />
```

---

## 4. Clases de utilidad

### Aparición

| Clase | Efecto |
|---|---|
| `motion-enter` | Fade + 8 px hacia arriba, 240 ms. El caso general |
| `motion-enter-soft` | Fade + 4 px, 160 ms. Elementos pequeños que aparecen y desaparecen seguido (chips, badges) |
| `motion-enter-lift` | Fade + 14 px + escala 0.97, 360 ms. Bloques grandes: cards, diálogos, contenido que reemplaza un skeleton |
| `motion-fade` | **Solo opacidad.** Para elementos que ya llevan un `transform` propio |

> **Por qué existe `motion-fade`:** un keyframe que anima `transform` sobrescribe
> las utilidades de transformación de Tailwind. Un botón con `-translate-y-1/2`
> saltaría de posición al aparecer. Si el elemento ya está transformado, usa
> `motion-fade`.

### Stagger (listas y grupos)

Para listas dinámicas, el índice se pasa inline con `staggerStyle()`:

```tsx
import { staggerStyle } from "@/lib/ui/motion";

{filtered.map((row, index) => (
  <tr
    key={row.id}
    style={staggerStyle(index)}
    className="motion-enter motion-stagger motion-stagger-tight"
  >
))}
```

`staggerStyle()` topea el índice en 8 (`STAGGER_MAX_INDEX`). Sin ese tope, una
tabla de 200 filas con 45 ms de separación tardaría 9 segundos en terminar de
aparecer. Con el tope, la cascada se percibe igual y la lista se completa en
~360 ms.

Para grupos pequeños y de tamaño fijo (una toolbar, los campos de un formulario)
basta con `motion-stagger-group` en el contenedor: los hijos se escalonan solos
mediante `:nth-child`, sin tocar el JSX de cada uno.

### Transición de vista

La navegación del ERP recarga el documento completo (no hay SPA router ni View
Transitions de Astro), así que la transición se reparte:

1. **Salida de la vista anterior** — la cubre `public/erp-busy.js`, que ya
   muestra un velo y una barra de progreso al hacer click en un link interno.
2. **Entrada de la vista nueva** — `div.motion-view` en `Sus()`, dentro de
   [`AppShell.tsx`](../src/components/layout/AppShell.tsx). Se monta recién
   cuando el chunk del módulo resolvió, así que la animación coincide con el
   momento en que el skeleton da paso al contenido real.
3. **Secciones internas** — `motion-view-section` + `staggerStyle(n)` en el hero,
   la toolbar y el contenido. Entran en cascada después del contenedor.

El resultado se lee como una sola transición continua y no como tres
animaciones sueltas.

### Feedback de interacción

| Clase | Para |
|---|---|
| `motion-interactive` | Botones y controles. Transiciona color, borde y fondo, y hunde un 1,5 % al presionar |
| `motion-pressable` | Cards y filas clickeables. Solo el hundido, sin forzar cambios de color |

Ya están aplicadas en los botones compartidos de
[`moduleStyles.ts`](../src/lib/ui/moduleStyles.ts) (`moduleBtnPrimary`,
`moduleBtnSecondary`, `moduleBtnOnHero`), así que la mayoría de los módulos las
heredan sin cambios.

> **Detalle de implementación importante:** el hundido usa la propiedad `scale`
> y no `transform: scale()`. `scale` se compone con `transform`, así que un
> elemento con `-translate-y-1/2` de Tailwind conserva su posición al
> presionarlo. Con `transform: scale()` saltaría.

### Loading

| Clase | Para |
|---|---|
| `motion-skeleton` | Bloque con shimmer. Variantes: `motion-skeleton-on-dark` (hero navy), `motion-skeleton-surface` (donde irá una card blanca) |
| `motion-refreshable` + `data-refreshing` | Atenúa contenido ya visible durante una recarga |
| `animate-spin` | Spinner. Es el de Tailwind, no hay uno propio: `linear` es correcto para una rotación continua y ya está en 28 archivos |

El shimmer barre con `transform: translateX()` sobre un `::after`, no con
`background-position`: así corre en el compositor y no repinta en cada frame.

### Overlays

`motion-backdrop` y `motion-panel` son **transiciones**, no keyframes, y leen su
estado de `data-state="open" | "closed"`. Eso permite animar entrada y salida
con el mismo nodo. `motion-panel-sheet` cambia el panel a bottom sheet en móvil
(sube desde abajo, sin escala).

---

## 5. Patrones

### 5.1 Loading de un módulo

El patrón está implementado completo en
[`ClientesContent.tsx`](../src/components/clientes/ClientesContent.tsx), que
sirve de referencia. Tres estados distintos, no dos:

```tsx
/** Primera carga: no hay nada que mostrar → skeleton en la zona de contenido. */
const isFirstLoad = loading && rowData.length === 0;
/** Recarga sobre datos ya visibles: se atenúa, no se bloquea la interfaz. */
const isRefreshing = loading && rowData.length > 0;
```

- **Primera carga:** el hero y la toolbar se renderizan igual (son estructura
  conocida, no dependen de los datos) y solo el área de contenido muestra
  `<SkeletonRows />`. El módulo nunca se reemplaza por una pantalla de "Cargando…".
- **Recarga:** el contenido viejo sigue en pantalla, atenuado al 60 % vía
  `motion-refreshable` + `data-refreshing`, y el icono de refresh gira. El dato
  anterior sigue siendo legible y la interfaz sigue usable.
- **Llegada del dato:** las filas entran con `motion-enter` en cascada. No
  aparecen de golpe.

Para un bloque individual, el cambio skeleton → contenido se hace envolviendo el
contenido real en `motion-enter-lift`: entra con fade + translate + escala
mínimos, de modo que se lea como una continuación del skeleton y no como un
salto.

### 5.2 Un modal

```tsx
<ModalShell
  isOpen={showAddModal}
  onClose={() => setShowAddModal(false)}
  icon="lucide:plus"
  title="Agregar cliente"
  labelledById="add-cliente-title"
  footer={<>{/* botones */}</>}
>
  {/* campos del formulario — se escalonan solos */}
</ModalShell>
```

`ModalShell` reproduce exactamente el patrón visual que ya usaban los módulos
(bottom sheet en móvil, card centrada en desktop, grabber, header con icono) y
agrega lo que faltaba: salida animada, bloqueo del scroll del body y cierre con
Escape.

**Cuidado con el estado durante la salida.** El modal sigue montado ~160 ms
después de cerrarse, así que no puede depender de un estado que el padre acaba
de limpiar. El patrón es separar los datos de la visibilidad:

```tsx
const [editingRow, setEditingRow] = useState<ClienteRow | null>(null);
const [isEditOpen, setIsEditOpen] = useState(false);
```

`editingRow` se conserva; solo `isEditOpen` baja al cerrar.

Si necesitas el ciclo de vida animado en otro tipo de overlay (dropdown, panel,
sheet), usa `useOverlayTransition` directamente.

---

## 6. Accesibilidad y rendimiento

### `prefers-reduced-motion`

`motion.css` cierra con un bloque `@media (prefers-reduced-motion: reduce)` que
neutraliza **todas** las clases del sistema. Se conserva la información —qué
apareció, qué cambió— y se elimina el movimiento.

Al agregar una clase animada nueva, agrégala también a ese bloque.

### Efectos pesados

GSAP está reservado para lo que el CSS no puede hacer: scroll-driven y canvas.
Solo se usa en dos lugares, ambos con carga dinámica y detrás del gate de
[`shouldUseHeavyVisualEffects()`](../src/lib/ui/devicePerf.ts), que los desactiva
en móvil y en conexiones lentas:

- `InicioContent.tsx` — reveals con ScrollTrigger y parallax del hero.
- `AnimatedNetworkBackground.tsx` — red de nodos en canvas.

**No agregues GSAP para animaciones de UI.** Todo lo que este documento describe
—entradas, salidas, stagger, modales, skeletons— se resuelve con CSS, sin
JavaScript en el hilo principal y sin sumar peso al bundle.

### Por qué `backwards` y no `both`

Las clases de aparición usan `animation-fill-mode: backwards`. Al terminar, el
navegador descarta los estilos de la animación y el elemento queda **sin**
`transform`. Es deliberado: un `transform` residual crea un *containing block* y
descolocaría a cualquier hijo `position: fixed` —modales, drawers, toasts— que
se abriera después.

---

## 7. Inventario completo

**El ERP tiene 6 keyframes en total.** Esta es la lista entera; si agregas uno,
agrégalo también acá y justifica por qué no alcanzaba con los que ya existen.

| Keyframe | Dónde | Para qué |
|---|---|---|
| `motion-enter` | `motion.css` | **La única animación de aparición.** Sus presets (`motion-enter`, `-soft`, `-lift`, `motion-view`, `motion-view-section`) son el mismo keyframe con distintos tokens |
| `motion-fade` | `motion.css` | Aparición sin `transform`, para elementos ya transformados |
| `motion-shimmer` | `motion.css` | El barrido de los skeletons |
| `erp-busy-slide` | `public/erp-busy.js` | Barra de progreso de la navegación entre páginas |
| `erp-busy-rot` | `public/erp-busy.js` | Spinner del velo de navegación |
| `inicio-aurora-drift` | `inicio.css` | Fondo de la landing pública |

Más dos utilidades nativas de Tailwind, que no se duplican en el sistema:

- `animate-spin` — spinners de carga.
- `animate-pulse` — **solo** para puntos de estado "en vivo" (usuarios conectados,
  progreso activo). No para skeletons: para eso está `motion-skeleton`.

Entradas y salidas de overlays no usan keyframes, sino transiciones sobre
`data-state` (`motion-backdrop`, `motion-panel`).

### Cómo llegamos acá

La primera versión de este sistema se agregó **encima** de las animaciones que ya
existían, y el resultado fueron 29 keyframes: cinco formas distintas de hacer una
entrada, tres de hacer un skeleton, dos spinners y dos archivos de tokens
compitiendo. La interfaz se sentía inconsistente justamente por eso.

La consolidación eliminó 23 de esos 29:

- 9 keyframes de `ModuleRouteLoader.tsx`, un componente huérfano que nadie
  renderizaba.
- 5 entradas duplicadas (`fade-in`, `fade-in-up`, `modal-in`, `auth-modal-in`,
  `auth-backdrop-in`) → todas a `motion-enter` / `motion-fade`.
- `stacking-progress`, `sidebar-in` y `modal-out`: sin un solo uso.
- `inicio-skeleton-shimmer` → `motion-shimmer`.
- `motion-spin`, `motion-exit`, `motion-view-exit`, `motion-view-enter` y
  `motion-skeleton-out`: duplicados o sin uso que introdujo esta misma refactorización.
- Los tokens muertos de `brand.ts`, que competían con `motion.ts`.

`tailwind.config.ts` ya no define ningún keyframe: solo expone los tokens. Todas
las animaciones viven en `motion.css`, en un solo lugar.

## 8. Deuda pendiente

El sistema está aplicado en las piezas transversales (shell, navegación, botones
compartidos, overlays de autenticación, skeletons de Dashboard, Registros,
Reportes, Finanzas e Inicio) y completo en `ClientesContent` como módulo de
referencia. Queda por migrar:

- Los módulos donde `<Icon className="animate-spin" />` es el **único** estado de
  carga: la mayoría se beneficiaría de un skeleton en su lugar.
- Los modales que siguen siendo un `div` condicional sin salida animada: pueden
  pasar a `ModalShell`.
