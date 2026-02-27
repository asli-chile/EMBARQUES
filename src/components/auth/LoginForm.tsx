import { useState, type FormEvent } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { formStyles } from "@/lib/form-styles";

type LoginFormProps = {
  registered?: boolean;
};

export function LoginForm({ registered = false }: LoginFormProps) {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      setIsPending(false);
      if (data.success && data.redirect) {
        window.location.href = data.redirect;
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setIsPending(false);
      setError("Error de conexión");
    }
  };

  return (
    <div className={formStyles.card}>
      <a
        href="/inicio"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-brand-blue mb-6 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2 rounded"
        aria-label={t.auth.backToHome}
      >
        <Icon icon="typcn:arrow-left-outline" width={16} height={16} />
        {t.auth.backToHome}
      </a>
      <h1 className="text-xl font-semibold text-brand-blue tracking-tight mb-1">
        {t.auth.loginTitle}
      </h1>
      <p className="text-sm text-neutral-500 mb-6">
        {t.auth.loginSubtitle}
      </p>

      {registered && (
        <div className={formStyles.successMessage} role="status">
          {t.auth.registeredSuccess}
        </div>
      )}

      {error && (
        <div className={formStyles.errorMessage} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="login-email" className={formStyles.label}>
            {t.auth.email}
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            className={formStyles.input}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div>
          <label htmlFor="login-password" className={formStyles.label}>
            {t.auth.password}
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isPending}
            className={formStyles.input}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className={formStyles.submitButton}
        >
          {isPending ? t.auth.loggingIn : t.auth.login}
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-neutral-500">
        {t.auth.noAccount}{" "}
        <a
          href="/auth/registro"
          className="text-brand-blue font-medium hover:underline focus:outline-none focus:underline"
        >
          {t.auth.signUp}
        </a>
      </p>
    </div>
  );
}
