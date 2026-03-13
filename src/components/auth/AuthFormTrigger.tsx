"use client";

import type { AuthFormMode } from "@/lib/auth/AuthFormModalContext";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";

type AuthFormTriggerProps = {
  mode: AuthFormMode;
  className?: string;
  children: React.ReactNode;
  /** Si se pasa, se usa como elemento (ej. "a" para enlace); si no, button. */
  as?: "button" | "a";
};

/**
 * Abre el modal de login o registro sin navegar. Usar dentro de AuthFormModalProvider (layout principal).
 */
export function AuthFormTrigger({ mode, className, children, as = "button" }: AuthFormTriggerProps) {
  const { openAuthForm } = useAuthFormModal();
  const href = mode === "login" ? "/auth/login" : "/auth/registro";

  if (as === "a") {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          openAuthForm(mode);
        }}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={() => openAuthForm(mode)} className={className}>
      {children}
    </button>
  );
}
