import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegistroForm } from "@/components/auth/RegistroForm";
import { brand } from "@/lib/brand";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useNeonTheme } from "@/lib/ui/neonTheme";

export function AuthFormModalOverlay() {
  const { open, mode, closeAuthForm, openAuthForm } = useAuthFormModal();
  const { t } = useLocale();
  const tr = t.auth;
  const [theme] = useNeonTheme();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthForm();
    },
    [closeAuthForm],
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

  if (!open || typeof document === "undefined") return null;

  const isLogin = mode === "login";
  const logoSrc = theme === "dark" ? brand.logoWhite : brand.logo;
  const welcomeTitle = isLogin ? tr.loginWelcomeTitle : tr.signUpWelcomeTitle;
  const welcomeBody = isLogin ? tr.loginWelcomeBody : tr.signUpWelcomeBody;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={isLogin ? tr.login : tr.signUp}
    >
      <div
        className="motion-fade absolute inset-0 bg-[#02060f]/70 backdrop-blur-md"
        aria-hidden
        onClick={closeAuthForm}
      />

      <div
        className="dash-neon motion-enter-lift relative my-auto w-full max-w-[880px] overflow-hidden rounded-2xl"
        data-theme={theme}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-neon-panel relative grid overflow-hidden md:grid-cols-[1.05fr_1fr]">
          {/* Brand / welcome */}
          <aside className="auth-neon-brand relative flex flex-col justify-between gap-8 p-6 sm:p-8">
            <div className="relative z-[1]">
              <div className="flex items-center gap-3">
                <img
                  src={logoSrc}
                  alt={brand.companyTitle}
                  className="h-11 w-auto max-w-[160px] object-contain object-left"
                  width={160}
                  height={44}
                />
                <span className="hidden h-8 w-px bg-[var(--dash-border)] sm:block" aria-hidden />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--dash-neon)]">
                  EMBARQUES
                </span>
              </div>

              <h2 className="mt-8 text-[1.65rem] font-bold leading-tight tracking-tight text-[var(--dash-fg)] sm:text-[1.85rem]">
                {welcomeTitle}
              </h2>
              <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-[var(--dash-muted)]">
                {welcomeBody}
              </p>
            </div>

            <ul className="relative z-[1] space-y-2.5 text-[13px] text-[var(--dash-muted)]">
              <li className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--dash-border)] bg-[var(--dash-control)] text-[var(--dash-neon)]">
                  <Icon icon="lucide:ship" width={14} height={14} aria-hidden />
                </span>
                {tr.authFeatureOps}
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--dash-border)] bg-[var(--dash-control)] text-[var(--dash-neon)]">
                  <Icon icon="lucide:file-text" width={14} height={14} aria-hidden />
                </span>
                {tr.authFeatureDocs}
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--dash-border)] bg-[var(--dash-control)] text-[var(--dash-neon)]">
                  <Icon icon="lucide:truck" width={14} height={14} aria-hidden />
                </span>
                {tr.authFeatureTransport}
              </li>
            </ul>
          </aside>

          {/* Form panel */}
          <div className="relative flex flex-col border-t border-[var(--dash-border)] bg-[color-mix(in_srgb,var(--dash-surface)_88%,transparent)] md:border-l md:border-t-0">
            <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6">
              <div
                className="inline-flex rounded-xl border border-[var(--dash-border)] bg-[var(--dash-control)] p-1"
                role="tablist"
                aria-label="Modo de acceso"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isLogin}
                  onClick={() => openAuthForm("login")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isLogin
                      ? "bg-[color-mix(in_srgb,var(--dash-neon)_22%,transparent)] text-[var(--dash-fg)] shadow-[0_0_16px_-6px_var(--dash-neon)]"
                      : "text-[var(--dash-muted)] hover:text-[var(--dash-fg)]"
                  }`}
                >
                  {tr.login}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isLogin}
                  onClick={() => openAuthForm("registro")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    !isLogin
                      ? "bg-[color-mix(in_srgb,var(--dash-neon)_22%,transparent)] text-[var(--dash-fg)] shadow-[0_0_16px_-6px_var(--dash-neon)]"
                      : "text-[var(--dash-muted)] hover:text-[var(--dash-fg)]"
                  }`}
                >
                  {tr.signUp}
                </button>
              </div>

              <button
                type="button"
                onClick={closeAuthForm}
                className="rounded-lg p-1.5 text-[var(--dash-muted)] transition-colors hover:bg-[var(--dash-control)] hover:text-[var(--dash-fg)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--dash-neon)_40%,transparent)]"
                aria-label={tr.closeModal}
              >
                <Icon icon="lucide:x" width={18} height={18} />
              </button>
            </div>

            <div className="px-5 pb-6 pt-4 sm:px-6 sm:pb-7">
              {isLogin ? <LoginForm /> : <RegistroForm />}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
