import { Icon } from "@iconify/react";
import { createPortal } from "react-dom";
import { useLocale } from "@/lib/i18n";
import { brand } from "@/lib/brand";
import { withBase } from "@/lib/basePath";
import { useOverlayTransition } from "@/hooks/useOverlayTransition";

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

export function AuthModal({ isOpen, onClose, user }: AuthModalProps) {
  const { t } = useLocale();
  const { isMounted, state, close } = useOverlayTransition({ isOpen, onClose });

  if (!isMounted || typeof document === "undefined") return null;

  const { name, email, level } = user;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="motion-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm"
        data-state={state}
        onClick={close}
        aria-hidden
      />
      <div
        className="motion-panel relative my-auto flex w-full max-h-[min(90dvh,900px)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-mac-modal md:flex-row"
        data-state={state}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel izquierdo: marca y bienvenida (mismo que login/registro) */}
        <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto bg-gradient-to-br from-brand-blue via-[#0d1a3a] to-[#0a1530] px-10 py-12 text-white md:flex">
          <div className="mb-4">
            <p className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
              BIENVENIDO "{name}"
            </p>
          </div>
          <div className="flex min-h-[140px] w-full flex-1 items-center justify-center">
            <img
              src={brand.logo}
              alt={brand.companyTitle}
              className="h-auto max-h-24 w-auto max-w-full object-contain brightness-0 invert"
              width={320}
              height={96}
            />
          </div>
          <div className="flex shrink-0 flex-col items-start gap-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {WELCOME_TITLE}
              </h2>
              <p className="max-w-xs text-sm leading-relaxed text-white/85">
                {WELCOME_SUBTITLE}
              </p>
            </div>
            <ul className="space-y-2.5 text-sm text-white/80">
              <li className="flex items-center gap-2.5">
                <Icon
                  icon="lucide:check-circle"
                  width={18}
                  height={18}
                  className="shrink-0 text-emerald-300"
                  aria-hidden
                />
                <span>Reservas, itinerarios y documentación en un solo lugar.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Icon
                  icon="lucide:check-circle"
                  width={18}
                  height={18}
                  className="shrink-0 text-emerald-300"
                  aria-hidden
                />
                <span>Disponible 24/7 para tu equipo y clientes.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Panel derecho: datos del usuario y cerrar sesión */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-neutral-50/95">
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200/60 bg-white/95 p-4 backdrop-blur">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={brand.logo}
                alt={brand.companyTitle}
                className="h-11 w-auto max-w-[160px] shrink-0 object-contain object-left"
                width={160}
                height={44}
              />
              <span className="hidden truncate text-sm font-semibold text-brand-blue sm:inline">
                EMBARQUES
              </span>
            </div>
            <button
              type="button"
              onClick={close}
              className="motion-interactive rounded-lg p-2 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              aria-label="Cerrar"
            >
              <Icon icon="lucide:x" width={20} height={20} />
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-col justify-center p-6 sm:p-8">
            <h2
              id="auth-modal-title"
              className="mb-1 text-xl font-semibold tracking-tight text-brand-blue"
            >
              {t.auth.modalTitle}
            </h2>
            <p className="mb-6 text-sm text-neutral-500">{name}</p>

            <div className="space-y-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  {t.auth.email}
                </span>
                <p className="break-all text-[15px] font-medium text-neutral-800">
                  {email}
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  {t.auth.level}
                </span>
                <p className="text-[15px] font-medium text-neutral-800">{level}</p>
              </div>
            </div>

            <form
              action={withBase("/api/auth/signout")}
              method="post"
              className="mt-6 border-t border-neutral-200 pt-4"
            >
              <button
                type="submit"
                className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                {t.auth.signOut}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
