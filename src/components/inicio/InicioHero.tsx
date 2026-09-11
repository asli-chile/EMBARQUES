import { Icon } from "@iconify/react";
import { brand } from "@/lib/brand";
import { withBase } from "@/lib/basePath";
import { useLocale } from "@/lib/i18n";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";
import type { AuthProfile } from "@/lib/auth/AuthContext";
import { GlassCard, inicioButtonBase, inicioStyles } from "./inicio-ui";

const flowStepIcons = [
  "lucide:calendar-plus",
  "lucide:truck",
  "lucide:ship",
  "lucide:file-check",
] as const;

export function InicioHero({
  isLoggedIn,
  profile,
  isCliente = false,
  compact = false,
}: {
  isLoggedIn: boolean;
  profile: AuthProfile | null;
  isCliente?: boolean;
  compact?: boolean;
}) {
  const { t, locale } = useLocale();
  const i = t.inicio;
  const firstName = profile?.nombre?.split(" ")[0] ?? "";
  const dateLocale = locale === "en" ? "en-US" : "es-CL";

  const flowSteps = [
    { icon: flowStepIcons[0], label: i.heroFlowStep1, sub: i.heroFlowStep1Sub },
    { icon: flowStepIcons[1], label: i.heroFlowStep2, sub: i.heroFlowStep2Sub },
    { icon: flowStepIcons[2], label: i.heroFlowStep3, sub: i.heroFlowStep3Sub },
    { icon: flowStepIcons[3], label: i.heroFlowStep4, sub: i.heroFlowStep4Sub },
  ];

  const quickTiles = isCliente
    ? [
        {
          href: "/reservas/crear",
          icon: "lucide:box",
          mark: "lucide:ship",
          label: i.heroCtaNewBooking,
          desc: i.heroQuickCreateDesc,
          foot: i.heroQuickCreateFoot,
          accent: "blue" as const,
        },
        {
          href: "/reservas/mis-reservas",
          icon: "lucide:boxes",
          mark: "lucide:clipboard-list",
          label: i.heroCtaMyBookings,
          desc: i.heroQuickReservasDesc,
          foot: i.heroQuickReservasFoot,
          accent: "teal" as const,
        },
        {
          href: "/documentos/mis-documentos",
          icon: "lucide:file-text",
          mark: "lucide:files",
          label: i.heroCtaDocuments,
          desc: i.heroQuickDocsDesc,
          foot: i.heroQuickDocsFoot,
          accent: "amber" as const,
        },
        {
          href: "/dashboard",
          icon: "lucide:layout-dashboard",
          mark: "lucide:bar-chart-3",
          label: i.quickDashboard,
          desc: i.heroQuickDashboardDesc,
          foot: i.heroQuickDashboardFoot,
          accent: "violet" as const,
        },
      ]
    : [
        {
          href: "/reservas/crear",
          icon: "lucide:box",
          mark: "lucide:ship",
          label: i.heroCtaCreateBooking,
          desc: i.heroQuickCreateDesc,
          foot: i.heroQuickCreateFoot,
          accent: "blue" as const,
        },
        {
          href: "/reservas/mis-reservas",
          icon: "lucide:boxes",
          mark: "lucide:clipboard-list",
          label: i.heroCtaMyBookings,
          desc: i.heroQuickReservasDesc,
          foot: i.heroQuickReservasFoot,
          accent: "teal" as const,
        },
        {
          href: "/documentos/mis-documentos",
          icon: "lucide:file-text",
          mark: "lucide:files",
          label: i.heroCtaDocuments,
          desc: i.heroQuickDocsDesc,
          foot: i.heroQuickDocsFoot,
          accent: "amber" as const,
        },
        {
          href: "/transportes/reserva-asli",
          icon: "lucide:truck",
          mark: "lucide:container",
          label: i.heroCtaTransport,
          desc: i.heroQuickTransportDesc,
          foot: i.heroQuickTransportFoot,
          accent: "violet" as const,
        },
      ];

  return (
    <header
      className={`relative z-10 inicio-ink ${
        compact
          ? "py-6 sm:py-8 lg:py-10"
          : "flex min-h-[calc(100dvh-2.5rem)] items-center justify-center py-12 sm:py-16"
      }`}
    >
      <div className={compact ? inicioStyles.shell : inicioStyles.shellGuest}>
        <div
          className={`grid w-full items-center gap-10 lg:gap-12 xl:gap-16 ${
            compact
              ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
              : "lg:grid-cols-2"
          }`}
        >
          <div>
            {isLoggedIn && profile ? (
              <div
                data-hero-item
                className="inicio-greeting mb-7 inline-flex max-w-full flex-wrap items-center gap-2.5 rounded-lg py-2 pl-2 pr-4 text-base sm:gap-3 sm:pr-5"
              >
                <span className="inicio-icon-box flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold sm:h-10 sm:w-10">
                  {profile.nombre.charAt(0).toUpperCase()}
                </span>
                <span className="inicio-ink-soft min-w-0">
                  {i.heroGreeting} <span className="font-semibold inicio-ink">{firstName}</span>
                </span>
                <span className="inicio-line hidden h-3.5 w-px shrink-0 bg-current opacity-30 sm:inline" />
                <span className="hidden text-xs uppercase tracking-wider inicio-ink-faint sm:inline">
                  {new Date().toLocaleDateString(dateLocale, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  }).replace(/\./g, "").toUpperCase()}
                </span>
              </div>
            ) : (
              <div
                data-hero-item
                className="mb-7 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] inicio-ink-mute"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--inicio-teal)] opacity-40" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--inicio-teal)]" />
                </span>
                {i.heroBadgeGuest}
              </div>
            )}

            {!compact && (
              <img
                data-hero-item
                src={brand.logo}
                alt={brand.companyTitle}
                width={560}
                height={140}
                className="inicio-brand-logo mb-9 h-24 w-auto object-contain sm:h-28 lg:h-32"
                loading="eager"
              />
            )}

            <h1
              data-hero-item
              className={`inicio-display font-extrabold leading-[1.02] tracking-tight ${
                compact
                  ? "text-4xl sm:text-5xl lg:text-[3.25rem]"
                  : "text-5xl sm:text-6xl lg:text-[4.25rem] xl:text-[4.75rem]"
              }`}
            >
              <span className="inicio-hero-title-stretch">
                {isLoggedIn ? (
                  <>
                    {i.heroTitleLoggedIn}{" "}
                    <span className="inicio-accent-gradient">{i.heroTitleLoggedInAccent}</span>
                  </>
                ) : (
                  <>
                    {i.heroTitleGuest}{" "}
                    <span className="inicio-accent-gradient">{i.heroTitleGuestAccent}</span>
                  </>
                )}
              </span>
            </h1>

            <p
              data-hero-item
              className={`mt-6 leading-relaxed inicio-ink-mute ${
                compact ? "max-w-2xl text-base sm:text-lg" : "max-w-xl text-lg sm:text-xl lg:text-[1.35rem]"
              }`}
            >
              {isLoggedIn ? (
                isCliente ? i.heroDescLoggedInClient : i.heroDescLoggedInStaff
              ) : (
                <>
                  {i.heroDescriptionLine1} {i.heroDescriptionLine2}
                </>
              )}
            </p>

            <div data-hero-item className="mt-10">
              {isLoggedIn ? (
                <div className="inicio-hero-actions">
                  <a href={withBase("/dashboard")} className="inicio-hero-chip inicio-hero-chip--primary">
                    <Icon icon="lucide:layout-dashboard" width={22} height={22} />
                    <span>{i.heroCtaDashboard}</span>
                    <Icon icon="lucide:arrow-right" width={16} height={16} className="inicio-hero-chip-arrow" />
                  </a>
                  <a href={withBase("/reservas/mis-reservas")} className="inicio-hero-chip inicio-hero-chip--ghost">
                    <Icon icon="lucide:box" width={22} height={22} />
                    <span>{isCliente ? i.heroCtaMyBookings : i.heroCtaMyBookingsStaff}</span>
                    <Icon icon="lucide:arrow-right" width={16} height={16} className="inicio-hero-chip-arrow" />
                  </a>
                  <a
                    href={withBase("/reservas/crear")}
                    className={`inicio-hero-chip inicio-hero-chip--ghost ${isCliente ? "" : "hidden md:inline-flex"}`}
                  >
                    <Icon icon="lucide:plus-circle" width={22} height={22} />
                    <span>{i.heroCtaNewBooking}</span>
                    <Icon icon="lucide:arrow-right" width={16} height={16} className="inicio-hero-chip-arrow" />
                  </a>
                  {isCliente ? (
                    <a href={withBase("/documentos/mis-documentos")} className="inicio-hero-chip inicio-hero-chip--ghost">
                      <Icon icon="lucide:file-text" width={22} height={22} />
                      <span>{i.heroCtaDocuments}</span>
                      <Icon icon="lucide:arrow-right" width={16} height={16} className="inicio-hero-chip-arrow" />
                    </a>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col flex-wrap gap-3.5 sm:flex-row">
                  <AuthFormTrigger
                    mode="login"
                    className={`${inicioButtonBase} inicio-btn-primary px-8 py-3.5 text-base`}
                  >
                    <Icon icon="lucide:log-in" width={20} height={20} />
                    {i.heroCtaLogin}
                  </AuthFormTrigger>
                  <AuthFormTrigger
                    mode="registro"
                    className={`${inicioButtonBase} inicio-btn-ghost px-8 py-3.5 text-base font-medium`}
                  >
                    <Icon icon="lucide:user-plus" width={20} height={20} />
                    {i.heroCtaRequestAccess}
                  </AuthFormTrigger>
                </div>
              )}
            </div>

            {!isLoggedIn && !compact && (
              <div data-hero-item className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm inicio-ink-faint">
                <span className="inline-flex items-center gap-2.5">
                  <Icon icon="lucide:shield-check" width={18} height={18} className="inicio-accent-text" />
                  {i.heroTrustCloud}
                </span>
                <span className="inline-flex items-center gap-2.5">
                  <Icon icon="lucide:clock" width={18} height={18} className="inicio-accent-text" />
                  {i.heroTrustRealtime}
                </span>
                <span className="inline-flex items-center gap-2.5">
                  <Icon icon="lucide:map-pin" width={18} height={18} className="inicio-accent-text" />
                  {i.heroTrustLocation}
                </span>
              </div>
            )}
          </div>

          {compact && isLoggedIn && (
            <div data-hero-item className="hidden lg:block">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="mb-1.5 inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] inicio-accent-text">
                    <span className="h-px w-6 bg-[color-mix(in_srgb,var(--inicio-teal)_60%,transparent)]" />
                    {i.heroQuickAccess}
                  </p>
                  <p className="max-w-xs text-sm leading-snug inicio-ink-mute">
                    {i.heroQuickSubtitle}
                  </p>
                </div>
                <p className="max-w-[7.5rem] text-right text-[9px] font-semibold uppercase tracking-[0.16em] leading-relaxed inicio-ink-faint">
                  <span className="mb-1.5 ml-auto grid w-fit grid-cols-3 gap-0.5" aria-hidden>
                    {Array.from({ length: 9 }).map((_, n) => (
                      <span key={n} className="h-1 w-1 rounded-full bg-current opacity-45" />
                    ))}
                  </span>
                  {i.heroQuickAside}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                {quickTiles.map(({ href, icon, mark, label, desc, foot, accent }) => (
                  <a
                    key={href}
                    href={withBase(href)}
                    className={`inicio-shortcut-card inicio-shortcut-card--${accent} inicio-shortcut-card--hero group`}
                  >
                    <Icon
                      icon={mark}
                      className="inicio-shortcut-mark"
                      width={120}
                      height={120}
                      aria-hidden
                    />
                    <span className="inicio-shortcut-icon" aria-hidden>
                      <Icon icon={icon} width={26} height={26} />
                    </span>
                    <span className="relative z-[1] min-w-0 flex-1 flex flex-col justify-center gap-1 pr-1">
                      <span className="block text-sm font-semibold leading-snug inicio-ink">
                        {label}
                      </span>
                      <span className="block text-[11px] leading-snug inicio-ink-mute">
                        {desc}
                      </span>
                      <span className="inicio-shortcut-foot mt-2">{foot}</span>
                    </span>
                    <span className="inicio-shortcut-chevron relative z-[1]" aria-hidden>
                      <Icon icon="lucide:arrow-right" width={14} height={14} />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!compact && (
            <div data-hero-item className="hidden lg:block">
              <GlassCard className="p-7 sm:p-9" reveal={false}>
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] inicio-accent-text">
                      {i.heroFlowTitle}
                    </p>
                    <p className="mt-1.5 text-base inicio-ink-mute">{i.heroFlowSubtitle}</p>
                  </div>
                  <div className="inicio-icon-box flex h-12 w-12 items-center justify-center rounded-lg">
                    <Icon icon="lucide:route" width={24} height={24} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {flowSteps.map(({ icon, label, sub }, stepIndex) => (
                    <div key={label} className="inicio-tile relative rounded-lg p-5">
                      <span className="absolute right-3.5 top-3.5 text-xs font-bold tabular-nums inicio-ink-faint">
                        {String(stepIndex + 1).padStart(2, "0")}
                      </span>
                      <div className="inicio-icon-box mb-3.5 flex h-11 w-11 items-center justify-center rounded-lg">
                        <Icon icon={icon} width={22} height={22} />
                      </div>
                      <p className="text-base font-semibold inicio-ink">{label}</p>
                      <p className="mt-1 text-sm inicio-ink-mute">{sub}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t inicio-line pt-5 text-sm">
                  <span className="inicio-ink-mute">{i.heroFlowFooter}</span>
                  <a
                    href="#pilares"
                    className="inline-flex items-center gap-1.5 font-medium inicio-accent-text"
                  >
                    {i.heroFlowViewModules}
                    <Icon icon="lucide:arrow-right" width={16} height={16} />
                  </a>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
