# Estructura técnica - EMBARQUES

Documentación detallada para desarrolladores. Describe la arquitectura, flujos y decisiones técnicas del proyecto.

---

## Índice

1. [Arquitectura general](#arquitectura-general)
2. [Rutas (file-based routing)](#rutas-file-based-routing)
3. [Layout y providers](#layout-y-providers)
4. [Internacionalización (i18n)](#internacionalización-i18n)
5. [Configuración del sitio](#configuración-del-sitio)
6. [Astro vs React (islas)](#astro-vs-react-islas)

---

## Arquitectura general

El proyecto usa **Astro 5** como framework base con **React** para componentes interactivos. La estructura es:

```
src/layouts/BaseLayout.astro
    └── AppShell (React, client:load)
            ├── LocaleProvider / AuthProvider / …
            ├── AppIconRail (rail navy)
            ├── Header (compact, sobre el contenido)
            └── {children}  ← contenido de cada página
```

- **BaseLayout.astro**: Define la fuente (Open Sans), metadata, loader pre-hidratación (rail + fondo de ruta) y el contenedor `AppShell`.
- **AppShell**: Componente React que monta el chrome único del ERP (`AppIconRail` + `Header` compacto) y envuelve todo con providers.
- **LocaleProvider**: Contexto de React que expone `locale`, `setLocale` y `t` (traducciones) a los componentes hijos.

---

## Rutas (file-based routing)

Astro usa **convención sobre configuración**: cada archivo en `src/pages/` se convierte en una ruta.

| Patrón | Ruta resultante | Ejemplo |
|--------|-----------------|---------|
| `src/pages/inicio.astro` | `/inicio` | Página de inicio |
| `src/pages/reservas/crear.astro` | `/reservas/crear` | Crear reserva |
| `src/pages/index.astro` | `/` | Raíz (redirige a `/inicio`) |

Las rutas de autenticación usan API en `src/pages/api/auth/` (login, signup, signout).

---

## Layout y providers

### Layout raíz (`src/layouts/BaseLayout.astro`)

- Archivo **Astro** (zero JS por defecto).
- Aplica la fuente Open Sans mediante Google Fonts.
- Define `title` y `description` para SEO.
- Renderiza `<AppShell client:load pathname={pathname}><slot /></AppShell>`.

### AppShell (`src/components/layout/AppShell.tsx`)

- **Componente React** con `client:load` (se hidrata en el cliente).
- Recibe `pathname` para elegir el contenido de cada ruta.
- Orquesta `AppIconRail`, `Header` compacto y el área de contenido.
- Envuelve todo en providers (`Locale`, `Auth`, notificaciones, etc.).
- Layout flex: rail a la izquierda; columna derecha con header overlay + contenido.

### Flujo de datos

1. `siteConfig` (`lib/site.ts`) define `sidebarItems` (menú del rail).
2. `AppIconRail` filtra ítems con `getVisibleSidebarItems` según rol.
3. Los textos visibles vienen de `translations` vía `useLocale().t` según el idioma activo.

---

## Internacionalización (i18n)

### Archivos

| Archivo | Rol |
|---------|-----|
| `src/lib/i18n/translations.ts` | Objeto con textos en `es` y `en`. Claves: `nav`, `sidebar`, `header`, `auth`. |
| `src/lib/i18n/LocaleContext.tsx` | Contexto React que guarda el idioma y las traducciones actuales. |
| `src/lib/i18n/index.ts` | Barrel export: `LocaleProvider`, `useLocale`, tipo `Locale`. |

### Uso

```tsx
const { locale, setLocale, t } = useLocale();

// Cambiar idioma
setLocale("en");

// Obtener texto traducido
t.nav.inicio  // "INICIO" o "HOME" según locale
```

### Persistencia

- Al montar, `LocaleContext` lee `localStorage.getItem("embarques-locale")`.
- Al cambiar idioma, guarda con `localStorage.setItem("embarques-locale", locale)`.

---

## Configuración del sitio

`src/lib/site.ts` centraliza la configuración editable:

- **sidebarItems**: Estructura anidada del rail. Items sin hijos son enlaces directos; items con `children` son submenús.
- Flags por ítem (`staffOnly`, `operational`, `adminAndAbove`, etc.) controlan visibilidad por rol.

---

## Astro vs React (islas)

| Componente | Tipo | Motivo |
|------------|------|--------|
| `BaseLayout.astro`, páginas `.astro` | Astro (estático) | Zero JS, renderizado en servidor. |
| `Header` | React (dentro de AppShell) | Controles de sesión, idioma, tema, notificaciones. |
| `AppIconRail` | React | Navegación ERP; filtra por rol. |
| `AppShell` | React (`client:load`) | Compositor + providers + rutas lazy. |
| `AuthWidget`, `AuthFormModalOverlay` | React | Estado del modal, Supabase, eventos. |
| `LoginForm`, `RegistroForm` | React | Formularios con `fetch` a API auth. |

**Regla:** Páginas Astro por defecto (cero JS); componentes React con `client:load` solo donde se necesita interactividad (hooks, eventos, Supabase).
