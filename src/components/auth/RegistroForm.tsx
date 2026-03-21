import { useState, type FormEvent } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";

export function RegistroForm() {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      setIsPending(false);
      if (data.success && data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      setError(
        (typeof data?.error === "string" && data.error) ||
          (res.status === 400 && t.auth.errorDatos) ||
          t.auth.errorAcceso
      );
    } catch {
      setIsPending(false);
      setError(t.auth.errorConexion);
    }
  };

  return (
    <div>
      <h2 className="text-[17px] font-bold text-neutral-900 tracking-tight">
        {t.auth.signUpTitle}
      </h2>
      <p className="text-sm text-neutral-500 mt-0.5 mb-5">
        {t.auth.signUpSubtitle}
      </p>

      {error && (
        <div
          className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm"
          role="alert"
        >
          <Icon icon="lucide:alert-circle" width={15} height={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div>
          <label htmlFor="reg-name" className="block text-xs font-semibold text-neutral-600 mb-1.5">
            {t.auth.name}
          </label>
          <input
            id="reg-name"
            name="name"
            type="text"
            autoComplete="name"
            disabled={isPending}
            placeholder={t.auth.placeholderNombre}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-xs font-semibold text-neutral-600 mb-1.5">
            {t.auth.email}
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            placeholder="correo@empresa.com"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-xs font-semibold text-neutral-600 mb-1.5">
            {t.auth.password}
          </label>
          <div className="relative">
            <input
              id="reg-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              disabled={isPending}
              placeholder={t.auth.placeholderPassword}
              className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              tabIndex={-1}
              aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
              disabled={isPending}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50"
            >
              <Icon icon={showPassword ? "lucide:eye-off" : "lucide:eye"} width={16} height={16} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="mt-1 w-full py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Icon icon="typcn:refresh" width={14} height={14} className="animate-spin" />
              {t.auth.creatingAccount}
            </>
          ) : (
            t.auth.signUp
          )}
        </button>
      </form>
    </div>
  );
}
