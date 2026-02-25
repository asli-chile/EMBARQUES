import { useEffect, useRef, useState, useCallback } from "react";
import { useLocale } from "@/lib/i18n";
import { AuthIcon } from "./AuthIcon";
import { siteConfig } from "@/lib/site";

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
    justOpened || !isExiting ? "animate-modal-in" : "animate-modal-out";

  const { name, email, level } = user;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${animationClass}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className="relative bg-white rounded-2xl shadow-mac-modal border border-black/5 p-6 w-full max-w-sm min-w-[300px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
              <AuthIcon icon={siteConfig.authIcon} className="text-brand-blue" />
            </div>
            <div>
              <h2
                id="auth-modal-title"
                className="text-base font-bold text-brand-blue tracking-tight"
              >
                {t.auth.modalTitle}
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">{name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M2 2l8 8M10 2L2 10" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-4">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block mb-1">
              {t.auth.email}
            </span>
            <p className="text-[15px] font-medium text-neutral-800 break-all">
              {email}
            </p>
          </div>
          <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-4">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block mb-1">
              {t.auth.level}
            </span>
            <p className="text-[15px] font-medium text-neutral-800">{level}</p>
          </div>
        </div>
        <form
          action="/api/auth/signout"
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
  );
}
