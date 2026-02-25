# Estructura técnica - EMBARQUES

Documentación detallada para desarrolladores. Describe la arquitectura, flujos y decisiones técnicas del proyecto.

---

## Índice

1. [Arquitectura general](#arquitectura-general)
2. [App Router y rutas](#app-router-y-rutas)
3. [Layout y providers](#layout-y-providers)
4. [Internacionalización (i18n)](#internacionalización-i18n)
5. [Configuración del sitio](#configuración-del-sitio)
6. [Client vs Server Components](#client-vs-server-components)

---

## Arquitectura general

El proyecto usa **Next.js 16** con **App Router**. La estructura es:

```
app/layout.tsx (root)
    └── AppShell
            ├── LocaleProvider (contexto de idioma)
            ├── Header
            ├── NavBanner
            ├── Sidebar
            └── {children}  ← contenido de cada página
```

- **layout.tsx**: Define la fuente (Open Sans), metadata y el contenedor `AppShell`.
- **AppShell**: Componente client que renderiza Header, NavBanner, Sidebar y envuelve todo con `LocaleProvider`.
- **LocaleProvider**: Contexto de React que expone `locale`, `setLocale` y `t` (traducciones) a los componentes hijos.

---

## App Router y rutas

Next.js App Router usa **convención sobre configuración**: cada carpeta dentro de `app/` con un `page.tsx` se convierte en una ruta.

| Patrón | Ruta resultante | Ejemplo |
|--------|-----------------|---------|
| `app/inicio/page.tsx` | `/inicio` | Página de inicio |
| `app/reservas/crear/page.tsx` | `/reservas/crear` | Crear reserva |
| `app/page.tsx` | `/` | Raíz (en este proyecto redirige a `/inicio`) |

No existe carpeta `pages/`. Todo el enrutado está en `app/`.

---

## Layout y providers

### Layout raíz (`app/layout.tsx`)

- **Server Component** por defecto.
- Aplica la fuente Open Sans mediante `next/font/google`.
- Define `metadata` (title, description) para SEO.
- Renderiza `<AppShell>{children}</AppShell>`.

### AppShell (`components/layout/AppShell.tsx`)

- **Client Component** (`"use client"`).
- Orquesta Header, NavBanner, Sidebar y el área de contenido.
- Envuelve todo en `LocaleProvider` para que cualquier hijo pueda usar `useLocale()`.
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
| `lib/i18n/translations.ts` | Objeto con textos en `es` y `en`. Claves: `nav`, `sidebar`, `header`, `auth`. |
| `lib/i18n/LocaleContext.tsx` | Contexto React que guarda el idioma y las traducciones actuales. |
| `lib/i18n/index.ts` | Barrel export: `LocaleProvider`, `useLocale`, tipo `Locale`. |

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

`lib/site.ts` centraliza la configuración editable:

- **navItems**: Enlaces del NavBanner. Cada item tiene `labelKey` (clave en translations) y `href`.
- **sidebarItems**: Estructura anidada. Items sin hijos son enlaces directos; items con `children` son submenús colapsables.
- **user**: Datos estáticos del modal de perfil (hasta integrar autenticación real).

---

## Client vs Server Components

| Componente | Tipo | Motivo |
|------------|------|--------|
| `layout.tsx` | Server | No requiere interactividad. |
| `Header` | Server | Solo renderizado estático. |
| `HeaderTitle` | Client | Usa `useLocale()`. |
| `NavBanner` | Client | Usa `useLocale()`, `usePathname()`, eventos. |
| `Sidebar` | Client | Estado colapsado, `useLocale()`, eventos. |
| `AppShell` | Client | Compositor que incluye `LocaleProvider`. |
| `AuthWidget`, `AuthModal` | Client | Estado del modal, eventos. |
| `AuthIcon` | Client | Props dinámicas. |

**Regla:** Server Components por defecto; Client Components solo cuando hacen falta hooks (`useState`, `useContext`, etc.) o manejadores de eventos.
