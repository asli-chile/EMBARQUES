/**
 * Cáscara de modal del ERP: backdrop + panel + animación de entrada y salida.
 *
 * Reproduce exactamente el patrón visual que ya usaban los módulos
 * (bottom sheet en móvil, card centrada en desktop, grabber, header con icono)
 * y le agrega lo que faltaba: salida animada, bloqueo de scroll y cierre con
 * Escape, vía `useOverlayTransition`.
 *
 * Sistema de motion: docs/MOTION-DESIGN.md
 */
import type { ReactNode } from "react";
import { Icon } from "@iconify/react";
import { useOverlayTransition } from "@/hooks/useOverlayTransition";

type ModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Icono Iconify del header (ej. `"lucide:plus"`). */
  icon: string;
  title: string;
  /** Línea secundaria bajo el título (ej. el nombre del registro editado). */
  subtitle?: string;
  /** Ancho máximo del panel en desktop. */
  maxWidthClassName?: string;
  /** Cuerpo del modal; recibe el padding y el scroll propio. */
  children: ReactNode;
  /** Botones de acción, al pie. */
  footer?: ReactNode;
  labelledById: string;
};

export function ModalShell({
  isOpen,
  onClose,
  icon,
  title,
  subtitle,
  maxWidthClassName = "sm:max-w-md",
  children,
  footer,
  labelledById,
}: ModalShellProps) {
  const { isMounted, state, close } = useOverlayTransition({ isOpen, onClose });

  if (!isMounted) return null;

  return (
    <div
      className="motion-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      data-state={state}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledById}
      onClick={close}
    >
      <div
        className={`motion-panel motion-panel-sheet flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-none sm:rounded-2xl ${maxWidthClassName}`}
        data-state={state}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-blue">
              <Icon icon={icon} width={15} height={15} className="text-white" />
            </div>
            <div>
              <h2 id={labelledById} className="text-sm font-bold text-neutral-900">
                {title}
              </h2>
              {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="motion-interactive flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Cerrar"
          >
            <Icon icon="lucide:x" width={16} height={16} />
          </button>
        </div>
        <div className="motion-stagger-group space-y-4 overflow-y-auto p-5 sm:p-6">{children}</div>
        {footer && <div className="flex shrink-0 gap-2 px-5 pt-2 pb-5 sm:px-6 sm:pb-6">{footer}</div>}
      </div>
    </div>
  );
}
