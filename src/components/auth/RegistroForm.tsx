import { useState, type FormEvent } from "react";
import { Icon } from "@iconify/react";
import { withBase } from "@/lib/basePath";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

const { email: contactEmail, phone } = siteConfig.accessRequest;

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
      <h2 className="text-[17px] font-bold text-neutral-900 tracking-tight">
        {tr.signUpTitle}
      </h2>
      <p className="text-sm text-neutral-500 mt-0.5 mb-5">
        {tr.signUpSubtitle}
      </p>

      <div className="rounded-xl border border-brand-blue/15 bg-brand-blue/[0.04] p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
            <Icon icon="lucide:key-round" width={18} height={18} aria-hidden />
          </div>
          <p className="text-sm text-neutral-700 leading-relaxed">
            {tr.accessInfoBody}
          </p>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm"
          role="alert"
        >
          <Icon icon="lucide:alert-circle" width={15} height={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div
          className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm"
          role="status"
        >
          <Icon icon="lucide:check-circle" width={15} height={15} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-4" noValidate data-erp-busy="skip">
        <div>
          <label htmlFor="access-name" className="block text-xs font-semibold text-neutral-600 mb-1.5">
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
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="access-company" className="block text-xs font-semibold text-neutral-600 mb-1.5">
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
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="access-email" className="block text-xs font-semibold text-neutral-600 mb-1.5">
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
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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

      <div className="space-y-2.5 mb-4">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          {tr.accessContactTitle}
        </p>

        <a
          href={`mailto:${contactEmail}`}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-800 hover:border-brand-blue/30 hover:bg-white transition-colors group"
        >
          <Icon icon="lucide:mail" width={16} height={16} className="text-brand-blue shrink-0" aria-hidden />
          <span className="font-medium break-all group-hover:text-brand-blue">{contactEmail}</span>
        </a>

        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-800 hover:border-brand-blue/30 hover:bg-white transition-colors group"
        >
          <Icon icon="lucide:phone" width={16} height={16} className="text-brand-blue shrink-0" aria-hidden />
          <span className="font-medium group-hover:text-brand-blue">{phone}</span>
        </a>
      </div>

      <button
        type="button"
        onClick={() => openAuthForm("login")}
        className="w-full py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
      >
        {tr.hasAccount} {tr.login}
      </button>
    </div>
  );
}
