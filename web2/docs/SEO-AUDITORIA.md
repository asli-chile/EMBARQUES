# Auditoría SEO — Sitio público ASLI (`web2`)

Documento de referencia tras la auditoría de títulos, H1, descriptions y keywords.
Última revisión: **2026-09-06**.

**Canónico:** `https://www.asli.cl` (Vercel redirige `asli.cl` → `www`)  
**Sitemap:** `https://www.asli.cl/sitemap.xml`  
**Fecha editorial sitemap:** `SITE.contentUpdatedAt` en `src/lib/site.js` (actualizar al editar textos SEO).

> **Importante:** no añadir redirects www↔apex en `next.config.js`. Vercel ya fuerza el primario; un redirect inverso causa bucle 308 y tumba el sitio.

---

## Resumen ejecutivo

| Área | Estado |
|------|--------|
| Meta + Open Graph + Twitter | OK (`Seo.jsx`) |
| Canonical | OK: `www.asli.cl`; Vercel redirige `asli.cl` → `www` (308) |
| Schema.org (Organization, LocalBusiness, Service, FAQ) | OK |
| Sitemap + robots | OK (incluye `/stacking`; bloquea `/stacking/pil`) |
| Landings por keyword | 8 URLs sólidas |
| Páginas utilitarias (tracking / stacking) | Mejoradas en esta pasada |
| Google Search Console / Business Profile / backlinks | **Pendiente fuera de código** |

Lo técnico on-page ya no es el cuello de botella. Lo que más mueve ranking ahora es: Search Console, Google Business, reseñas, menciones y más contenido.

---

## Checklist por página

Leyenda: **OK** · **Mejorado** · **Vigilar** (canibalización o poca profundidad)

### Home `/`

| Campo | Valor / nota |
|-------|----------------|
| Title | `ASLI — Asesoría logística, exportación e importación \| Curicó` — **OK** |
| Description | Incluye Curicó, PYMEs, fruta, importación, multimodal — **OK** (~155 chars) |
| H1 | `Asesoría logística para exportar e importar` — **OK** |
| Keywords foco | asesoría logística Curicó, exportar, importar |
| Schema | Organization + LocalBusiness + WebSite — **OK** |
| Acción | Mantener; no competir con landings de servicio en el H1 |

### `/servicios`

| Campo | Valor / nota |
|-------|----------------|
| Title | `Servicios de logística y comercio exterior \| ASLI Curicó` — **Mejorado** |
| H1 | `Servicios de logística y comercio exterior` — **Mejorado** (antes “Nuestros servicios”) |
| Rol | Hub interno → landings; no pelear keywords de una sola landing |
| Acción | Asegurar que cada tile apunte a su slug SEO |

### `/tracking`

| Campo | Valor / nota |
|-------|----------------|
| Title | `Tracking de cargas marítimas \| Seguimiento de contenedores` — **Mejorado** |
| H1 | `Tracking de cargas y contenedores` — **Mejorado** |
| Keywords | tracking cargas, seguimiento contenedores Chile |
| Acción | En GSC, mirar queries “tracking + naviera”; enriquecer copy si hay impresiones |

### `/stacking`

| Campo | Valor / nota |
|-------|----------------|
| Title | `Stacking navieras Chile \| Fechas de ingreso contenedores` — **Mejorado** |
| H1 | `Stacking de navieras en Chile` — **Mejorado** |
| Sitemap | Incluida — **Mejorado** |
| Keywords | stacking navieras Chile, fechas ingreso contenedores |
| Acción | Página con potencial utilitario real; medir CTR en GSC |

### `/stacking/pil`

| Campo | Valor / nota |
|-------|----------------|
| Indexación | `noindex` + `Disallow` en robots — **Mejorado** |
| Motivo | Visor PDF operativo, bajo valor SEO |

### `/presentacion`

| Campo | Valor / nota |
|-------|----------------|
| Title / H1 | Orientados a marca + Curicó — **Mejorado** |
| Priority sitemap | 0.5 (bajo a propósito) |
| Acción | No invertir más SEO aquí; es soporte comercial |

### Landings (`src/data/landings.js`)

| URL | Keyword principal | Title / H1 | Estado |
|-----|-------------------|------------|--------|
| `/exportacion-fruta-fresca` | exportación fruta fresca Chile | Alineados Curicó + fruta | **OK** (prioridad 1.0) |
| `/asesoria-exportadores-pymes` | asesoría exportadores PYMEs | Title con Chile + Curicó | **Mejorado** |
| `/importacion-mercancias-chile` | importación mercancías Chile | OK | **OK** |
| `/gestion-contenedores` | gestión contenedores dry/reefer | Title/H1 más específicos | **Mejorado** |
| `/transporte-aereo-carga` | carga aérea import/export | OK | **OK** |
| `/transporte-maritimo` | transporte marítimo / navieras | OK | **OK** |
| `/servicios-aduaneros` | aduanas / documental | OK | **Vigilar** vs “asesoría documental” en catálogo |
| `/asesoria-logistica-integral` | asesoría logística Curicó | Local + integral | **Vigilar** vs `/asesoria-exportadores-pymes` |

