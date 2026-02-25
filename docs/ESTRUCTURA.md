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
            ├── LocaleProvider (contexto de idioma)
            ├── Header
            ├── NavBanner
            ├── Sidebar
            └── {children}  ← contenido de cada página
```

- **BaseLayout.astro**: Define la fuente (Open Sans), metadata y el contenedor `AppShell`. Entrega el pathname actual para rutas de auth.
- **AppShell**: Componente React que renderiza Header, NavBanner, Sidebar y envuelve todo con `LocaleProvider`.
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
- Recibe `pathname` para detectar rutas de auth y ocultar Header/Sidebar en login/registro.
- Orquesta Header, NavBanner, Sidebar y el área de contenido.
- Envuelve todo en `LocaleProvider`.
- Layout flex: Header arriba, NavBanner debajo, Sidebar + contenido ocupando el resto.

### Flujo de datos

1. `siteConfig` (lib/site.ts) define `navItems` y `sidebarItems`.
2. `Header`, `NavBanner` y `Sidebar` importan `siteConfig` y lo usan para renderizar enlaces.
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

- **navItems**: Enlaces del NavBanner. Cada item tiene `labelKey` (clave en translations) y `href`.
- **sidebarItems**: Estructura anidada. Items sin hijos son enlaces directos; items con `children` son submenús colapsables.
- **user**: Datos estáticos del modal de perfil (hasta integrar autenticación real).

---

## Astro vs React (islas)

| Componente | Tipo | Motivo |
|------------|------|--------|
| `BaseLayout.astro`, páginas `.astro` | Astro (estático) | Zero JS, renderizado en servidor. |
| `Header` | React (dentro de AppShell) | Usa AuthWidget, HeaderTitle. |
| `HeaderTitle` | React | Usa `useLocale()`. |
| `NavBanner` | React | Usa `useLocale()`, recibe `pathname` como prop. |
| `Sidebar` | React | Estado colapsado, `useLocale()`, eventos. |
| `AppShell` | React (`client:load`) | Compositor que incluye `LocaleProvider`. |
| `AuthWidget`, `AuthModal` | React | Estado del modal, Supabase, eventos. |
| `LoginForm`, `RegistroForm` | React (`client:load`) | Formularios con `fetch` a API auth. |

**Regla:** Páginas Astro por defecto (cero JS); componentes React con `client:load` solo donde se necesita interactividad (hooks, eventos, Supabase).
