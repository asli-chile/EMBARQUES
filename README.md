# EMBARQUES

Aplicación web para Asesorias y Servicios Logisticos Integrales Ltda. Gestión de logística, reservas, transportes, documentos y configuración.

---

## Índice

1. [Stack técnico](#stack-técnico)
2. [Inicio rápido](#inicio-rápido)
3. [Rutas y páginas](#rutas-y-páginas)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Componentes](#componentes)
6. [Configuración](#configuración)
7. [Idiomas (ES / EN)](#idiomas-es--en)
8. [Scripts](#scripts)
9. [Documentación técnica](#documentación-técnica)

---

## Stack técnico

| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| **Next.js** | 16 | Framework React con **App Router** (sistema de rutas basado en carpetas) |
| **React** | 19 | Biblioteca para interfaces de usuario |
| **TypeScript** | 5 | Lenguaje con tipos estáticos |
| **TailwindCSS** | 3 | Estilos con clases utilitarias |
| **Iconify** | 6 | Iconos (usamos el set **Typicons**) |

---

## Inicio rápido

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). La raíz redirige automáticamente a `/inicio`.

---

## Rutas y páginas

### Navegación pública (barra superior gris)

| Ruta | Descripción |
|------|-------------|
| `/inicio` | Página de inicio |
| `/servicios` | Información de servicios |
| `/sobre-nosotros` | Información de la empresa |
| `/tracking` | Seguimiento de envíos |
| `/itinerario` | Itinerarios |

### Panel lateral (menú colapsable)

| Módulo | Rutas | Descripción |
|--------|-------|-------------|
| **Dashboard** | `/dashboard` | Panel principal |
| **Registros** | `/registros` | Registros generales |
| **Reservas** | `/reservas/crear`, `/reservas/mis-reservas` | Crear reservas y ver mis reservas |
| **Transportes** | `/transportes/reserva-asli`, `/transportes/reserva-ext`, `/transportes/facturacion` | Reservas ASLI, externas y facturación |
| **Documentos** | `/documentos/mis-documentos`, `/documentos/crear-instructivo`, `/documentos/crear-proforma` | Documentos, instructivos y proformas |
| **Configuración** | `/configuracion/clientes`, `/configuracion/formatos-documentos` | Clientes y formatos de documentos |

---

## Estructura del proyecto

```
embarques/
├── app/                    → Rutas y páginas (App Router)
│   ├── layout.tsx          → Layout raíz (fuente, metadata)
│   ├── page.tsx            → Redirige a /inicio
│   ├── globals.css         → Estilos globales
│   ├── inicio/
│   ├── servicios/
│   ├── sobre-nosotros/
│   ├── tracking/
│   ├── itinerario/
│   ├── dashboard/
│   ├── registros/
│   ├── reservas/
│   ├── transportes/
│   ├── documentos/
│   └── configuracion/
├── components/
│   ├── layout/             → Header, Sidebar, NavBanner, AppShell
│   └── ui/                 → AuthIcon, AuthModal, AuthWidget
├── lib/
│   ├── site.ts             → Configuración del sitio
│   └── i18n/               → Internacionalización (ES/EN)
│       ├── translations.ts → Textos traducidos
│       ├── LocaleContext.tsx
│       └── index.ts
├── public/                 → Assets estáticos (logo, imágenes)
└── docs/                   → Documentación técnica
```

---

## Componentes

### Layout

| Componente | Tipo | Descripción |
|------------|------|-------------|
| **AppShell** | Client | Contenedor principal. Envuelve Header, NavBanner, Sidebar y el contenido. Inyecta el proveedor de idioma (LocaleProvider). |
| **Header** | Server | Cabecera fija: logo, nombre de la empresa y widget de autenticación. |
| **HeaderTitle** | Client | Muestra el nombre de la empresa según el idioma actual. |
| **NavBanner** | Client | Barra de navegación principal (enlaces públicos) + selector de idioma ES/EN. |
| **Sidebar** | Client | Menú lateral colapsable con enlaces a Dashboard, Reservas, Transportes, etc. |

### UI

| Componente | Descripción |
|------------|-------------|
| **AuthWidget** | Botón que abre el modal de perfil de usuario. |
| **AuthIcon** | Icono de auth (por defecto llave). Usa Iconify Typicons. |
| **AuthModal** | Modal con datos del usuario (nombre, email, nivel). |

---

## Configuración

Editar `lib/site.ts` para personalizar:

| Propiedad | Descripción | Ejemplo |
|-----------|-------------|---------|
| `logo` | Ruta del logo en `public/` | `"/LOGO ASLI SIN FONDO AZUL.png"` |
| `companyTitle` | Nombre de la empresa | `"Asesorias y Servicios..."` |
| `navItems` | Enlaces del NavBanner | `{ labelKey, href }` |
| `sidebarItems` | Enlaces del Sidebar (con submenús) | `{ labelKey, id, href, children? }` |
| `authIcon` | Icono Typicons para el botón de auth | `"typcn:key-outline"` |
| `user` | Datos mostrados en el modal de perfil | `{ name, email, level }` |

### Iconos de auth (Typicons)

Opciones válidas para `authIcon`:

- `typcn:key-outline` (por defecto)
- `typcn:user-outline`
- `typcn:lock-closed-outline`

---

## Idiomas (ES / EN)

- **Cambio:** Clic en **ES** o **EN** en la barra gris (NavBanner).
- **Traducciones:** `lib/i18n/translations.ts`. Objeto con claves `nav`, `sidebar`, `header`, `auth`.
- **Persistencia:** La preferencia se guarda en `localStorage` bajo la clave `embarques-locale`.
- **Uso en componentes:** Hook `useLocale()` devuelve `{ locale, setLocale, t }` donde `t` son los textos según el idioma actual.

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción (tras `build`) |
| `npm run lint` | Ejecutar ESLint |

---

## Documentación técnica

Para más detalle sobre arquitectura, flujos de datos y decisiones técnicas, ver [docs/ESTRUCTURA.md](docs/ESTRUCTURA.md).
