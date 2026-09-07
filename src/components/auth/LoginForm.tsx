import { useState, type FormEvent } from "react";
import { Icon } from "@iconify/react";
import { withBase } from "@/lib/basePath";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";
import { useLocale } from "@/lib/i18n";

const fieldClass =
  "w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--dash-border)] bg-[var(--dash-control)] text-[var(--dash-fg)] placeholder:text-[color-mix(in_srgb,var(--dash-muted)_70%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--dash-neon)_35%,transparent)] focus:border-[color-mix(in_srgb,var(--dash-neon)_55%,transparent)] transition-all disabled:opacity-60";

const labelClass = "block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--dash-muted)] mb-1.5";

export function LoginForm() {
  const { t } = useLocale();
  const { openAuthForm } = useAuthFormModal();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const form = e.currentTarget;
    const email = (form.querySelector<HTMLInputElement>('[name="email"]')?.value ?? "").trim();
    const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value ?? "";

    try {
      const res = await fetch(withBase("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      setIsPending(false);
      if (data.success) {
        window.erpBusy?.show();
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        const target =
          next && next.startsWith("/") && !next.startsWith("//") ? next : data.redirect ?? "/inicio";
        window.location.href = withBase(target);
        return;
      }
      window.erpBusy?.hide();
      setError(typeof data?.error === "string" && data.error ? data.error : t.auth.errorAcceso);
    } catch {
      setIsPending(false);
      window.erpBusy?.hide();
      setError(t.auth.errorConexion);
    }
  };

  return (
    <div>
      <h3 className="text-[17px] font-bold tracking-tight text-[var(--dash-fg)]">
        {t.auth.loginTitle}
      </h3>
      <p className="mt-0.5 mb-5 text-sm text-[var(--dash-muted)]">
        {t.auth.loginSubtitle}
      </p>

      {error && (
        <div
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--dash-neon-hot)_35%,transparent)] bg-[color-mix(in_srgb,var(--dash-neon-hot)_12%,transparent)] p-3 text-sm text-[var(--dash-fg)]"
          role="alert"
        >
          <Icon icon="lucide:alert-circle" width={15} height={15} className="mt-0.5 shrink-0 text-[var(--dash-neon-hot)]" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate data-erp-busy="skip">
        <div>
          <label htmlFor="login-email" className={labelClass}>
            {t.auth.email}
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            placeholder="correo@empresa.com"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="login-password" className={labelClass}>
            {t.auth.password}
          </label>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={isPending}
              className={`${fieldClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              tabIndex={-1}
              aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
              disabled={isPending}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dash-muted)] transition-colors hover:text-[var(--dash-fg)] disabled:opacity-50"
            >
              <Icon icon={showPassword ? "lucide:eye-off" : "lucide:eye"} width={16} height={16} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="dash-cta mt-1 flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Icon icon="typcn:refresh" width={14} height={14} className="animate-spin" />
              {t.auth.loggingIn}
            </>
          ) : (
            <>
              <Icon icon="lucide:log-in" width={15} height={15} aria-hidden />
              {t.auth.login}
            </>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--dash-muted)]">
        {t.auth.noAccount}{" "}
        <button
          type="button"
          onClick={() => openAuthForm("registro")}
          className="font-semibold text-[var(--dash-neon)] underline-offset-2 hover:underline"
        >
          {t.auth.signUp}
        </button>
      </p>
    </div>
  );
}
