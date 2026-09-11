import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { withBase } from "@/lib/basePath";
import { AuthFormTrigger } from "@/components/auth/AuthFormTrigger";

type VisitorModuleGateProps = {
  title: string;
  description: string;
  highlights?: string[];
};

/**
 * Pantalla para visitantes sin sesión: misma superficie neon del ERP,
 * sin chrome/layout antiguos ni chips de “accesos rápidos”.
 */
export function VisitorModuleGate({ title, description, highlights = [] }: VisitorModuleGateProps) {
  const { t } = useLocale();
  const items = highlights.filter(Boolean);

  return (
    <main
      className="relative isolate flex min-h-0 flex-1 flex-col overflow-auto bg-[#050914]"
      role="main"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 20% 0%, rgba(0,180,180,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(37,99,235,0.16), transparent 50%)",
        }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300/80">
          {t.visitor.moduleTitle}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-base">{description}</p>

        {items.length > 0 ? (
          <ul className="mt-8 space-y-3">
            {items.map((text) => (
              <li key={text} className="flex items-start gap-2.5 text-sm text-white/75">
                <Icon
                  icon="lucide:check"
                  width={16}
                  height={16}
                  className="mt-0.5 shrink-0 text-teal-300"
                />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <AuthFormTrigger
            mode="login"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-semibold text-[#041018] transition hover:bg-teal-300"
          >
            <Icon icon="lucide:log-in" width={16} height={16} />
            {t.visitor.moduleCta}
          </AuthFormTrigger>
          <a
            href={withBase("/inicio")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            {t.visitor.dashboard.backToInicio}
          </a>
        </div>
      </div>
    </main>
  );
}
