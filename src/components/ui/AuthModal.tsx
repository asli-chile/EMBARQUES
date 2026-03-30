import { useEffect, useRef, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { brand } from "@/lib/brand";
import { withBase } from "@/lib/basePath";

export type AuthUser = {
  name: string;
  email: string;
  level: string;
};

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
};

const WELCOME_TITLE = "Bienvenido al sistema";
const WELCOME_SUBTITLE = "Gestión de asesorías y servicios logísticos integrales.";
const CLOSE_ANIMATION_MS = 250;

export function AuthModal({ isOpen, onClose, user }: AuthModalProps) {
  const { t } = useLocale();
  const [isExiting, setIsExiting] = useState(false);
  const prevOpenRef = useRef(false);

  const handleClose = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => onClose(), CLOSE_ANIMATION_MS);
  }, [isExiting, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleClose();
  };

  useEffect(() => {
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setIsExiting(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const justOpened = isOpen && !prevOpenRef.current;
  const animationClass =
    justOpened || !isExiting ? "animate-auth-modal-in" : "animate-modal-out";
  const backdropClass =
    justOpened || !isExiting ? "animate-auth-backdrop-in" : "";

  const { name, email, level } = user;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onKeyDown={handleKeyDown}
    >
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${backdropClass}`}
        onClick={handleClose}
        aria-hidden
      />
      <div
        className={`relative flex flex-col md:flex-row w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-mac-modal border border-neutral-200/80 bg-white ${animationClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel izquierdo: marca y bienvenida (mismo que login/registro) */}
        <div className="hidden md:flex flex-1 flex-col px-10 py-12 bg-gradient-to-br from-brand-blue via-[#0d1a3a] to-[#0a1530] text-white min-h-[380px]">
          <div className="mb-4">
            <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 text-xs font-semibold tracking-wide uppercase text-white">
              BIENVENIDO "{name}"
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[180px] w-full">
            <img
              src={brand.logo}
              alt={brand.companyTitle}
              className="max-h-24 w-auto max-w-full object-contain brightness-0 invert"
              width={320}
              height={96}
            />
          </div>
          <div className="flex flex-col items-start gap-6 shrink-0">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {WELCOME_TITLE}
              </h2>
              <p className="text-white/85 text-sm leading-relaxed max-w-xs">
                {WELCOME_SUBTITLE}
              </p>
            </div>
            <ul className="space-y-2.5 text-sm text-white/80">
              <li className="flex items-center gap-2.5">
                <Icon
                  icon="lucide:check-circle"
                  width={18}
                  height={18}
                  className="text-emerald-300 shrink-0"
                  aria-hidden
                />
                <span>Reservas, itinerarios y documentación en un solo lugar.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Icon
                  icon="lucide:check-circle"
                  width={18}
                  height={18}
                  className="text-emerald-300 shrink-0"
                  aria-hidden
                />
                <span>Disponible 24/7 para tu equipo y clientes.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Panel derecho: datos del usuario y cerrar sesión */}
        <div className="flex-1 min-w-0 flex flex-col bg-neutral-50/95 overflow-y-auto min-h-[320px]">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-4 bg-white/95 backdrop-blur border-b border-neutral-200/60 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={brand.logo}
                alt={brand.companyTitle}
                className="h-11 w-auto max-w-[160px] object-contain object-left shrink-0"
                width={160}
                height={44}
              />
              <span className="text-sm font-semibold text-brand-blue truncate hidden sm:inline">
                EMBARQUES
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
              aria-label="Cerrar"
            >
              <Icon icon="lucide:x" width={20} height={20} />
            </button>
          </div>

          <div className="p-6 sm:p-8 flex flex-col justify-center min-h-0 w-full max-w-md mx-auto">
            <h2
              id="auth-modal-title"
              className="text-xl font-semibold text-brand-blue tracking-tight mb-1"
            >
              {t.auth.modalTitle}
            </h2>
            <p className="text-sm text-neutral-500 mb-6">{name}</p>

            <div className="space-y-3">
              <div className="rounded-xl bg-white border border-neutral-200 p-4">
                <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block mb-1">
                  {t.auth.email}
                </span>
                <p className="text-[15px] font-medium text-neutral-800 break-all">
                  {email}
                </p>
              </div>
              <div className="rounded-xl bg-white border border-neutral-200 p-4">
                <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block mb-1">
                  {t.auth.level}
                </span>
                <p className="text-[15px] font-medium text-neutral-800">{level}</p>
              </div>
            </div>

            <form
              action={withBase("/api/auth/signout")}
              method="post"
              className="mt-6 pt-4 border-t border-neutral-200"
            >
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors"
              >
                {t.auth.signOut}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
