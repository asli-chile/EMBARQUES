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
      </div>

      <div className="flex h-full min-w-0 items-center justify-self-center">
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
