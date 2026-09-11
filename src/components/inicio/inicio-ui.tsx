import { Icon } from "@iconify/react";
import type { ReactNode } from "react";

export const inicioStyles = {
  section: "relative z-10 py-20 sm:py-24 lg:py-28",
  sectionAlt: "relative z-10 py-16 sm:py-20 lg:py-24 inicio-band",
  /** Ancho útil casi full-bleed (logueado / desktop). */
  shell:
    "mx-auto w-full max-w-[min(100%,1760px)] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12",
  /** Landing invitado: un poco más estrecho para lectura. */
  shellGuest: "mx-auto w-full max-w-7xl px-6 sm:px-10",
  card: "group relative inicio-card rounded-2xl transition-all duration-300 overflow-hidden",
  cardInteractive: "inicio-card-interactive",
} as const;

export function SectionHeader({
  tag,
  title,
  subtitle,
  align = "center",
}: {
  tag: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  const alignClass = align === "center" ? "text-center mx-auto items-center" : "text-left items-start";
  return (
    <div data-inicio-reveal className={`mb-12 sm:mb-14 max-w-3xl flex flex-col ${alignClass}`}>
      <span className="inline-flex items-center gap-2.5 mb-4 text-xs font-semibold uppercase tracking-[0.14em] inicio-accent-text">
        <span className="h-px w-7 bg-[color-mix(in_srgb,var(--inicio-teal)_60%,transparent)]" />
        {tag}
      </span>
      <h2 className="inicio-display inicio-ink text-4xl sm:text-5xl lg:text-[3.15rem] font-bold leading-[1.08]">
        {title}
      </h2>
      {subtitle ? <p className="mt-4 text-base sm:text-lg inicio-ink-mute leading-relaxed max-w-2xl">{subtitle}</p> : null}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
  interactive = false,
  reveal = true,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  reveal?: boolean;
}) {
  return (
    <div
      {...(reveal ? { "data-inicio-reveal": true } : {})}
      className={`${inicioStyles.card} ${interactive ? inicioStyles.cardInteractive : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export const inicioButtonBase =
  "inline-flex items-center justify-center gap-2.5 py-3.5 px-7 rounded-lg font-semibold text-base transition-all duration-300";

export function PrimaryButton({
  href,
  onClick,
  children,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const cls = `${inicioButtonBase} inicio-btn-primary ${className}`;
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function GhostButton({
  href,
  children,
  className = "",
}: {
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  const cls = `${inicioButtonBase} inicio-btn-ghost font-medium ${className}`;
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return <button type="button" className={cls}>{children}</button>;
}

export function InicioFooter({
  t,
  brand,
}: {
  t: {
    footerTagline: string;
    footerSlogan: string;
    footerLocation: string;
    footerEmail: string;
    footerPhone: string;
    footerCopyright: string;
  };
  brand: { logoWhite: string; companyTitle: string; companyShort?: string };
}) {
  const social = [
    { href: "https://www.linkedin.com/company/aslichile/posts/?feedView=all", icon: "mdi:linkedin", label: "LinkedIn" },
    { href: "https://www.instagram.com/asli_chile/", icon: "mdi:instagram", label: "Instagram" },
    { href: "https://wa.me/56968394225", icon: "mdi:whatsapp", label: "WhatsApp" },
  ] as const;

  const contacts = [
    { icon: "lucide:map-pin", text: t.footerLocation, href: null as string | null },
    { icon: "lucide:mail", text: t.footerEmail, href: `mailto:${t.footerEmail}` },
    { icon: "lucide:phone", text: t.footerPhone, href: "tel:+56968394225" },
  ] as const;

  return (
    <footer data-inicio-reveal className="inicio-footer-neon relative z-10 py-12 sm:py-16 text-white">
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 text-center">
        <img
          src={brand.logoWhite}
          alt={brand.companyShort ?? brand.companyTitle}
          width={180}
          height={72}
          className="mb-3 h-11 w-auto object-contain sm:h-12"
          loading="lazy"
        />
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90 sm:text-xs">
          {t.footerTagline}
        </p>

        <div className="mt-8 flex w-full max-w-3xl items-center gap-4 sm:mt-10 sm:gap-5">
          <span className="inicio-footer-rule h-px flex-1" aria-hidden />
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-white sm:text-sm sm:tracking-[0.2em]">
            {t.footerSlogan}
          </p>
          <span className="inicio-footer-rule h-px flex-1" aria-hidden />
        </div>

        <div className="mt-7 flex items-center justify-center gap-3 sm:mt-8 sm:gap-3.5">
          {social.map(({ href, icon, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inicio-footer-social"
              aria-label={label}
            >
              <Icon icon={icon} width={18} height={18} />
            </a>
          ))}
        </div>

        <div className="mt-8 flex w-full max-w-4xl flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-0">
          {contacts.map((item, idx) => {
            const inner = (
              <>
                <Icon icon={item.icon} width={14} height={14} className="inicio-footer-contact-icon shrink-0" />
                <span>{item.text}</span>
              </>
            );
            return (
              <div key={item.text} className="flex items-center">
                {idx > 0 ? (
                  <span className="inicio-footer-divider mx-4 hidden h-4 w-px sm:mx-5 sm:block" aria-hidden />
                ) : null}
                {item.href ? (
                  <a
                    href={item.href}
                    className="inline-flex items-center gap-2 text-xs text-white/85 transition-colors hover:text-white sm:text-[13px]"
                  >
                    {inner}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 text-xs text-white/85 sm:text-[13px]">
                    {inner}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </footer>
  );
}

export function ScrollTopButton({
  visible,
  onClick,
  label = "Volver arriba",
}: {
  visible: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed bottom-5 right-5 z-50 w-11 h-11 rounded-md inicio-btn-primary flex items-center justify-center transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      aria-label={label}
    >
      <Icon icon="lucide:arrow-up" width={18} height={18} />
    </button>
  );
}

export function FeatureChip({ children }: { children: ReactNode }) {
  return (
    <span className="inicio-chip inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded">
      <Icon icon="lucide:check" width={10} height={10} className="inicio-accent-text shrink-0" />
      {children}
    </span>
  );
}
