# Auditoría SEO — Sitio público ASLI (`web2`)

Documento de referencia tras la auditoría de títulos, H1, descriptions y keywords.
Última revisión: **2026-09-06**.

**Canónico:** `https://asli.cl`  
**Sitemap:** `https://asli.cl/sitemap.xml`  
**Fecha editorial sitemap:** `SITE.contentUpdatedAt` en `src/lib/site.js` (actualizar al editar textos SEO).

---

## Resumen ejecutivo

| Área | Estado |
|------|--------|
| Meta + Open Graph + Twitter | OK (`Seo.jsx`) |
| Canonical apex | OK + redirect `www` → `asli.cl` |
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
2. Redirect 301 `www.asli.cl` → `https://asli.cl`
3. Sitemap: `/stacking` + `lastmod` desde `SITE.contentUpdatedAt`
4. `robots.txt`: `Disallow: /stacking/pil`
5. `/stacking/pil` con `noindex`
6. Titles/H1/descriptions de páginas utilitarias y hub `/servicios`
7. Footer: enlaces a aduanas + stacking
8. Landings: enlace interno a stacking; titles de PYMEs y contenedores

---

## Pendiente fuera de código (alto impacto)

1. **Google Search Console** — archivo de verificación en `public/google0d0cb5e4c0ca504e.html`. Tras desplegar: verificar propiedad, preferir canónico `https://asli.cl` (o propiedad de dominio), enviar sitemap, revisar consultas. Si solo verificaste `www`, añade también el apex.
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
