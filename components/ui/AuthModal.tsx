"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { t } = useLocale();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const { name, email, level } = siteConfig.user;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm animate-backdrop-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-mac-modal p-6 w-full max-w-sm animate-modal-in border border-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            id="auth-modal-title"
            className="text-base font-medium text-brand-blue tracking-tight"
          >
            {t.auth.modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/80 rounded-full transition-all duration-200"
            aria-label="Cerrar"
          >
            <svg
              width="12"
              height="12"
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
        <div className="flex flex-col gap-4">
          <div className=" rounded-xl bg-neutral-100/80 p-4">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              {t.auth.name}
            </span>
            <p className="text-brand-blue font-medium mt-0.5 text-[15px]">
              {name}
            </p>
          </div>
          <div className="rounded-xl bg-neutral-100/80 p-4">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              {t.auth.email}
            </span>
            <p className="text-brand-blue font-medium mt-0.5 text-[15px]">
              {email}
            </p>
          </div>
          <div className="rounded-xl bg-neutral-100/80 p-4">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              {t.auth.level}
            </span>
            <p className="text-brand-blue font-medium mt-0.5 text-[15px]">
              {level}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
