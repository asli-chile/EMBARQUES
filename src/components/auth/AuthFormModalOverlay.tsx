import { useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegistroForm } from "@/components/auth/RegistroForm";
import { brand } from "@/lib/brand";

export function AuthFormModalOverlay() {
  const { open, mode, closeAuthForm, openAuthForm } = useAuthFormModal();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthForm();
    },
    [closeAuthForm]
  );

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Iniciar sesión" : "Solicitar acceso"}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-auth-backdrop-in"
        aria-hidden
        onClick={closeAuthForm}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-mac-modal animate-auth-modal-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-brand-blue via-brand-teal to-brand-blue" />

        {/* Header: logo + close */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2">
            <img
              src={brand.logo}
              alt={brand.companyTitle}
              className="h-8 w-auto object-contain object-left"
              width={120}
              height={32}
            />
            <span className="text-[13px] font-bold text-brand-blue tracking-wide">
              EMBARQUES
            </span>
          </div>
          <button
            type="button"
            onClick={closeAuthForm}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            aria-label="Cerrar"
          >
            <Icon icon="lucide:x" width={18} height={18} />
          </button>
        </div>

        {/* Pill tabs */}
        <div className="px-5 mt-4">
          <div className="flex bg-neutral-100 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => openAuthForm("login")}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 focus:outline-none ${
                mode === "login"
                  ? "bg-white text-brand-blue shadow-sm"
                  : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => openAuthForm("registro")}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 focus:outline-none ${
                mode === "registro"
                  ? "bg-white text-brand-blue shadow-sm"
                  : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              Registrarse
            </button>
          </div>
        </div>

        {/* Form area */}
        <div className="px-5 pb-6 pt-5">
          {mode === "login" ? (
            <LoginForm />
          ) : (
            <RegistroForm />
          )}
        </div>
      </div>
    </div>
  );
}
