# Despliegue en Vercel: Embarques y Web2 por separado

## Importante: por qué solo ves Embarques

En Vercel, **cada proyecto está ligado a una sola carpeta de build**. Si importaste el repositorio **una vez** y dejaste la raíz en `/`, solo se despliega **Embarques** (Astro). La carpeta `web2` **no se construye sola**: no hay forma de que un único proyecto despliegue las dos apps a la vez.

**Para tener Web2 en producción debes crear un segundo proyecto en Vercel** con el mismo repo Git y **Root Directory = `web2`**.

---

## Resumen rápido

| Qué quieres | Qué necesitas en Vercel |
|-------------|-------------------------|
| Solo Embarques (Astro) | 1 proyecto, raíz del repo (`.`) |
| Embarques + sitio marketing (Web2) | **2 proyectos**: uno en la raíz y **otro con raíz `web2`** |

| Proyecto | Root Directory en Vercel | Framework | Build |
|----------|-------------------------|-----------|--------|
| **Embarques** | vacío o `.` | Astro | `astro build` |
| **Web2** | **`web2`** (exactamente) | Next.js | `npm run build` |

---

## Crear el proyecto Web2 (paso a paso)

1. Entra a [vercel.com](https://vercel.com) → **Add New…** → **Project**.
2. Elige **el mismo repositorio Git** que ya usas para Embarques (Import si hace falta).
3. Antes de pulsar **Deploy**, abre **Root Directory** (a veces “Configure” o un lápiz junto al nombre del proyecto).
4. Pulsa **Edit** → selecciona la carpeta **`web2`** del monorepo y confirma.
5. Comprueba que el framework sea **Next.js** y el comando de build **`npm run build`** (coincide con `web2/vercel.json`).
6. **Deploy**.

Tras esto tendrás **dos URLs distintas** (por ejemplo `embarques-xxx.vercel.app` y `asli-web-xxx.vercel.app`). En el proyecto Web2, en **Settings → Environment Variables**, configura `NEXT_PUBLIC_ERP_URL` y, si Embarques está en otro dominio, `NEXT_PUBLIC_EMBARQUES_BASE_URL` (ver más abajo).

Documentación oficial (monorepos): [Vercel — Monorepos](https://vercel.com/docs/monorepos).

---

## 1. Proyecto Embarques (Astro)

1. **Root Directory**: raíz del repo (sin subcarpeta).
2. **Build**: `astro build` (definido en `vercel.json` de la raíz).
3. Variables: según `.env.example` (Supabase `PUBLIC_*`, etc.).

La app usa `base: "/embarques"` en `astro.config.mjs`: la URL pública incluye `/embarques` (ej. `https://tu-proyecto.vercel.app/embarques/inicio`).

---

## 2. Proyecto Web2 (Next.js)

- **Root Directory**: obligatorio **`web2`**.
- **Install**: `npm ci` y **Build**: `npm run build` (`web2/vercel.json`).
- Plantilla de variables: `web2/.env.example`.

### Variables recomendadas (Web2)

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_ERP_URL` | URL pública **de este** despliegue Web2, sin barra final. Ej: `https://www.asli.cl` o la URL `*.vercel.app` del proyecto Web2. |
| `NEXT_PUBLIC_EMBARQUES_BASE_URL` | URL **completa** del Astro con `/embarques`. Ej: `https://tu-proyecto-astro.vercel.app/embarques`. Si Web2 y Embarques comparten dominio con rutas `/` y `/embarques`, puedes omitirla y se usará `{NEXT_PUBLIC_ERP_URL}/embarques`. |

---

## 3. Dominios y Supabase

Si Web2 y Embarques usan **dominios distintos**, en **Supabase → Authentication → URL Configuration** añade las **Redirect URLs** y **Site URL** de ambos orígenes.

---

## 4. CLI (opcional)

```bash
# Embarques (desde la raíz del repo)
npx vercel

# Web2 (solo esta carpeta; crea/enlaza otro proyecto Vercel)
cd web2
npx vercel
```

La carpeta `web2` debe enlazarse a **su propio** proyecto Vercel (no al de Embarques).

---

## 5. Build local

```bash
npm ci && npm run build          # Embarques
npm run build:web2               # Web2 (desde la raíz del repo)
```

---

## 6. Archivos legacy

- `web2/vercel.proxy-legacy.json`: antiguo; el despliegue usa `web2/vercel.json` y `next.config.js`.
