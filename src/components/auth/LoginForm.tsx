import { useState, type FormEvent } from "react";
import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { formStyles } from "@/lib/form-styles";

type LoginFormProps = {
  registered?: boolean;
  /** En modal: cierra el overlay al hacer clic en "Volver al inicio". */
  onClose?: () => void;
  /** En modal: abre el formulario de registro en el mismo overlay. */
  onOpenRegistro?: () => void;
};

export function LoginForm({ registered = false, onClose, onOpenRegistro }: LoginFormProps) {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => setShowPassword((p) => !p);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const form = e.currentTarget;
    const email = (form.querySelector<HTMLInputElement>('[name="email"]')?.value ?? "").trim();
    const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value ?? "";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-brand-blue mb-6 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2 rounded"
          aria-label={t.auth.backToHome}
        >
          <Icon icon="typcn:arrow-left-outline" width={16} height={16} />
          {t.auth.backToHome}
        </button>
      ) : (
        <a
          href="/inicio"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-brand-blue mb-6 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2 rounded"
          aria-label={t.auth.backToHome}
        >
          <Icon icon="typcn:arrow-left-outline" width={16} height={16} />
          {t.auth.backToHome}
        </a>
      )}
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
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={isPending}
              className={`${formStyles.input} pr-10`}
            />
            <button
              type="button"
              onClick={handleTogglePassword}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.preventDefault()}
              tabIndex={0}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              disabled={isPending}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded transition-colors disabled:opacity-50"
            >
              <Icon icon={showPassword ? "lucide:eye-off" : "lucide:eye"} width={18} height={18} />
            </button>
          </div>
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
        {onOpenRegistro ? (
          <button
            type="button"
            onClick={onOpenRegistro}
            className="text-brand-blue font-medium hover:underline focus:outline-none focus:underline"
          >
            {t.auth.signUp}
          </button>
        ) : (
          <a
            href="/auth/registro"
            className="text-brand-blue font-medium hover:underline focus:outline-none focus:underline"
          >
            {t.auth.signUp}
          </a>
        )}
      </p>
    </div>
  );
}
