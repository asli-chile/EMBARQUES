import { Icon } from "@iconify/react";
import { brand } from "@/lib/brand";
import { withBase } from "@/lib/basePath";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";
import type { AuthProfile } from "@/lib/auth/AuthContext";
import { GlassCard, GhostButton, PrimaryButton } from "./inicio-ui";

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
      className={`relative z-10 text-white ${compact ? "pt-8 pb-6 sm:pt-11 sm:pb-8" : "min-h-[min(92vh,880px)] flex items-center py-16 sm:py-24"}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className={`grid gap-10 lg:gap-14 items-center ${compact ? "lg:grid-cols-[1.15fr_0.85fr]" : "lg:grid-cols-[1.05fr_0.95fr]"}`}>
          <div>
            {isLoggedIn && profile ? (
              <div
                data-hero-item
                className="inline-flex items-center gap-2.5 mb-6 pl-1.5 pr-4 py-1.5 rounded-full inicio-glass text-sm"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal/40 to-brand-teal/10 text-brand-teal font-semibold text-xs border border-brand-teal/30">
                  {profile.nombre.charAt(0).toUpperCase()}
                </span>
                <span className="text-white/80">
                  Hola, <span className="font-semibold text-white">{firstName}</span>
                </span>
                <span className="hidden sm:inline h-3 w-px bg-white/15" />
                <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-white/40">
                  {new Date().toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                </span>
              </div>
            ) : (
              <div
                data-hero-item
                className="inline-flex items-center gap-2.5 mb-6 px-4 py-2 rounded-full inicio-glass text-xs font-medium uppercase tracking-[0.18em] text-white/60"
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
                src={brand.logoWhite}
                alt={brand.companyTitle}
                width={480}
                height={120}
                className="h-12 sm:h-14 w-auto object-contain mb-8 opacity-95"
                loading="eager"
              />
            )}

            <h1
              data-hero-item
              className={`inicio-display font-extrabold leading-[1.05] ${compact ? "text-3xl sm:text-4xl lg:text-[2.75rem]" : "text-4xl sm:text-5xl lg:text-[3.25rem]"}`}
            >
              {isLoggedIn ? (
                <>
                  Tu operación,{" "}
                  <span className="inicio-gradient-text">en un solo lugar</span>
                </>
              ) : (
                <>
                  Gestión logística{" "}
                  <span className="inicio-gradient-text">integral</span>
                </>
              )}
            </h1>

            <p data-hero-item className={`mt-5 text-white/55 max-w-lg leading-relaxed ${compact ? "text-sm sm:text-base" : "text-base sm:text-lg"}`}>
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
                  <AuthFormTrigger
                    mode="login"
                    className="inline-flex items-center justify-center gap-2.5 py-3 px-6 rounded-2xl inicio-btn-primary text-white font-semibold text-sm transition-all duration-300"
                  >
                    <Icon icon="lucide:log-in" width={18} height={18} />
                    Ingresar
                  </AuthFormTrigger>
                  <AuthFormTrigger
                    mode="registro"
                    className="inline-flex items-center justify-center gap-2.5 py-3 px-6 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08]"
                  >
                    <Icon icon="lucide:user-plus" width={18} height={18} />
                    Solicitar acceso
                  </AuthFormTrigger>
                </>
              )}
            </div>

            {!isLoggedIn && !compact && (
              <div data-hero-item className="mt-10 flex flex-wrap gap-6 text-xs text-white/35">
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
              <GlassCard className="p-5" reveal={false}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-teal font-semibold mb-4">
                  Accesos rápidos
                </p>
                <div className="grid grid-cols-2 gap-2.5">
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
                      className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 transition-colors hover:border-brand-teal/30 hover:bg-white/[0.06] group"
                    >
                      <Icon icon={icon} className="text-brand-teal mb-2" width={18} height={18} />
                      <p className="text-xs font-semibold text-white/85 group-hover:text-white">{label}</p>
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
                    <p className="text-[11px] uppercase tracking-[0.2em] text-brand-teal font-semibold">Flujo operativo</p>
                    <p className="text-white/45 text-sm mt-1">De la reserva al documento final</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-brand-teal/15 flex items-center justify-center border border-brand-teal/25">
                    <Icon icon="lucide:route" className="text-brand-teal" width={20} height={20} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {flowSteps.map(({ icon, label, sub }, i) => (
                    <div
                      key={label}
                      className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:border-brand-teal/25 hover:bg-white/[0.05]"
                    >
                      <span className="absolute top-3 right-3 text-[10px] font-bold text-white/15 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-teal/20 to-brand-teal/5 border border-brand-teal/20 flex items-center justify-center mb-3">
                        <Icon icon={icon} className="text-brand-teal" width={20} height={20} />
                      </div>
                      <p className="text-sm font-semibold text-white/90">{label}</p>
                      <p className="text-[11px] text-white/40 mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-white/8 flex items-center justify-between text-xs">
                  <span className="text-white/40">Exportadores · Región del Maule</span>
                  <span className="inline-flex items-center gap-1 text-brand-teal font-medium">
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
