import { useState, type FormEvent } from "react";
import { Icon } from "@iconify/react";
import { withBase } from "@/lib/basePath";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

const { email: contactEmail, phone } = siteConfig.accessRequest;

const fieldClass =
  "w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--dash-border)] bg-[var(--dash-control)] text-[var(--dash-fg)] placeholder:text-[color-mix(in_srgb,var(--dash-muted)_70%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--dash-neon)_35%,transparent)] focus:border-[color-mix(in_srgb,var(--dash-neon)_55%,transparent)] transition-all disabled:opacity-60";

const labelClass = "block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--dash-muted)] mb-1.5";

export function RegistroForm() {
  const { t } = useLocale();
  const { openAuthForm } = useAuthFormModal();
  const tr = t.auth;

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsPending(true);

    const form = e.currentTarget;
    const name = (form.querySelector<HTMLInputElement>('[name="name"]')?.value ?? "").trim();
    const company = (form.querySelector<HTMLInputElement>('[name="company"]')?.value ?? "").trim();
    const email = (form.querySelector<HTMLInputElement>('[name="email"]')?.value ?? "").trim();

    try {
      const res = await fetch(withBase("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      setIsPending(false);

      if (data.success) {
        setSuccess(typeof data.message === "string" && data.message ? data.message : tr.registeredSuccess);
        form.reset();
        return;
      }

      setError(typeof data.error === "string" && data.error ? data.error : tr.errorAcceso);
    } catch {
      setIsPending(false);
      setError(tr.errorConexion);
    }
  };

  return (
    <div>
      <h3 className="text-[17px] font-bold tracking-tight text-[var(--dash-fg)]">
        {tr.signUpTitle}
      </h3>
      <p className="mt-0.5 mb-4 text-sm text-[var(--dash-muted)]">
        {tr.signUpSubtitle}
      </p>

      <div className="mb-4 rounded-xl border border-[var(--dash-border)] bg-[color-mix(in_srgb,var(--dash-neon)_8%,transparent)] p-3.5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dash-border)] bg-[var(--dash-control)] text-[var(--dash-neon)]">
            <Icon icon="lucide:key-round" width={18} height={18} aria-hidden />
          </div>
          <p className="text-sm leading-relaxed text-[var(--dash-muted)]">
            {tr.accessInfoBody}
          </p>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--dash-neon-hot)_35%,transparent)] bg-[color-mix(in_srgb,var(--dash-neon-hot)_12%,transparent)] p-3 text-sm text-[var(--dash-fg)]"
          role="alert"
        >
          <Icon icon="lucide:alert-circle" width={15} height={15} className="mt-0.5 shrink-0 text-[var(--dash-neon-hot)]" />
          {error}
        </div>
      )}

      {success && (
        <div
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,#34d399_40%,transparent)] bg-[color-mix(in_srgb,#34d399_12%,transparent)] p-3 text-sm text-[var(--dash-fg)]"
          role="status"
        >
          <Icon icon="lucide:check-circle" width={15} height={15} className="mt-0.5 shrink-0 text-emerald-400" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3" noValidate data-erp-busy="skip">
        <div>
          <label htmlFor="access-name" className={labelClass}>
            {tr.name}
          </label>
          <input
            id="access-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            disabled={isPending}
            placeholder={tr.placeholderNombre}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="access-company" className={labelClass}>
            {tr.company}
          </label>
          <input
            id="access-company"
            name="company"
            type="text"
            autoComplete="organization"
            required
            disabled={isPending}
            placeholder={tr.placeholderCompany}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="access-email" className={labelClass}>
            {tr.email}
          </label>
          <input
            id="access-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            placeholder="correo@empresa.com"
            className={fieldClass}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="dash-cta flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Icon icon="lucide:loader-2" width={15} height={15} className="animate-spin" aria-hidden />
              {tr.creatingAccount}
            </>
          ) : (
            <>
              <Icon icon="lucide:send" width={15} height={15} aria-hidden />
              {tr.accessSubmitRequest}
            </>
          )}
        </button>
      </form>

      <div className="mb-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--dash-muted)]">
          {tr.accessContactTitle}
        </p>

        <a
          href={`mailto:${contactEmail}`}
          className="flex items-center gap-3 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-control)] px-3.5 py-2.5 text-sm text-[var(--dash-fg)] transition-colors hover:border-[color-mix(in_srgb,var(--dash-neon)_45%,transparent)]"
        >
          <Icon icon="lucide:mail" width={16} height={16} className="shrink-0 text-[var(--dash-neon)]" aria-hidden />
          <span className="break-all font-medium">{contactEmail}</span>
        </a>

        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="flex items-center gap-3 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-control)] px-3.5 py-2.5 text-sm text-[var(--dash-fg)] transition-colors hover:border-[color-mix(in_srgb,var(--dash-neon)_45%,transparent)]"
        >
          <Icon icon="lucide:phone" width={16} height={16} className="shrink-0 text-[var(--dash-neon)]" aria-hidden />
          <span className="font-medium">{phone}</span>
        </a>
      </div>

      <p className="text-center text-sm text-[var(--dash-muted)]">
        {tr.hasAccount}{" "}
        <button
          type="button"
          onClick={() => openAuthForm("login")}
          className="font-semibold text-[var(--dash-neon)] underline-offset-2 hover:underline"
        >
          {tr.login}
        </button>
      </p>
    </div>
  );
}
