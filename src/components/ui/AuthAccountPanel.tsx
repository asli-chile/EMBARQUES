import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "@iconify/react";
import { createPortal } from "react-dom";
import { useLocale } from "@/lib/i18n";
import { withBase } from "@/lib/basePath";
import { useOverlayTransition } from "@/hooks/useOverlayTransition";

export type AuthUser = {
  name: string;
  email: string;
  level: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  /** Botón que lo abre: el panel se cuelga de él en escritorio. */
  anchorRef: RefObject<HTMLElement | null>;
};

/**
 * Panel de cuenta.
 *
 * Antes era un modal de 4xl que tapaba la pantalla para mostrar dos datos, con
 * medio panel dedicado a un texto de bienvenida que pertenece al login: a quien
 * ya entró no hay que darle la bienvenida ni contarle qué hace el sistema.
 *
 * Ahora se comporta como lo que es, un menú de cuenta: colgado del botón en
 * escritorio, y hoja desde abajo en teléfono, donde un panel anclado a una
 * esquina queda lejos del pulgar.
 *
 * Navy como el header y el rail. El chrome del ERP es navy en ambos temas, así
 * que un panel claro colgando de él se leía como de otra aplicación.
 */
export function AuthAccountPanel({ isOpen, onClose, user, anchorRef }: Props) {
  const { t } = useLocale();
  const { isMounted, state, close } = useOverlayTransition({ isOpen, onClose });
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  /*
   * Posición en escritorio: pegado al borde derecho del botón.
   *
   * Se calcula al abrir y no con CSS porque el panel vive en un portal —el
   * header y el rail tienen overflow oculto y lo recortarían— y ahí ya no hay
   * un contenedor del que colgar.
   */
  useLayoutEffect(() => {
    if (!isMounted) return;
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  }, [isMounted, anchorRef]);

  if (!isMounted || typeof document === "undefined") return null;

  const { name, email, level } = user;
  const inicial = (name.trim().charAt(0) || email.trim().charAt(0) || "?").toLocaleUpperCase("es-CL");

  return createPortal(
    <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true" aria-labelledby="auth-panel-title">
      <div
        className="motion-backdrop absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        data-state={state}
        onClick={close}
        aria-hidden
      />

      {/*
        * Dos posiciones, un solo panel.
        *
        * Bajo `sm` se ancla abajo y ocupa el ancho: en un teléfono, un panel
        * pegado a la esquina superior derecha queda justo donde el pulgar no
        * llega. Desde `sm` se cuelga del botón con las coordenadas calculadas.
        */}
      <div
        ref={panelRef}
        data-state={state}
        style={pos ? ({ "--panel-top": `${pos.top}px`, "--panel-right": `${pos.right}px` } as React.CSSProperties) : undefined}
        className="motion-panel absolute inset-x-0 bottom-0 w-full overflow-hidden rounded-t-2xl border border-white/12 bg-[#0B1A3D] shadow-[0_-18px_50px_-12px_rgba(0,0,0,0.65)] sm:inset-x-auto sm:bottom-auto sm:left-auto sm:w-[21.5rem] sm:rounded-2xl sm:shadow-[0_18px_50px_-12px_rgba(0,0,0,0.65)] sm:[right:var(--panel-right)] sm:[top:var(--panel-top)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tirador: en la hoja dice que esto se arrastra o se cierra. */}
        <div className="flex justify-center pt-3.5 sm:hidden" aria-hidden>
          <span className="h-1.5 w-11 rounded-full bg-white/30" />
        </div>

        <div className="flex items-start gap-3.5 p-5 pb-4 sm:gap-3 sm:p-4 sm:pb-3.5">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1a3a6e] text-[20px] font-bold text-white ring-1 ring-white/15 sm:h-12 sm:w-12 sm:text-[17px]"
            aria-hidden
          >
            {inicial}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p id="auth-panel-title" className="truncate text-[17px] font-bold leading-tight text-white sm:text-[15px]">
              {name}
            </p>
            {/*
              * El correo entero, partido si hace falta: es el dato con el que
              * alguien confirma que entró con la cuenta correcta, y recortarlo
              * con puntos suspensivos justo antes del dominio no sirve de nada.
              */}
            <p className="mt-1 break-all text-[13.5px] leading-snug text-white/60 sm:mt-0.5 sm:text-[12.5px]">
              {email}
            </p>
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-sky-200 sm:mt-2 sm:px-2.5 sm:py-1 sm:text-[11px]">
              <Icon icon="lucide:shield-check" width={13} height={13} aria-hidden />
              {level}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t.auth.close ?? "Cerrar"}
            className="-mr-1.5 -mt-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/45 transition-colors hover:bg-white/10 hover:text-white sm:-mr-1 sm:-mt-1 sm:h-9 sm:w-9"
          >
            <Icon icon="lucide:x" width={20} height={20} aria-hidden />
          </button>
        </div>

        <form
          action={withBase("/api/auth/signout")}
          method="post"
          className="border-t border-white/10 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-2 sm:pb-2"
        >
          <button
            type="submit"
            /*
             * En la hoja es la única acción y hay sitio de sobra: se muestra
             * como botón, centrada y alta, para que se acierte sin mirar. En el
             * popover vuelve a ser una línea de menú, que es lo que parece
             * cuando cuelga de un botón pequeño.
             */
            className="motion-interactive flex h-14 w-full items-center justify-center gap-2.5 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 text-[15px] font-bold text-rose-300 transition-colors hover:bg-rose-400/20 hover:text-rose-200 sm:h-11 sm:justify-start sm:border-transparent sm:bg-transparent sm:text-[13.5px] sm:font-semibold"
          >
            <Icon icon="lucide:log-out" width={18} height={18} aria-hidden />
            {t.auth.signOut}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
