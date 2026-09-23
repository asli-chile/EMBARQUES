# Ideas pendientes

Cosas que vale la pena construir **algún día**, no ahora. Cada una anota qué se
necesitaría y —más importante— qué trampa tiene, para que quien la retome no
vuelva a descubrirla desde cero.

Nada de este archivo está construido. Si algo se construye, se saca de acá y se
documenta donde corresponda.

---

## Catastro de cumplimiento de navieras

*Anotado el 21-09-2026, a partir del seguimiento del CMA CGM CARL ANTOINE.*

**La idea:** medir cuánto se atrasan las navieras, cruzando la fecha que
prometieron con la que el buque declara por AIS. Sirve para negociar con datos
en vez de con impresiones.

### Por qué `operaciones.eta` no se toca

`eta` es la fecha que la naviera informó **al principio**: es el compromiso, y
es la línea base contra la que se mide todo lo demás. Actualizarla con el dato
del AIS parece una mejora —la fecha quedaría "más correcta"— y en realidad
destruye la medición: si la promesa se pisa con la realidad, el atraso
desaparece y no queda contra qué comparar.

Dicho de otro modo: una `eta` desactualizada no es un error de datos. Es el dato.

La realidad vive aparte, en las lecturas AIS.

### Materia prima que ya se acumula

Nada de esto hay que construirlo; ya está guardándose solo:

| Dónde | Qué guarda |
|---|---|
| `operaciones.eta` | La promesa inicial de la naviera |
| `navitrack_ais_lecturas.eta` | La ETA que declara el buque, una fila por lectura. **La tabla no se purga**, así que hay serie completa |
| `navitrack_recaladas` | `eta_anunciada` y `recalado_at` (cuándo consta que el buque paró de verdad) |
| `operaciones.arribo_at`, `arribo_anunciado_at` | Existen desde la migración del 17-09-2026 |

La serie de lecturas empieza el **12-09-2026**. Antes de esa fecha no hay con
qué reconstruir nada.

### La trampa: el ETA del AIS es del próximo puerto, no del POD

Es lo único que hay que entender antes de escribir la primera consulta. El buque
declara la ETA del **siguiente puerto de su recorrido**, que casi nunca es el
destino del embarque. Comparada sin filtrar contra la promesa al POD, da esto:

| Nave | Prometida al POD | AIS declara | "Desvío" | ¿Sirve? |
|---|---|---|---|---|
| CMA CGM CARL ANTOINE | 20-09 | 21-09 19:30 **Hamburgo** | +1,8 d | Sí: declara el POD |
| CALLAO EXPRESS | 11-10 | 22-09 15:00 Cartagena | −18,4 d | No: es una escala |
| CMA CGM ESTELLE | 31-10 | 23-09 02:00 San Antonio | −37,9 d | No: aún no zarpa |

Sin el filtro, el catastro concluiría que las navieras llegan tres semanas
**antes** de lo prometido, que es exactamente al revés de lo que se quiere medir.

**La regla:** el desvío solo se computa cuando el buque declara el POD como
destino. En la foto del 21-09-2026 eso ocurría en 1 de 7 naves seguidas.

### Un indicador que no necesita el POD

Mientras tanto, **cuántas veces cambió la ETA durante el viaje** ya es una
medida de confiabilidad, y se saca de la serie sin cruzar nada. En diez días:
CMA CGM CARL ANTOINE la revisó 7 veces, MSC SERENA 8. Es lo más barato de
construir y probablemente lo más útil por sí solo.

### Lo que falta, y no es técnico

`operaciones.arribo_at` está cargado en **1 operación de toda la base**. Sin el
arribo real registrado, el catastro puede medir *promesas que se mueven* pero no
*si se cumplieron*. La pieza que falta es que alguien marque el arribo, no una
tabla nueva.

### Decisión previa: cuál es el eje

`operaciones.naviera` dice **OOCL** para el CMA CGM CARL ANTOINE y **COSCO**
para el CMA CGM ESTELLE. No parece un error: el booking se le compra a una
naviera y la nave puede ser de otra (consorcio, slot charter). Pero define dos
catastros distintos y hay que elegir antes de construir:

- **A quién se le compró el espacio** (`operaciones.naviera`) — el que sirve
  para negociar.
- **Quién opera el buque** (el catálogo `naves`) — el que sirve para saber qué
  barcos andan mal.

---

## ETA en hora local del puerto

*Anotado el 21-09-2026.*

NaviTrack muestra el ETA del AIS en UTC. Una pantalla externa que se revisó ese
día lo mostraba como `2026-09-21 21:30 LT (UTC +2)`, y esa forma es mejor: dice
la hora que le importa a quien espera el atraque y deja el offset a la vista,
así que no hay que adivinar de qué hora se está hablando.

Requiere saber la zona horaria del puerto de destino, que hoy no está en la
base. Cuidado con derivarla del país: hay países con varias.

---

## Exportar la pieza como correo HTML

*Anotado el 23-09-2026. Se construyó, no convenció y se revirtió (commit
316fd4f, revertido en e327b6e). Queda acá por si se retoma.*

**La idea:** un botón en el creador que exporte la pieza, la suba sola al
bucket y genere el `.html` del correo apuntando a esa URL, para no tener que
descargar el JPG, commitearlo al repo del sitio y esperar el deploy cada vez
que se quiere mandar un correo.

### La trampa: no se puede replicar la pieza en HTML

Lo primero que uno quiere es que el correo sea la pieza en HTML, no una imagen.
No se puede. La identidad depende de cuatro cosas que Outlook de escritorio no
soporta, porque renderiza con el motor de Word:

| Lo que usa la pieza | Para qué | En Outlook |
|---|---|---|
| `clip-path` | la media flecha y las diagonales | se ignora, queda sin flecha |
| ocho sombras superpuestas | el contorno rojo del titular | se ignoran, texto plano |
| `transform` | el zoom de la foto | se ignora |
| tipografías web | Montserrat itálica | cae a la tipografía por defecto |

Cualquier intento de réplica llega descuadrado. Como imagen llega idéntica en
todos los clientes.

### Otras dos cosas que ya están resueltas y conviene no redescubrir

- **La imagen no puede ir como `data:` URI.** Los clientes de correo no las
  muestran. Por eso el paso de subirla a una URL pública es necesario, no
  opcional.
- **El titular, la bajada y el botón tienen que ir como texto real fuera de la
  imagen.** Gmail y Outlook bloquean imágenes por defecto; sin texto real el
  correo llega en blanco.

### Qué existía y sirve de base

Las plantillas de correo del repo de gráficas (`asli-graficas/email/`), que ya
tienen la estructura de tablas, el botón con VML para Outlook y las UTM.
