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
import { useLocale } from "@/lib/i18n";

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

function HeaderRouteTitle({ pathname }: { pathname: string }) {
  const { t } = useLocale();
  const clave = TITULOS_DE_BARRA[pathname.replace(/\/$/, "") || "/"];
  if (!clave) return null;
  const titulo = (t.sidebar as Record<string, string>)[clave];
  if (!titulo) return null;
  return (
    <span className="ml-1 max-w-[42vw] truncate text-sm font-semibold text-white/90 md:ml-2 md:max-w-[220px] md:text-base">
      {titulo}
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
        <div className="absolute right-full top-1/2 -translate-y-1/2">
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
