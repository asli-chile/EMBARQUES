import { useState, type FormEvent } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { formStyles } from "@/lib/form-styles";

export function RegistroForm() {
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
      const res = await fetch("/api/auth/signup", {
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
        {t.auth.signUpTitle}
      </h1>
      <p className="text-sm text-neutral-500 mb-6">
        {t.auth.signUpSubtitle}
      </p>

      {error && (
        <div className={formStyles.errorMessage} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="reg-name" className={formStyles.label}>
            {t.auth.name}
          </label>
          <input
            id="reg-name"
            name="name"
            type="text"
            autoComplete="name"
            disabled={isPending}
            className={formStyles.input}
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label htmlFor="reg-email" className={formStyles.label}>
            {t.auth.email}
          </label>
          <input
            id="reg-email"
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
          <label htmlFor="reg-password" className={formStyles.label}>
            {t.auth.password}
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            disabled={isPending}
            className={formStyles.input}
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className={formStyles.submitButton}
        >
          {isPending ? t.auth.creatingAccount : t.auth.signUp}
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-neutral-500">
        {t.auth.hasAccount}{" "}
        <a
          href="/auth/login"
          className="text-brand-blue font-medium hover:underline focus:outline-none focus:underline"
        >
          {t.auth.login}
        </a>
      </p>
    </div>
  );
}
