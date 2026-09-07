/** Iconos geométricos del header (ASLI) — stroke square, sin look Lucide genérico. */

type IconProps = {
  className?: string;
  size?: number;
};

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
};

export function IconBell({ className = "", size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M4 6.4a4 4 0 0 1 8 0c0 2.2.7 3.1 1.2 3.6H2.8C3.3 9.5 4 8.6 4 6.4Z" {...stroke} />
      <path d="M6.4 12.2a1.6 1.6 0 0 0 3.2 0" {...stroke} />
    </svg>
  );
}

export function IconEye({ className = "", size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M1.6 8s2.4-4.2 6.4-4.2S14.4 8 14.4 8s-2.4 4.2-6.4 4.2S1.6 8 1.6 8Z" {...stroke} />
      <circle cx="8" cy="8" r="1.8" {...stroke} />
    </svg>
  );
}

export function IconUsers({ className = "", size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <circle cx="6" cy="5.2" r="2" {...stroke} />
      <path d="M1.8 13.2c0-2.1 1.9-3.4 4.2-3.4s4.2 1.3 4.2 3.4" {...stroke} />
      <circle cx="11.4" cy="5.6" r="1.6" {...stroke} />
      <path d="M11.4 9.8c1.7 0 3.2.9 3.2 2.4" {...stroke} />
    </svg>
  );
}

export function IconLoginUser({ className = "", size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" className={className} aria-hidden>
      <circle cx="9" cy="6" r="2.6" {...stroke} />
      <path d="M3.4 15c0-2.8 2.5-4.4 5.6-4.4s5.6 1.6 5.6 4.4" {...stroke} />
      <rect x="11.2" y="11.6" width="4.2" height="3.4" rx="0.4" {...stroke} />
      <path d="M12.4 13.3h1.8" {...stroke} />
    </svg>
  );
}

/** Botón cuadrado del header claro (idioma / campana). */
export const headerChromeBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-sm text-[#3d4f6f] ring-1 ring-[#c8d4e4] bg-[#f7f9fc] hover:bg-brand-blue hover:text-white hover:ring-brand-blue transition-colors duration-150";
