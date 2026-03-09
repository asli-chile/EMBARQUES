import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { VisitorSidebarQuickAccess } from "./VisitorSidebarQuickAccess";

export type ModuleInfo = {
  title: string;
  description: string;
  highlight1: string;
  highlight2: string;
  highlight3?: string;
};

type ModuleInfoPlaceholderProps = {
  info: ModuleInfo;
  /** Ruta actual para marcar la sección activa */
  currentHref?: string;
};

/**
 * Muestra contenido informativo para visitantes externos en un módulo.
 * Describe qué hace la sección y ofrece CTA a iniciar sesión.
 */
export function ModuleInfoPlaceholder({ info, currentHref }: ModuleInfoPlaceholderProps) {
  const { t } = useLocale();

  return (
    <main className="flex-1 bg-neutral-50 min-h-0 overflow-auto p-4 sm:p-5 lg:p-6 xl:p-8" role="main">
      <div className="w-full max-w-[1200px] mx-auto space-y-5">
        {/* Accesos directos - parte superior */}
        <VisitorSidebarQuickAccess currentHref={currentHref} />

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-mac-modal p-6 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight">{info.title}</h1>
          <p className="text-neutral-500 mt-2 text-base leading-relaxed max-w-3xl">{info.description}</p>

          <div className="mt-6 flex flex-col gap-3">
            {[info.highlight1, info.highlight2, info.highlight3].filter(Boolean).map((text, i) => (
              <div key={i} className="flex items-start gap-2 text-base text-neutral-600">
                <Icon icon="typcn:media-record" className="text-brand-teal flex-shrink-0 mt-0.5" width={10} height={10} />
                {text}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100">
            <a
              href="/auth/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
            >
              <Icon icon="typcn:key" width={18} height={18} />
              {t.visitor.moduleCta}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
