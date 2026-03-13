"use client";

import { useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegistroForm } from "@/components/auth/RegistroForm";

const WELCOME_TITLE = "Bienvenido al sistema";
const WELCOME_SUBTITLE = "Gestión de asesorías y servicios logísticos integrales.";

export function AuthFormModalOverlay() {
  const { open, mode, closeAuthForm, openAuthForm } = useAuthFormModal();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthForm();
    },
    [closeAuthForm]
  );

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
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
      aria-label={mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
    >
      {/* Fondo oscuro con blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        aria-hidden
        onClick={closeAuthForm}
      />
      {/* Contenedor: dos mitades */}
      <div
        className="relative flex flex-col md:flex-row w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-neutral-200/80 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mitad izquierda: mensaje de bienvenida */}
        <div className="hidden md:flex flex-1 flex-col justify-center px-8 py-10 bg-gradient-to-br from-brand-blue via-[#0d1a3a] to-brand-blue text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
              <Icon icon="lucide:shield-check" width={28} height={28} className="text-white" aria-hidden />
            </div>
            <span className="text-sm font-medium uppercase tracking-wider text-white/80">
              EMBARQUES
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-3">
            {WELCOME_TITLE}
          </h2>
          <p className="text-white/90 text-base leading-relaxed max-w-sm">
            {WELCOME_SUBTITLE}
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-2">
              <Icon icon="lucide:check-circle" width={18} height={18} className="text-emerald-300 shrink-0" aria-hidden />
              <span>Reservas, itinerarios y documentación en un solo lugar.</span>
            </li>
            <li className="flex items-center gap-2">
              <Icon icon="lucide:check-circle" width={18} height={18} className="text-emerald-300 shrink-0" aria-hidden />
              <span>Disponible 24/7 para tu equipo y clientes.</span>
            </li>
          </ul>
        </div>

        {/* Mitad derecha: formulario */}
        <div className="flex-1 min-w-0 flex flex-col bg-neutral-50/90 overflow-y-auto">
          <div className="sticky top-0 z-10 flex justify-end p-3 bg-neutral-50/95 border-b border-neutral-200/60 shrink-0">
            <button
              type="button"
              onClick={closeAuthForm}
              className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              aria-label="Cerrar"
            >
              <Icon icon="lucide:x" width={20} height={20} />
            </button>
          </div>
          {/* En móvil: título de bienvenida compacto */}
        <div className="md:hidden px-6 pt-4 pb-2 text-center border-b border-neutral-200/60 bg-white/80">
          <p className="text-sm font-medium text-brand-blue">{WELCOME_TITLE}</p>
          <p className="text-xs text-neutral-500 mt-0.5">{WELCOME_SUBTITLE}</p>
        </div>
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-0 w-full max-w-md mx-auto">
            {mode === "login" ? (
              <LoginForm
                onClose={closeAuthForm}
                onOpenRegistro={() => openAuthForm("registro")}
              />
            ) : (
              <RegistroForm
                onClose={closeAuthForm}
                onOpenLogin={() => openAuthForm("login")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