**Canibalización a vigilar:** “asesoría logística” aparece en home, `/asesoria-exportadores-pymes` y `/asesoria-logistica-integral`. Diferenciación intencional:

- PYMEs / exportadores → primera operación y acompañamiento comercial  
- Integral Curicó → multimodal + local + “todo el flujo”  
- Home → marca + captura amplia  

Si en GSC las tres pelean la misma query, reforzar el contenido de la URL ganadora y suavizar la keyword en las otras.

---

## Cambios técnicos aplicados (código)

1. `og:image:width` / `og:image:height` (1200×630) en `Seo.jsx`
2. ~~Redirect 301 `www.asli.cl` → `https://asli.cl`~~ (corregido 2026-10-02: es al revés, el primario es `www`; ver nota de arriba)
3. Sitemap: `/stacking` + `lastmod` desde `SITE.contentUpdatedAt`
4. ~~`robots.txt`: `Disallow: /stacking/pil`~~ (quitado 2026-10-02: impedía que Google leyera el `noindex`)
5. `/stacking/pil` con `noindex`
6. Titles/H1/descriptions de páginas utilitarias y hub `/servicios`
7. Footer: enlaces a aduanas + stacking
8. Landings: enlace interno a stacking; titles de PYMEs y contenedores

---

## Pendiente fuera de código (alto impacto)

1. **Google Search Console** — archivo de verificación en `public/google0d0cb5e4c0ca504e.html`. Tras desplegar: verificar propiedad en `https://www.asli.cl` (canónico Vercel), enviar sitemap `https://www.asli.cl/sitemap.xml`. Si también verificaste el apex, úsalo solo como alias.
2. **Google Business Profile** — completo + reseñas (Curicó)
3. **Redes en `SITE.sameAs`** — LinkedIn / Instagram oficiales
4. **GA4** — medición de landings y conversiones
5. **Contenido** — 3–5 guías (ej. “cómo exportar fruta”, “qué es stacking”) enlazadas a landings
6. **Directorios / gremios** — NAP consistente (nombre, dirección, teléfono)

---

## Cómo actualizar el sitemap al editar copy

1. Editar textos en `landings.js` o páginas.
2. Cambiar `contentUpdatedAt` en `src/lib/site.js` a la fecha del día (`YYYY-MM-DD`).
3. Desplegar; Search Console tomará el nuevo `lastmod` en el próximo crawl.

---

## Pasada 2026-10-02 (auditoría con 5 agentes SEO)

Cambios en código:

- **Idioma:** se quitó la detección por `navigator.language`. Googlebot renderiza en en-US y sin localStorage, así que indexaba la versión en inglés. Ahora es español salvo elección explícita (`?lang=` o el selector).
- **Contacto:** nueva página `/contacto` con formulario (`/api/contact`), WhatsApp y correo. Todos los "Cotizar" llevan ahí; se eliminaron los enlaces a Gmail web. Las landings tienen WhatsApp con el servicio ya escrito.
- **Medición:** Vercel Web Analytics + GA4 opcional (`NEXT_PUBLIC_GA_ID`). Evento `lead` / `generate_lead` por clic en WhatsApp, correo, teléfono y envío de formulario.
- **Schema:** una sola entidad `ProfessionalService` (antes Organization + LocalBusiness = dos empresas), `legalName` corregido, fundador, fundación, `alternateName`, `areaServed` "cualquier parte del mundo". Nodos WebPage enlazados por `@id`; breadcrumb igual al visible; schema en `/servicios`, `/tracking`, `/stacking`, `/presentacion` y `/contacto`.
- **Enlazado:** la tarjeta de exportación de fruta va primera en la grilla (antes solo se llegaba por el footer); se quitó la tarjeta duplicada "Asesoría documental"; el título de cada tarjeta es el enlace.
- **Rendimiento:** Fira Sans / Fira Sans Condensed con `next/font`. Antes cada página traía 417 KB de CSS de Syne/Manrope/Noto Sans SC; la home pasó de 484 KB a 68 KB. El hero se anima por CSS y se ve sin esperar al JS.
- **Bots de IA:** `robots.txt` los nombra en el grupo general; nuevo `public/llms.txt`.
- **Otros:** 404 propia en español; description de la home de 150 caracteres o menos; títulos de los hero oscuros en blanco (salían azul oscuro sobre fondo azul).

Pendiente fuera de código: `SITE.sameAs` (LinkedIn, Instagram, Google Business), activar Web Analytics en Vercel, crear GA4, Search Console + Bing Webmaster Tools, Google Business Profile.

