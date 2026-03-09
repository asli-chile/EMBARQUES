# 📋 Análisis Completo del Módulo Itinerario para Port a Astro

## 1. Resumen Ejecutivo

El módulo de itinerarios es un sistema completo para gestionar itinerarios marítimos con servicios, escalas (PODs), fechas ETD/ETA, días de tránsito, filtros, mapas y exportación a PDF. Está construido en **Next.js + React 19** con Supabase como backend.

Para portarlo a **Astro** necesitarás:
- **Astro** como framework base (SSG o SSR)
- **React** como islas/interactividad (Astro soporta React Islands)
- **Supabase** para base de datos
- **TailwindCSS** para estilos

---

## 2. Estructura de Archivos del Módulo

### 2.1 Páginas
| Archivo | Descripción |
|---------|-------------|
| `app/itinerario/page.tsx` | Página principal (app privada, requiere auth) |
| `app/itinerario-asli/page.tsx` | Vista pública (sin auth) |

### 2.2 Componentes Principales (`src/components/itinerario/`)
| Componente | Función |
|------------|---------|
| **ItinerarioFilters** | Filtros: Región, Naviera, Servicio, Semanas, POL, Vista ETA |
| **ItinerarioTable** | Tabla desktop: agrupación por servicio/región, columnas dinámicas por POD |
| **ItinerarioCard** | Vista móvil: tarjetas compactas |
| **VoyageDrawer** | Drawer lateral para editar un viaje (ETD, viaje, POL, escalas) |
| **ItinerarioMap** | Mapa interactivo con puertos (MapLibre/Mapbox) |
| **NewVoyageModal** | No usado actualmente; creación está en ItinerariosManager |

### 2.3 Componentes de Gestión (`src/components/itinerarios/`)
| Componente | Función |
|------------|---------|
| **ItinerariosManager** | Formulario crear itinerario: servicio, nave, viaje, ETD, escalas |
| **ServiciosManager** | Wrapper con tabs (deprecado, usar ServiciosUnicosManager) |
| **ServiciosUnicosManager** | CRUD servicios únicos (naviera, destinos, naves) |
| **ConsorciosManager** | CRUD consorcios (agrupación de servicios) |

### 2.4 Servicios y Librerías
| Archivo | Función |
|---------|---------|
| `src/lib/itinerarios-service.ts` | `fetchItinerarios()`, `fetchPublicItinerarios()`, `createItinerario()` |
| `src/lib/generate-itinerario-pdf.ts` | `generateItinerarioPDF()`, `generateItinerarioPDFByRegion()` (jsPDF + html2canvas) |
| `src/lib/port-coordinates.ts` | Coordenadas de puertos para el mapa |

### 2.5 Tipos
| Archivo | Tipos |
|---------|-------|
| `src/types/itinerarios.ts` | `Itinerario`, `ItinerarioEscala`, `ItinerarioWithEscalas`, `ItinerarioFilters` |

### 2.6 API Routes (Next.js)
| Ruta | Métodos | Descripción |
|------|---------|-------------|
| `/api/admin/itinerarios` | GET, POST | Listar y crear (auth) |
| `/api/public/itinerarios` | GET | Listar público (sin auth) |
| `/api/admin/servicios-unicos` | GET | Servicios únicos |
| `/api/admin/consorcios` | GET | Consorcios |

---

## 3. Modelo de Datos

### 3.1 Tabla `itinerarios`
```sql
id, servicio, consorcio, naviera, nave, viaje, semana, pol, etd,
created_at, updated_at, created_by, updated_by, servicio_id
```

### 3.2 Tabla `itinerario_escalas`
```sql
id, itinerario_id, puerto, puerto_nombre, eta, dias_transito, orden, area
```

### 3.3 Tablas relacionadas
- `servicios_unicos` – servicios con naviera, destinos, naves
- `consorcios` – agrupación de servicios
- `consorcios_servicios` – relación consorcio ↔ servicios_unicos
- `catalogos_navieras`, `catalogos_naves`, `catalogos_destinos` – catálogos

---

## 4. Dependencias NPM Críticas

```json
{
  "@supabase/supabase-js": "^2.76.1",
  "react": "^19.2.3",
  "react-dom": "^19.2.3",
  "lucide-react": "^0.548.0",
  "jspdf": "^3.0.3",
  "html2canvas": "^1.4.1",
  "maplibre-gl": "^5.11.0",
  "react-map-gl": "^8.1.0",
  "tailwindcss": "^3.4.17"
}
```

