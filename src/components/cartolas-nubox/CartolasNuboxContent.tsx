import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";

export function CartolasNuboxContent() {
  const { t } = useLocale();
  const tr = t.cartolasNuboxPage;

  return (
    <main className="flex-1 min-h-0 overflow-auto bg-neutral-50" role="main">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-mac-modal p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center shrink-0">
              <Icon icon="lucide:file-spreadsheet" className="text-brand-blue" width={26} height={26} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight">{tr.title}</h1>
              <p className="text-neutral-600 mt-2 text-sm sm:text-base leading-relaxed">{tr.subtitle}</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-100 space-y-4 text-sm text-neutral-600 leading-relaxed">
            <p>{tr.body1}</p>
            <p className="text-neutral-500 text-xs sm:text-sm">{tr.body2}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
