import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";
import { VisitorSidebarQuickAccess } from "@/components/layout/VisitorSidebarQuickAccess";

const FEATURES = [
  { icon: "typcn:document-add", href: "/reservas/crear", color: "text-brand-blue" },
  { icon: "typcn:th-list", href: "/registros", color: "text-brand-teal" },
  { icon: "typcn:plane-outline", href: "/transportes/reserva-asli", color: "text-brand-olive" },
  { icon: "typcn:folder", href: "/documentos/mis-documentos", color: "text-brand-blue" },
  { icon: "typcn:calculator", href: "/transportes/facturacion", color: "text-brand-teal" },
  { icon: "typcn:chart-bar-outline", href: "/dashboard", color: "text-brand-olive" },
] as const;

export function DashboardVisitorContent() {
  const { t } = useLocale();
  const v = t.visitor.dashboard;
  const items = [v.item1, v.item2, v.item3, v.item4, v.item5, v.item6];

  return (
    <main className="flex-1 min-h-0 overflow-auto bg-neutral-50" role="main">
      <div className="w-full min-h-full p-3 sm:p-4 max-w-[1400px] mx-auto">
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-4 animate-fade-in-up flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <a
                href="/inicio"
                className="inline-flex items-center gap-2 text-base text-brand-blue font-medium hover:underline
                  focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2 rounded px-1 -ml-1
                  transition-colors duration-200"
              >
                <Icon icon="typcn:arrow-left-outline" width={20} height={20} />
                {v.backToInicio}
              </a>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-medium text-neutral-500 mr-1 hidden sm:inline">{v.directAccess}:</span>
                {siteConfig.navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="px-3 py-1.5 text-base font-medium text-brand-blue bg-white border border-neutral-200
                      rounded-lg hover:bg-brand-blue hover:text-white hover:border-brand-blue
                      transition-colors duration-200
                      focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2"
                  >
                    {t.nav[item.labelKey]}
                  </a>
                ))}
              </div>
            </div>
            <VisitorSidebarQuickAccess currentHref="/dashboard" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0">
            <div className="xl:col-span-5 animate-fade-in-up [animation-delay:30ms]">
              <div className="bg-white rounded-xl border border-neutral-200 shadow-mac-modal p-4 sm:p-5 lg:p-6 h-full">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-blue tracking-tight">
                  {v.title}
                </h1>
                <p className="text-neutral-600 mt-2 text-base">{v.subtitle}</p>
                <p className="text-neutral-500 mt-4 text-base leading-relaxed">
                  {v.description}
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <a
                    href="/auth/login"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-base font-medium text-white
                      bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors
                      focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:ring-offset-2"
                  >
                    <Icon icon="typcn:key" width={18} height={18} />
                    {v.cta}
                  </a>
                  <a
                    href="/auth/signup"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-base font-medium text-brand-blue
                      bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors
                      focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2"
                  >
                    {v.ctaSubtext}
                  </a>
                </div>
              </div>
            </div>

            <div className="xl:col-span-7">
              <h2 className="text-base font-semibold text-brand-blue mb-3 px-1 animate-fade-in-up [animation-delay:50ms]">
                {v.whatYouCanDo}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {items.map((label, i) => (
                <a
                  key={i}
                  href={FEATURES[i].href}
                  className="group flex items-start gap-4 p-4 sm:p-5 bg-white rounded-xl border border-neutral-200
                    shadow-mac-modal hover:shadow-md hover:border-brand-blue/30 hover:-translate-y-0.5
                    transition-all duration-200 ease-out
                    animate-fade-in-up focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:ring-offset-2"
                  style={{ animationDelay: `${80 + i * 50}ms` }}
                >
                  <span
                    className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
                      bg-neutral-100 group-hover:bg-brand-blue/10 transition-colors duration-200 ${FEATURES[i].color}`}
                  >
                    <Icon icon={FEATURES[i].icon} width={26} height={26} />
                  </span>
                  <span className="text-base text-neutral-700 group-hover:text-brand-blue transition-colors duration-200 leading-snug pt-1">
                    {label}
                  </span>
                </a>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
