import { Icon } from "@iconify/react";
import { useLocale } from "@/lib/i18n";
import { brand, icons } from "@/lib/brand";

const features = [
  { key: "featureShipments" as const, icon: "typcn:folder" },
  { key: "featureContainers" as const, icon: "typcn:location" },
  { key: "featureDocuments" as const, icon: "typcn:document" },
  { key: "featureTransport" as const, icon: "typcn:plane" },
  { key: "featureReports" as const, icon: "typcn:chart-bar" },
  { key: "featureClients" as const, icon: "typcn:user" },
] as const;

const benefitKeys = [
  "benefitErrors",
  "benefitCentralize",
  "benefitTime",
  "benefitTraceability",
  "benefitControl",
] as const;

const quickLinkKeys = [
  { key: "quickDashboard" as const, href: "/dashboard", icon: "mdi:view-dashboard-outline" },
  { key: "quickCreate" as const, href: "/reservas/crear", icon: "mdi:plus-circle-outline" },
  { key: "quickRecords" as const, href: "/registros", icon: "mdi:folder-outline" },
  {
    key: "quickDocument" as const,
    href: "/documentos/mis-documentos",
    icon: "mdi:file-document-outline",
  },
] as const;

const kpiKeys = [
  { key: "kpiOperations" as const, value: "12", icon: "typcn:flag" },
  { key: "kpiContainers" as const, value: "8", icon: "typcn:location" },
  { key: "kpiEtd" as const, value: "5", icon: "typcn:calendar" },
  { key: "kpiAlerts" as const, value: "2", icon: "typcn:info-large" },
] as const;

export function InicioContent() {
  const { t } = useLocale();

  return (
    <main className="flex-1 min-h-0 overflow-auto" role="main">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-blue via-brand-dark-teal to-brand-blue text-white min-h-full flex flex-col justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[280%] h-[280%] -left-[90%] -top-[90%] -rotate-45 grid gap-1 opacity-[0.12]"
            style={{ gridTemplateColumns: "repeat(60, 1fr)" }}
          >
            {Array.from({ length: 2400 }).map((_, i) => (
              <img
                key={i}
                src={brand.logo}
                alt=""
                width={16}
                height={8}
                className="w-4 h-2 min-w-4 min-h-2 object-contain brightness-0 invert"
                loading="lazy"
              />
            ))}
          </div>
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-12 sm:py-16 lg:py-20 flex-1 flex flex-col justify-center">
          <div className="flex flex-col items-center text-center">
            <img
              src={brand.logo}
              alt={brand.companyTitle}
              width={400}
              height={200}
              className="h-24 w-auto object-contain mb-6 brightness-0 invert"
              loading="eager"
            />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-3">
              {t.inicio.heroTitle}
            </h1>
            <p className="text-base sm:text-lg text-white/90 max-w-2xl mb-8">
              {t.inicio.heroDescription}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/auth/login"
                className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg bg-white text-brand-blue font-semibold hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-brand-blue transition-colors"
              >
                <Icon icon={icons.auth} width={18} height={18} />
                {t.inicio.ctaLogin}
              </a>
              <a
                href="#funcionalidades"
                className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg border-2 border-white/80 text-white font-medium hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-brand-blue transition-colors"
              >
                <Icon icon="typcn:th-large" width={18} height={18} />
                {t.inicio.ctaModules}
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Funcionalidades */}
      <section
        id="funcionalidades"
        className="py-12 sm:py-16 bg-white"
      >
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight text-center mb-10">
            {t.inicio.featuresTitle}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ key, icon }) => (
              <div
                key={key}
                className="group p-5 rounded-lg bg-white border border-neutral-200 shadow-sm hover:shadow-mac-modal hover:border-brand-blue/20 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-lg bg-brand-blue/10 flex items-center justify-center mb-3 group-hover:bg-brand-blue/15 transition-colors">
                  <Icon
                    icon={icon}
                    className="text-brand-blue"
                    width={24}
                    height={24}
                  />
                </div>
                <h3 className="text-base font-semibold text-brand-blue">
                  {t.inicio[key]}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-12 sm:py-16 bg-neutral-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight text-center mb-10">
            {t.inicio.benefitsTitle}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefitKeys.map((key) => (
              <div
                key={key}
                className="group flex items-start gap-4 p-5 rounded-lg bg-white border border-neutral-200 shadow-sm hover:shadow-mac-modal hover:border-brand-olive/30 transition-all duration-200"
              >
                <span className="flex-shrink-0 w-11 h-11 rounded-lg bg-brand-olive/15 flex items-center justify-center group-hover:bg-brand-olive/25 transition-colors">
                  <Icon
                    icon="typcn:tick"
                    className="text-brand-olive"
                    width={24}
                    height={24}
                  />
                </span>
                <p className="text-sm font-medium text-neutral-800 pt-1.5">
                  {t.inicio[key]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accesos rápidos */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight text-center mb-10">
            {t.inicio.quickLinksTitle}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {quickLinkKeys.map(({ key, href, icon }) => (
              <a
                key={key}
                href={href}
                className="group flex flex-col items-center gap-4 p-6 rounded-lg bg-white border border-neutral-200 shadow-sm hover:shadow-mac-modal hover:border-brand-blue/30 transition-all duration-200"
              >
                <div className="w-14 h-14 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/10 group-hover:bg-brand-blue/15 group-hover:border-brand-blue/20 group-hover:scale-105 transition-all duration-200">
                  <Icon icon={icon} width={28} height={28} />
                </div>
                <span className="text-sm font-semibold text-brand-blue text-center">
                  {t.inicio[key]}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Mini dashboard KPI mock */}
      <section className="py-12 sm:py-16 bg-neutral-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-brand-blue tracking-tight text-center mb-10">
            {t.inicio.kpiTitle}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {kpiKeys.map(({ key, value, icon }) => (
              <div
                key={key}
                className="p-5 rounded-lg bg-white border border-neutral-200 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    icon={icon}
                    className="text-brand-teal"
                    width={20}
                    height={20}
                  />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {t.inicio[key]}
                  </span>
                </div>
                <p className="text-2xl font-bold text-brand-blue">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-brand-blue text-white/80">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="font-semibold text-white/95">ASLI</p>
          <p className="text-xs mt-1">{brand.companyTitle}</p>
          <p className="text-xs mt-2 text-white/60">
            © {new Date().getFullYear()} — {t.inicio.footerTagline}
          </p>
        </div>
      </footer>
    </main>
  );
}
