"use client";

import { useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegistroForm } from "@/components/auth/RegistroForm";
import { brand } from "@/lib/brand";

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
      {/* Backdrop con blur y animación */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-auth-backdrop-in"
        aria-hidden
        onClick={closeAuthForm}
      />
      {/* Contenedor del modal con animación de entrada */}
      <div
        className="relative flex flex-col md:flex-row w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-mac-modal border border-neutral-200/80 bg-white animate-auth-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel izquierdo: marca y bienvenida */}
        <div className="hidden md:flex flex-1 flex-col px-10 py-12 bg-gradient-to-br from-brand-blue via-[#0d1a3a] to-[#0a1530] text-white min-h-[420px]">
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

        {/* Panel derecho: formulario */}
        <div className="flex-1 min-w-0 flex flex-col bg-neutral-50/95 overflow-y-auto min-h-[380px]">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-4 bg-white/95 backdrop-blur border-b border-neutral-200/60 shrink-0">
            {/* Logo ASLI en el panel del formulario */}
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
              onClick={closeAuthForm}
              className="ml-auto p-2 rounded-lg text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-colors"
              aria-label="Cerrar"
            >
              <Icon icon="lucide:x" width={20} height={20} />
            </button>
          </div>
          {/* Título y logo en móvil */}
          <div className="md:hidden px-6 pt-4 pb-3 text-center border-b border-neutral-200/60 bg-white/80">
            <img
              src={brand.logo}
              alt={brand.companyTitle}
              className="h-10 w-auto max-w-[140px] mx-auto object-contain"
              width={140}
              height={40}
            />
            <p className="text-sm font-medium text-brand-blue mt-3">{WELCOME_TITLE}</p>
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
