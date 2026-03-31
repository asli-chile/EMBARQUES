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

## Web2 no se despliega o sale “Skipped”

Revisa en **este orden** (proyecto **web2** en Vercel):

1. **Settings → Git → Production Branch**  
   El repo usa **`master`**. Si aquí está **`main`**, los pushes a `master` **no** actualizan producción. Cámbialo a **`master`** (o alinea tu rama por defecto en GitHub).

2. **Settings → Git → Ignored Build Step**  
   Si hay un comando personalizado mal puesto, puede **omitir siempre** el build (quedarás en “Skipped”). **Déjalo vacío** salvo que sepas lo que haces. Un comando típico erróneo es uno que siempre termina en código `0` (omitir).

3. **Solo cambiaste Embarques (fuera de `web2/`)**  
   Si en el futuro activas un “Ignored Build Step” que solo construye cuando cambia `web2/`, es **normal** que un push que solo toque Astro **no** redeploye web2. En ese caso usa **Deployments → … → Redeploy** en el proyecto web2 para publicar de nuevo el marketing sin cambiar código.

4. **Settings → General → Root Directory**  
   Debe ser exactamente **`web2`**.

5. **Build fallido**  
   Abre el último deployment en rojo y revisa los logs (Node, `npm ci`, errores de Next).

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

---

## 7. Traducciones / cambios en web2 que “no se ven” en producción

**Causa habitual:** el proyecto **web2** en Vercel se desplegó con `vercel deploy` (CLI) y **no está conectado a Git**. Los pushes a GitHub **no** generan un nuevo deploy; solo cambia el código en el repo.

**Qué hacer (elige una):**

1. **Conectar Git en Vercel** (recomendado): proyecto **web2** → **Settings → Git** → conectar el repo, **Root Directory = `web2`**, rama **master**. A partir de ahí, cada push que toque `web2/` despliega solo.

2. **GitHub Actions**: workflow `.github/workflows/deploy-web2.yml`. Añade en el repo (GitHub → **Settings → Secrets and variables → Actions**) los secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` (los obtienes con `vercel link` en `web2` y un token en Vercel).

**Dominio `asli.cl`:** debe estar asignado al **mismo** proyecto Vercel donde queda el deploy actual (p. ej. `web2-sigma-one`). Si el DNS apunta a otro sitio, verás una versión vieja aunque Vercel esté al día.

**Caché del navegador:** tras un deploy, prueba ventana privada o recarga forzada (Ctrl+F5). En `next.config.js` las rutas HTML usan `Cache-Control: max-age=0, must-revalidate` para reducir HTML obsoleto en CDN.