---

## 5. Contextos y Hooks Requeridos

| Dependencia | Uso |
|-------------|-----|
| `ThemeContext` | Tema claro/oscuro |
| `useUser` | Usuario actual, permisos (admin/ejecutivo/cliente) |
| `useToast` | Notificaciones success/error |
| `createClient` (Supabase) | Cliente del navegador |

---

## 6. Lógica de Negocio Principal

### 6.1 Filtrado
- **ETD >= hoy** cuando no hay filtros manuales
- **Semanas**: N viajes por servicio
- Filtros: servicio, consorcio, pol, región
- Puerto seleccionado en mapa aplica filtro

### 6.2 Agrupación
- Por servicio normalizado (ej. "ANDES EXPRESS/AX1" → "ANDES EXPRESS")
- Por región (ASIA, EUROPA, AMERICA, INDIA-MEDIOORIENTE)
- Escalas ordenadas por ETA del primer viaje del servicio

### 6.3 Cálculo de días de tránsito
- `calcularDiasTransito(etd, eta)` en zona horaria local
- Al cambiar ETD se recalculan automáticamente

### 6.4 Creación de itinerario (POST)
- Si existe primer viaje del mismo servicio → ETA calculadas sumando días al primer viaje
- Si no → se usan las escalas del payload

---

## 7. Flujos de Usuario

1. **Ver itinerarios**: GET → filtrar → mostrar tabla/cards
2. **Crear**: Modal ItinerariosManager → POST → recargar
3. **Editar**: Drawer VoyageDrawer → UPDATE itinerarios + DELETE/INSERT escalas
4. **Eliminar**: DELETE itinerarios (CASCADE escalas)
5. **PDF**: Capturar tabla con html2canvas → jsPDF por región

---

## 8. Adaptación para Astro

### 8.1 Estrategia recomendada
- **Astro** como shell: layouts, rutas estáticas/SSR
- **React Islands** para los componentes interactivos (filtros, tabla, drawer, mapa, modales)
- **API routes**: usar Astro endpoints (`src/pages/api/...`) o un servidor separado (Next, Express, etc.)

### 8.2 Cambios necesarios
1. **Rutas API**: Crear endpoints en Astro o desplegar un microservicio Next/Express para las mismas rutas.
2. **Supabase**: Configurar cliente en Astro (SSR vs browser).
3. **Auth**: Middleware de Astro o Supabase auth en cliente.
4. **`NEXT_PUBLIC_API_URL`**: Sustituir por `import.meta.env.PUBLIC_API_URL` o variable de entorno equivalente.
5. **`useRouter`**: En Astro usar navegación manual o `astro:client` para redirecciones.

### 8.3 Componentes que requieren `'use client'` (React Islands)
- ItinerarioFilters
- ItinerarioTable
- ItinerarioCard
- VoyageDrawer
- ItinerarioMap
- ItinerariosManager
- ServiciosUnicosManager
- ConsorciosManager

La página principal puede ser una página Astro que importa estos componentes con `client:load` o `client:visible`.

---

## 9. Scripts SQL Requeridos (orden de ejecución)

1. `create-itinerarios-table.sql`
2. `add-naviera-itinerarios.sql` (columna naviera en itinerarios)
3. `add-area-to-itinerario-escalas.sql` (columna area en escalas)
4. `create-servicios-unicos-table.sql`
5. `create-consorcios-table.sql`
6. `create-catalogos-destinos-table.sql`
7. `create-servicios-table.sql` (si usas el esquema completo)
8. `create-catalogos-destinos-table.sql`

---

## 10. Checklist de Port

- [ ] Crear proyecto Astro con integración React
- [ ] Instalar dependencias (Supabase, lucide-react, jspdf, html2canvas, maplibre, react-map-gl)
- [ ] Configurar Tailwind
- [ ] Copiar tipos `itinerarios.ts`
- [ ] Copiar `itinerarios-service.ts` y ajustar URLs
- [ ] Copiar `port-coordinates.ts`
- [ ] Copiar `generate-itinerario-pdf.ts`
- [ ] Crear API routes en Astro o servidor externo
- [ ] Copiar componentes (con client directives)
- [ ] Implementar ThemeContext y useToast (o alternativa)
- [ ] Crear layout de página
- [ ] Ejecutar scripts SQL en Supabase
- [ ] Configurar variables de entorno (Supabase URL, keys, API URL)
