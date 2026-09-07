import { siteConfig } from "@/lib/site";
import { withBase } from "@/lib/basePath";
import { AuthWidget } from "@/components/ui/AuthWidget";
import { OnlineUsersButton } from "@/components/ui/OnlineUsersButton";
import { VisitCounterBadge } from "@/components/ui/VisitCounterBadge";
import { NotificationsBell } from "@/components/ui/NotificationsBell";
import { NeonThemeToggle } from "@/components/ui/NeonThemeToggle";
import { HeaderTitle } from "./HeaderTitle";
import { LocaleToggle } from "./LocaleToggle";
import { HeaderChrome } from "./HeaderChrome";

type HeaderProps = {
  /** Con rail lateral: barra fina, sin logo ni título grande. */
  compact?: boolean;
};

/** Zona vacía arrastrable (solo shell Tauri; en web el atributo no hace nada). */
function DragSpacer({ className = "" }: { className?: string }) {
  return <div className={className} data-tauri-drag-region />;
}

export function Header({ compact = false }: HeaderProps) {
  if (compact) {
    return (
      <HeaderChrome compact>
        <div className="flex items-center gap-1 justify-self-start opacity-70">
          <div className="hidden sm:flex sm:items-center sm:gap-1">
            <VisitCounterBadge />
            <OnlineUsersButton />
          </div>
          <div className="sm:hidden">
            <VisitCounterBadge />
          </div>
        </div>

        <a
          href={withBase("/inicio")}
          className="flex h-7 items-center justify-self-center"
          aria-label="ASLI ERP"
          title="Inicio"
        >
          <img
            src={siteConfig.logo}
            alt={siteConfig.companyTitle}
            className="h-full w-auto max-w-[120px] object-contain"
            loading="eager"
            decoding="async"
          />
        </a>

        <div className="flex items-center justify-end gap-1.5 justify-self-end">
          <NeonThemeToggle variant="header" />
          <LocaleToggle />
          <NotificationsBell />
          <AuthWidget />
        </div>
      </HeaderChrome>
    );
  }

  return (
    <HeaderChrome>
      <a
        href={withBase("/inicio")}
        className="flex h-8 w-auto flex-shrink-0 items-center md:h-[50px]"
        aria-label="Ir al inicio del ERP"
      >
        <img
          src={siteConfig.logo}
          alt={siteConfig.companyTitle}
          width={160}
          height={44}
          className="h-full w-auto object-contain object-left"
          loading="eager"
          decoding="async"
        />
      </a>

      <div className="hidden min-w-0 flex-1 items-center md:flex">
        <DragSpacer className="h-full min-h-8 min-w-[12px] flex-1 self-stretch" />
        <HeaderTitle />
        <DragSpacer className="h-full min-h-8 min-w-[12px] flex-1 self-stretch" />
      </div>

      <DragSpacer className="min-h-8 flex-1 self-stretch md:hidden" />

      <div className="flex items-center gap-1.5">
        <VisitCounterBadge />
        <div className="hidden sm:block">
          <OnlineUsersButton />
        </div>
        <NeonThemeToggle variant="header" />
        <LocaleToggle />
        <NotificationsBell />
        <AuthWidget />
      </div>
    </HeaderChrome>
  );
}
