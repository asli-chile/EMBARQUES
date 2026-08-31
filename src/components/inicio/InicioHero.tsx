import { Icon } from "@iconify/react";
import { brand } from "@/lib/brand";
import { withBase } from "@/lib/basePath";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";
import type { AuthProfile } from "@/lib/auth/AuthContext";
import { GlassCard, GhostButton, PrimaryButton, inicioButtonBase } from "./inicio-ui";

type InicioCopy = {
  heroTitle: string;
  heroDescriptionLine1: string;
  heroDescriptionLine2: string;
};

const flowSteps = [
  { icon: "lucide:calendar-plus", label: "Reserva", sub: "Booking y operación" },
  { icon: "lucide:truck", label: "Transporte", sub: "Planta y contenedor" },
  { icon: "lucide:ship", label: "Zarpe", sub: "ETD / ETA en vivo" },
  { icon: "lucide:file-check", label: "Documentos", sub: "BL, DUS, certificados" },
];

export function InicioHero({
  t,
  isLoggedIn,
  profile,
  isCliente = false,
  compact = false,
}: {
  t: InicioCopy;
  isLoggedIn: boolean;
  profile: AuthProfile | null;
  isCliente?: boolean;
  compact?: boolean;
}) {
  const firstName = profile?.nombre?.split(" ")[0] ?? "";

  return (
    <header
      className={`relative z-10 inicio-ink ${compact ? "pt-8 pb-6 sm:pt-11 sm:pb-8" : "min-h-full flex items-center py-12 sm:py-16"}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className={`grid gap-10 lg:gap-14 items-center ${compact ? "lg:grid-cols-[1.15fr_0.85fr]" : "lg:grid-cols-[1.05fr_0.95fr]"}`}>
          <div>
            {isLoggedIn && profile ? (
              <div
                data-hero-item
                className="inicio-card inline-flex items-center gap-2.5 mb-6 pl-1.5 pr-4 py-1.5 rounded-md text-sm"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded bg-brand-teal/10 text-brand-teal font-semibold text-xs border border-brand-teal/25">
                  {profile.nombre.charAt(0).toUpperCase()}
                </span>
                <span className="inicio-ink-soft">
                  Hola, <span className="font-semibold inicio-ink">{firstName}</span>
                </span>
                <span className="hidden sm:inline h-3 w-px bg-brand-blue/15" />
                <span className="hidden sm:inline text-[11px] uppercase tracking-wider inicio-ink-faint">
                  {new Date().toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                </span>
              </div>
            ) : (
              <div
                data-hero-item
                className="inline-flex items-center gap-2.5 mb-6 text-xs font-semibold uppercase tracking-[0.14em] inicio-ink-mute"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-teal opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-teal" />
                </span>
                ERP logístico · ASLI
              </div>
            )}

            {!compact && (
              <img
                data-hero-item
                src={brand.logo}
                alt={brand.companyTitle}
                width={480}
                height={120}
                className="h-12 sm:h-14 w-auto object-contain mb-8"
                loading="eager"
              />
            )}

            <h1
              data-hero-item
              className={`inicio-display font-extrabold leading-[1.05] ${compact ? "text-3xl sm:text-4xl lg:text-[2.75rem]" : "text-4xl sm:text-5xl lg:text-[3.25rem]"}`}
            >
              <span className="inicio-hero-title-stretch">
                {isLoggedIn ? (
                  <>
                    Tu operación,{" "}
                    <span className="inicio-accent-text">en un solo lugar</span>
                  </>
                ) : (
                  <>
                    Gestión logística{" "}
                    <span className="inicio-accent-text">integral</span>
                  </>
                )}
              </span>
            </h1>

            <p data-hero-item className={`mt-5 inicio-ink-mute max-w-lg leading-relaxed ${compact ? "text-sm sm:text-base" : "text-base sm:text-lg"}`}>
              {isLoggedIn ? (
                isCliente ? (
                  <>Panel centralizado para tus reservas, documentos y el estado de tus embarques.</>
                ) : (
                  <>Panel centralizado para embarques, registros, documentos y transporte.</>
                )
              ) : (
                <>
                  {t.heroDescriptionLine1} {t.heroDescriptionLine2}
                </>
              )}
            </p>

            <div data-hero-item className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
              {isLoggedIn ? (
                isCliente ? (
                  <>
                    <PrimaryButton href={withBase("/dashboard")}>
                      <Icon icon="lucide:layout-dashboard" width={18} height={18} />
                      Ir al Dashboard
                    </PrimaryButton>
                    <GhostButton href={withBase("/reservas/mis-reservas")}>
                      <Icon icon="lucide:package" width={18} height={18} />
                      Mis reservas
                    </GhostButton>
                    <GhostButton href={withBase("/reservas/crear")}>
                      <Icon icon="lucide:plus" width={18} height={18} />
                      Nueva reserva
                    </GhostButton>
                    <GhostButton href={withBase("/documentos/mis-documentos")}>
                      <Icon icon="lucide:file-text" width={18} height={18} />
                      Documentos
                    </GhostButton>
                  </>
                ) : (
                  <>
                    <PrimaryButton href={withBase("/dashboard")}>
                      <Icon icon="lucide:layout-dashboard" width={18} height={18} />
                      Ir al Dashboard
                    </PrimaryButton>
                    <GhostButton href={withBase("/reservas/mis-reservas")}>
                      <Icon icon="lucide:package" width={18} height={18} />
                      Ir a mis reservas
                    </GhostButton>
                    <GhostButton href={withBase("/reservas/crear")} className="hidden md:inline-flex">
                      <Icon icon="lucide:plus" width={18} height={18} />
                      Nueva reserva
                    </GhostButton>
                  </>
                )
              ) : (
                <>
                  <AuthFormTrigger mode="login" className={`${inicioButtonBase} inicio-btn-primary`}>
                    <Icon icon="lucide:log-in" width={18} height={18} />
                    Ingresar
                  </AuthFormTrigger>
                  <AuthFormTrigger mode="registro" className={`${inicioButtonBase} inicio-btn-ghost font-medium`}>
                    <Icon icon="lucide:user-plus" width={18} height={18} />
                    Solicitar acceso
                  </AuthFormTrigger>
                </>
              )}
            </div>

            {!isLoggedIn && !compact && (
              <div data-hero-item className="mt-10 flex flex-wrap gap-6 text-xs inicio-ink-faint">
                <span className="inline-flex items-center gap-2">
                  <Icon icon="lucide:shield-check" width={14} height={14} className="text-brand-teal" />
                  Datos en la nube
                </span>
                <span className="inline-flex items-center gap-2">
                  <Icon icon="lucide:clock" width={14} height={14} className="text-brand-teal" />
                  Tiempo real
                </span>
                <span className="inline-flex items-center gap-2">
                  <Icon icon="lucide:map-pin" width={14} height={14} className="text-brand-teal" />
                  Curicó, Chile
                </span>
              </div>
            )}
          </div>

          {compact && isLoggedIn && (
            <div data-hero-item className="hidden lg:block">
              <GlassCard className="p-6 sm:p-7" reveal={false}>
                <p className="text-xs sm:text-sm uppercase tracking-[0.14em] inicio-accent-text font-semibold mb-5">
                  Accesos rápidos
                </p>
                <div className="grid grid-cols-2 gap-3.5">
                  {(isCliente
                    ? [
                        { href: "/reservas/crear", icon: "lucide:plus-circle", label: "Nueva reserva" },
                        { href: "/reservas/mis-reservas", icon: "lucide:package", label: "Mis reservas" },
                        { href: "/documentos/mis-documentos", icon: "lucide:file-text", label: "Documentos" },
                        { href: "/dashboard", icon: "lucide:layout-dashboard", label: "Dashboard" },
                      ]
                    : [
                        { href: "/reservas/crear", icon: "lucide:plus-circle", label: "Crear reserva" },
                        { href: "/reservas/mis-reservas", icon: "lucide:package", label: "Mis reservas" },
                        { href: "/documentos/mis-documentos", icon: "lucide:file-text", label: "Documentos" },
                        { href: "/transportes/reserva-asli", icon: "lucide:truck", label: "Transportes" },
                      ]
                  ).map(({ href, icon, label }) => (
                    <a
                      key={href}
                      href={withBase(href)}
                      className="inicio-tile rounded-md p-5 min-h-[6.5rem] flex flex-col justify-center group"
                    >
                      <Icon icon={icon} className="text-brand-teal mb-3" width={24} height={24} />
                      <p className="text-sm font-semibold inicio-ink leading-snug">{label}</p>
                    </a>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}

          {!compact && (
            <div data-hero-item className="hidden lg:block">
              <GlassCard className="p-6 sm:p-7" reveal={false}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] inicio-accent-text font-semibold">Flujo operativo</p>
                    <p className="inicio-ink-mute text-sm mt-1">De la reserva al documento final</p>
                  </div>
                  <div className="inicio-icon-box h-10 w-10 rounded-md flex items-center justify-center">
                    <Icon icon="lucide:route" width={20} height={20} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {flowSteps.map(({ icon, label, sub }, i) => (
                    <div key={label} className="inicio-tile relative rounded-md p-4">
                      <span className="absolute top-3 right-3 text-[10px] font-bold inicio-ink-faint tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="inicio-icon-box w-10 h-10 rounded-md flex items-center justify-center mb-3">
                        <Icon icon={icon} width={20} height={20} />
                      </div>
                      <p className="text-sm font-semibold inicio-ink">{label}</p>
                      <p className="text-[11px] inicio-ink-mute mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t inicio-line flex items-center justify-between text-xs">
                  <span className="inicio-ink-mute">Exportadores · Región del Maule</span>
                  <span className="inline-flex items-center gap-1 inicio-accent-text font-medium">
                    Ver módulos
                    <Icon icon="lucide:arrow-right" width={14} height={14} />
                  </span>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
