import { Icon } from "@iconify/react";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

const { email, phone, mailtoSubject } = siteConfig.accessRequest;
const mailtoHref = `mailto:${email}?subject=${encodeURIComponent(mailtoSubject)}`;

export function RegistroForm() {
  const { t } = useLocale();
  const { openAuthForm } = useAuthFormModal();
  const tr = t.auth;

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

      <div className="space-y-2.5 mb-5">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          {tr.accessContactTitle}
        </p>

        <a
          href={mailtoHref}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-800 hover:border-brand-blue/30 hover:bg-white transition-colors group"
        >
          <Icon
            icon="lucide:mail"
            width={16}
            height={16}
            className="text-brand-blue shrink-0"
            aria-hidden
          />
          <span className="font-medium break-all group-hover:text-brand-blue">{email}</span>
        </a>

        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-800 hover:border-brand-blue/30 hover:bg-white transition-colors group"
        >
          <Icon
            icon="lucide:phone"
            width={16}
            height={16}
            className="text-brand-blue shrink-0"
            aria-hidden
          />
          <span className="font-medium group-hover:text-brand-blue">{phone}</span>
        </a>
      </div>

      <a
        href={mailtoHref}
        className="mb-2.5 w-full py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:ring-offset-2 transition-all flex items-center justify-center gap-2"
      >
        <Icon icon="lucide:send" width={15} height={15} aria-hidden />
        {tr.accessWriteEmail}
      </a>

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
