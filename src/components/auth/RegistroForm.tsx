import { useState, type FormEvent } from "react";
import { useLocale } from "@/lib/i18n";

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
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-mac-modal p-6 border border-black/5">
      <h1 className="text-xl font-semibold text-brand-blue tracking-tight mb-1">
        {t.auth.signUpTitle}
      </h1>
      <p className="text-sm text-neutral-500 mb-6">
        {t.auth.signUpSubtitle}
      </p>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-medium text-neutral-600 uppercase tracking-wider mb-1.5"
          >
            {t.auth.name}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            disabled={isPending}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-brand-blue placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-neutral-600 uppercase tracking-wider mb-1.5"
          >
            {t.auth.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-brand-blue placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-neutral-600 uppercase tracking-wider mb-1.5"
          >
            {t.auth.password}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            disabled={isPending}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-brand-blue placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 px-4 rounded-lg bg-brand-blue text-white font-medium hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
