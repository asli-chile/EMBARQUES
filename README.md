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
| **Astro** | 5 | Framework base para páginas (SSR, cero JS por defecto) |
| **React** | 19 | Componentes interactivos (AuthWidget, Sidebar, formularios) |
| **TypeScript** | 5 | Lenguaje con tipos estáticos |
| **TailwindCSS** | 3 | Estilos con clases utilitarias |
| **Supabase** | - | Backend: base de datos y autenticación (email/contraseña) |
| **Iconify** | 5 | Iconos (usamos el set **Typicons**) |
| **Yarn** | 4 (PnP) | Gestor de paquetes con Plug'n'Play |

---

## Inicio rápido

```bash
# Opción A: Yarn 4 con PnP (recomendado)
corepack enable   # Habilitar una vez (puede requerir permisos de administrador)
yarn install
yarn dev

# Opción B: npm
npm install
npx astro dev
```

Abrir [http://localhost:4321](http://localhost:4321). La raíz redirige automáticamente a `/inicio`.

### Autenticación (Supabase)

1. Copiar `.env.example` a `.env`.
2. Crear un proyecto en [Supabase](https://supabase.com) y obtener la URL y la clave anon.
3. Configurar las variables `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`.
4. Rutas de auth: `/auth/login` y `/auth/registro`. Si Supabase no está configurado, el `AuthWidget` usa datos de ejemplo.

---

## Rutas y páginas

### Autenticación

| Ruta | Descripción |
|------|-------------|
| `/auth/login` | Iniciar sesión |
| `/auth/registro` | Crear cuenta |

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
├── src/
│   ├── pages/              → Rutas (file-based routing)
│   │   ├── index.astro     → Redirige a /inicio
│   │   ├── inicio.astro
│   │   ├── auth/login.astro
│   │   ├── auth/registro.astro
│   │   ├── reservas/
│   │   ├── transportes/
│   │   ├── documentos/
│   │   └── configuracion/
│   ├── layouts/            → BaseLayout, AuthLayout
│   ├── components/
│   │   ├── layout/         → Header, Sidebar, NavBanner, AppShell
│   │   ├── ui/             → AuthIcon, AuthModal, AuthWidget
│   │   └── auth/           → LoginForm, RegistroForm, AuthFormWrapper
│   ├── lib/
│   │   ├── brand.ts
│   │   ├── site.ts
│   │   ├── supabase/       → Cliente Supabase (browser, server)
│   │   └── i18n/
│   └── styles/
│       └── globals.css
├── public/                 → Assets estáticos (logo, imágenes)
├── astro.config.mjs
├── .yarnrc.yml             → Yarn PnP
└── docs/
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
| **AuthWidget** | Si no hay sesión: enlace "Iniciar sesión" a `/auth/login`. Si hay sesión: botón que abre el modal de perfil. Integrado con Supabase Auth. |
| **AuthIcon** | Icono de auth (por defecto llave). Usa Iconify Typicons. |
| **AuthModal** | Modal con datos del usuario (nombre, email, nivel) y botón "Cerrar sesión". |

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
| `yarn dev` | Servidor de desarrollo (puerto 4321) |
| `yarn build` | Build de producción (SSR) |
| `yarn preview` | Vista previa del build |
| `yarn lint` | Ejecutar ESLint |

---

## Documentación técnica

| Documento | Descripción |
|-----------|-------------|
| [docs/ESTRUCTURA.md](docs/ESTRUCTURA.md) | Arquitectura, flujos de datos y decisiones técnicas |
| [docs/ESTILOS-VISUALES.md](docs/ESTILOS-VISUALES.md) | Estándares visuales: colores, tipografía, componentes UI y layout |
