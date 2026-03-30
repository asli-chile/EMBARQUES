# Despliegue en Vercel: Embarques y Web2 por separado

El repositorio tiene **dos aplicaciones** que se despliegan como **dos proyectos distintos** en Vercel (mismo repo Git, distinta raíz de build).

| Proyecto | Carpeta raíz en Vercel | Framework | Comando de build |
|----------|------------------------|-----------|------------------|
| **Embarques** (Astro) | `/` (raíz del repo) | Astro | `astro build` |
| **Web2** (marketing) | `web2` | Next.js | `npm run build` |

## 1. Proyecto Embarques (Astro)

1. En [Vercel](https://vercel.com) → **Add New** → **Project** → importar el repositorio.
2. **Root Directory**: dejar vacío o `.` (raíz del repo).
3. **Framework Preset**: Astro (Vercel detecta `vercel.json` y `astro.config.mjs`).
4. **Build & Output**: usar el `vercel.json` de la raíz (`buildCommand: astro build`).
5. Variables de entorno: copiar desde `.env.example` (Supabase `PUBLIC_*`, etc.) en **Settings → Environment Variables**.

La app usa `base: "/embarques"` en `astro.config.mjs`, así que en producción la URL pública incluye el prefijo `/embarques` (por ejemplo `https://tu-proyecto.vercel.app/embarques/inicio` o `https://asli.cl/embarques/inicio` si enlazas un dominio con esa ruta).

## 2. Proyecto Web2 (Next.js)

1. **Add New** → **Project** → **mismo repositorio** (segundo proyecto).
2. **Root Directory**: `web2` (obligatorio).
3. **Framework Preset**: Next.js.
4. **Build**: `npm run build` (definido en `web2/vercel.json`).
5. Variables de entorno mínimas para enlazar al Embarques desplegado aparte — ver `web2/.env.example`.

### Variables recomendadas (Web2)

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_ERP_URL` | URL pública del sitio marketing (este proyecto web2), sin barra final. Ej: `https://www.asli.cl` |
| `NEXT_PUBLIC_EMBARQUES_BASE_URL` | URL **completa** de la base del sistema Astro, incluyendo `/embarques`. Ej: `https://embarques-xxx.vercel.app/embarques` o `https://asli.cl/embarques` si el dominio del Astro apunta ahí |

Si no defines `NEXT_PUBLIC_EMBARQUES_BASE_URL`, se usa `{NEXT_PUBLIC_ERP_URL}/embarques` (mismo dominio, ruta `/embarques`).

## 3. Dominios y Supabase

- Si Web2 y Embarques viven en **dominios o subdominios distintos**, en **Supabase → Authentication → URL Configuration** debes añadir las **Redirect URLs** y **Site URL** que correspondan a ambos orígenes.
- CORS y cookies dependen de esa configuración; prueba login y callbacks tras cada cambio de dominio.

## 4. Despliegue por CLI (opcional)

```bash
# Embarques (desde la raíz del repo)
npx vercel

# Web2 (indicando carpeta)
cd web2
npx vercel
```

Cada carpeta puede tener su propio enlace de proyecto Vercel (`.vercel` está en `.gitignore`).

## 5. Build local de comprobación

```bash
# Raíz: Embarques
npm ci
npm run build

# Web2
npm run build:web2
```

El script `build:web2` está definido en el `package.json` de la raíz.

## 6. Archivos legacy

- `web2/vercel.proxy-legacy.json`: configuración antigua de rewrites; el despliegue actual usa `web2/vercel.json` y `next.config.js`. No sustituye la configuración del proyecto en el dashboard.
