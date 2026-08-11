# ASLI Web — Sitio público

Sitio oficial de **ASLI** (Asesorías y Servicios Logísticos Integrales Ltda.).

**Ubicación:** Longitudinal Sur Km. 186, 3340000 Curicó, Maule

## Stack

- Next.js 14 (Pages Router)
- React 18
- Tailwind CSS 3
- Design DNA: [`design-dna.json`](./design-dna.json)

## Desarrollo

El landing vive en esta carpeta (`ASLI/web`), **no** en la raíz de `ASLI` (esa es el ERP y redirige a `/auth`).

```bash
cd web
npm install
npm run dev
```

Abre `http://localhost:3000` (o el puerto que indique la terminal).

> Si ya tienes el ERP corriendo en el 3000, usa otro puerto:
> `npm run dev -- -p 3002`

## Build

```bash
npm run build
npm start
```

## Design DNA

El rediseño sigue el flujo de [design-dna](https://github.com/zanwei/design-dna):

| Dimensión | En este proyecto |
|-----------|------------------|
| **design_system** | Tokens en `design-dna.json` → CSS vars en `src/index.css` + Tailwind |
| **design_style** | Logística moderna: brand-first, servicios como eje, tipografía Syne + Manrope |
| **visual_effects** | CSS-only: hero entrance, scroll fade-up, hover de imagen, grain sutil |

Skill instalada en el monorepo ASLI:

- `.agents/skills/design-dna/`
- `.cursor/skills/design-dna/`

### Paleta

| Token | Hex | Uso |
|-------|-----|-----|
| `asli-light` | `#F6EEE8` | Fondo página |
| `asli-primary` | `#007A7B` | CTAs, acentos |
| `asli-secondary` | `#003F5A` | Franjas profundas |
| `asli-dark` | `#11224E` | Navy institucional |
| `asli-accent` | `#669900` | Énfasis / slogan |

### Tipografía

- **Display:** Syne
- **Body:** Manrope

### Estructura Home

1. Hero full-bleed (marca + CTA)
2. Servicios (editorial rows)
3. Confianza (clientes / partners / navieras)
4. Contacto / ubicación
5. Footer

## Páginas

- `/` — Home
- `/servicios` — Catálogo + equipo de contacto
- `/tracking` — Tracking
- `/presentacion` — Presentación
