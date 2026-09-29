import { siteConfig } from "@/lib/site";
import { brand } from "@/lib/brand";
import { withBase } from "@/lib/basePath";
import { AuthWidget } from "@/components/ui/AuthWidget";
import { OnlineUsersButton } from "@/components/ui/OnlineUsersButton";
import { VisitCounterBadge } from "@/components/ui/VisitCounterBadge";
import { NotificationsBell } from "@/components/ui/NotificationsBell";
import { NeonThemeToggle } from "@/components/ui/NeonThemeToggle";
import { LocaleToggle } from "./LocaleToggle";
import { HeaderChrome } from "./HeaderChrome";
import { ViewAsControl } from "./ViewAsControl";
import { AppMobileNav } from "./AppMobileNav";
import { ClaudeUsoIndicator } from "./ClaudeUsoIndicator";
import { DeployIndicator } from "./DeployIndicator";
import { useLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import { resolveSidebarLabel } from "@/lib/sidebarFilter";

/**
 * Rutas cuyo título se muestra en la barra superior, a la izquierda.
 *
 * El valor es la clave de `t.sidebar`, no un texto suelto: el nombre de la
 * barra y el del menú tienen que ser el mismo, o la pantalla a la que se
 * llegó parecería otra distinta de la que se eligió.
 */
const TITULOS_DE_BARRA: Record<string, string> = {
  "/dashboardcliente": "dashboardCliente",
};

type ItemMenu = { labelKey: string; href?: string; children?: ItemMenu[] };

/**
 * Sección del menú a la que pertenece la ruta, con su grupo si lo tiene.
 * Gana el `href` más largo que calce, así `/transportes/papelera` es la
 * papelera de transportes y no otra cosa que empiece igual.
 */
function seccionDeRuta(pathname: string): { grupo: string | null; seccion: string } | null {
  let mejor: { grupo: string | null; seccion: string; largo: number } | null = null;
  const visitar = (items: readonly ItemMenu[], grupo: string | null) => {
    for (const item of items) {
      if (item.children) visitar(item.children, item.labelKey);
      if (!item.href) continue;
      const calza = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (calza && (!mejor || item.href.length > mejor.largo)) {
        mejor = { grupo, seccion: item.labelKey, largo: item.href.length };
      }
    }
  };
  visitar(siteConfig.sidebarItems as readonly ItemMenu[], null);
  return mejor;
}

/**
 * Dónde está el usuario: "Grupo › Sección", con los mismos nombres del menú
 * (para un cliente, "Solicitar reserva" en vez de "Crear reserva"). Antes solo
 * se mostraba en `/dashboardcliente`, y en el resto de las pantallas la única
 * pista era el ícono resaltado del rail.
 */
function HeaderRouteTitle({ pathname }: { pathname: string }) {
  const { t } = useLocale();
  const { isCliente } = useAuth();
  const ruta = pathname.replace(/\/$/, "") || "/";
  const sidebar = t.sidebar as Record<string, string>;

  const fija = TITULOS_DE_BARRA[ruta];
  const encontrada = fija ? { grupo: null, seccion: fija } : seccionDeRuta(ruta);
  if (!encontrada) return null;
  const titulo = resolveSidebarLabel(encontrada.seccion, sidebar, isCliente);
  if (!titulo) return null;
  const grupo = encontrada.grupo ? sidebar[encontrada.grupo] : null;

  return (
    <span className="ml-1 flex min-w-0 max-w-[46vw] items-baseline gap-2 md:ml-3 md:max-w-[520px]">
      {grupo && (
        <>
          <span className="hidden truncate text-base font-semibold text-white/55 md:inline">{grupo}</span>
          <span className="hidden text-lg text-white/35 md:inline" aria-hidden>
            ›
          </span>
        </>
      )}
      <span className="truncate text-base font-extrabold tracking-tight text-white md:text-xl" aria-current="page">
        {titulo}
      </span>
    </span>
  );
}

/**
 * Barra superior del ERP (siempre compacta sobre el rail navy).
 * El Header claro + título centrado del chrome antiguo ya no existe.
 */
export function Header({ pathname = "" }: { pathname?: string } = {}) {
  const tone = "dark" as const;

  return (
    <HeaderChrome compact tone={tone}>
      <div className="asli-no-drag relative z-10 flex items-center gap-1 justify-self-start">
        {/* En teléfono, la izquierda es del menú: es lo que más se toca. */}
        <AppMobileNav pathname={pathname} />
        {/*
          * Los contadores son de escritorio. Miden la actividad del sitio, se
          * consultan de vez en cuando y en 390 px empujaban al logo encima de
          * los controles de la derecha.
          */}
        <div className="hidden md:flex md:items-center md:gap-1">
          <VisitCounterBadge tone={tone} />
          <OnlineUsersButton tone={tone} />
        </div>
        <HeaderRouteTitle pathname={pathname} />
      </div>

      <div className="relative flex h-full min-w-0 items-center justify-self-center">
        {/* Fuera del flujo: el logo tiene que seguir centrado aparezca o no. */}
        {/* w-max: absoluto, heredaría el ancho del logo y partiría el texto en dos líneas. */}
        <div className="absolute right-full top-1/2 w-max -translate-y-1/2">
          <ClaudeUsoIndicator />
        </div>
        <div className="h-full w-4 shrink-0 self-stretch" data-tauri-drag-region aria-hidden />
        <a
          href={withBase("/inicio")}
          className="asli-no-drag relative z-10 flex h-12 items-center"
          aria-label="ASLI ERP"
          title="Inicio"
        >
          <img
            src={brand.logoWhite}
            alt={siteConfig.companyTitle}
            className="h-full w-auto max-w-[130px] object-contain sm:max-w-[220px]"
            loading="eager"
            decoding="async"
          />
        </a>
        <div className="h-full w-4 shrink-0 self-stretch" data-tauri-drag-region aria-hidden />
        <div className="absolute left-full top-1/2 w-max -translate-y-1/2">
          <DeployIndicator />
        </div>
      </div>

      {/*
        * A la vista en teléfono quedan las notificaciones y la cuenta: lo que
        * avisa y lo que dice quién eres. Tema, idioma y "ver como" viven en el
        * menú, porque se tocan una vez y se dejan puestos.
        */}
      <div className="asli-no-drag relative z-10 flex items-center justify-end gap-1 justify-self-end">
        <div className="hidden items-center gap-1 md:flex">
          <NeonThemeToggle variant="header" />
          <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden />
          <LocaleToggle variant="dark" />
          <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden />
          <ViewAsControl tone={tone} />
          <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden />
        </div>
        <NotificationsBell tone={tone} />
        <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden />
        <AuthWidget tone={tone} />
      </div>
    </HeaderChrome>
  );
}
