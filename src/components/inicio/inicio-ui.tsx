import { Icon } from "@iconify/react";
import type { ReactNode } from "react";

export const inicioStyles = {
  section: "relative z-10 py-16 sm:py-20 lg:py-24",
  sectionAlt:
    "relative z-10 py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white/[0.03] to-transparent border-y border-white/[0.06]",
  card: "group relative inicio-glass rounded-2xl sm:rounded-3xl transition-all duration-500 ease-out overflow-hidden",
  cardInteractive: "hover:-translate-y-1 hover:scale-[1.01]",
} as const;

export function SectionHeader({
  tag,
  title,
  subtitle,
  align = "center",
  gradient = false,
}: {
  tag: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  gradient?: boolean;
}) {
  const alignClass = align === "center" ? "text-center mx-auto items-center" : "text-left items-start";
  return (
    <div data-inicio-reveal className={`mb-10 sm:mb-12 max-w-2xl flex flex-col ${alignClass}`}>
      <span className="inline-flex items-center gap-2 mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-teal">
        <span className="h-px w-6 bg-gradient-to-r from-brand-teal to-transparent" />
        {tag}
      </span>
      <h2
        className={`inicio-display text-3xl sm:text-4xl lg:text-[2.35rem] font-bold leading-[1.1] ${
          gradient ? "inicio-gradient-text" : "text-white"
        }`}
      >
        {title}
      </h2>
      {subtitle ? <p className="mt-3 text-sm sm:text-base text-white/50 leading-relaxed max-w-xl">{subtitle}</p> : null}
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
      className={`${inicioStyles.card} inicio-shine ${interactive ? inicioStyles.cardInteractive : ""} ${className}`}
    >
      {children}
    </div>
  );
}

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
  const cls = `inline-flex items-center justify-center gap-2.5 py-3 px-6 rounded-2xl inicio-btn-primary text-white font-semibold text-sm transition-all duration-300 ${className}`;
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
  const cls = `inline-flex items-center justify-center gap-2.5 py-3 px-6 rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 font-medium text-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-white/25 ${className}`;
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
  t: { footerLocation: string; footerEmail: string; footerPhone: string; footerCopyright: string };
  brand: { logoWhite: string; companyTitle: string };
}) {
  return (
    <footer data-inicio-reveal className="relative z-10 py-10 sm:py-12 border-t border-white/[0.08]">
      <div className="absolute inset-0 bg-gradient-to-t from-[#040810] to-transparent pointer-events-none" />
      <div className="relative max-w-5xl mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          <img src={brand.logoWhite} alt={brand.companyTitle} width={160} height={80} className="h-9 w-auto object-contain mb-5 opacity-90" loading="lazy" />
          <div className="flex gap-2.5 mb-5">
            {[
              { href: "https://www.linkedin.com/company/aslichile/posts/?feedView=all", icon: "mdi:linkedin", label: "LinkedIn" },
              { href: "https://www.instagram.com/asli_chile/", icon: "mdi:instagram", label: "Instagram" },
              { href: "https://wa.me/56968394225", icon: "mdi:whatsapp", label: "WhatsApp" },
            ].map(({ href, icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl inicio-glass flex items-center justify-center text-white/60 hover:text-white transition-colors"
                aria-label={label}
              >
                <Icon icon={icon} width={17} height={17} />
              </a>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-white/40">
            <span className="inline-flex items-center gap-2">
              <Icon icon="lucide:map-pin" width={13} height={13} className="text-brand-teal" />
              {t.footerLocation}
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon icon="lucide:mail" width={13} height={13} className="text-brand-teal" />
              {t.footerEmail}
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon icon="lucide:phone" width={13} height={13} className="text-brand-teal" />
              {t.footerPhone}
            </span>
          </div>
          <p className="mt-6 text-[11px] text-white/25">
            © {new Date().getFullYear()} {brand.companyTitle} · {t.footerCopyright}
          </p>
        </div>
      </div>
    </footer>
  );
}

export function ScrollTopButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed bottom-5 right-5 z-50 w-11 h-11 rounded-2xl inicio-btn-primary flex items-center justify-center transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      aria-label="Volver arriba"
    >
      <Icon icon="lucide:arrow-up" width={18} height={18} />
    </button>
  );
}

export function FeatureChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-white/70 bg-white/[0.06] border border-white/10 rounded-lg">
      <Icon icon="lucide:check" width={10} height={10} className="text-brand-teal shrink-0" />
      {children}
    </span>
  );
}
