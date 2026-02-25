"use client";

import { useLocale } from "@/lib/i18n";

export function HeaderTitle() {
  const { t } = useLocale();

  return (
    <span className="text-sm font-normal text-brand-blue whitespace-nowrap font-sans uppercase">
      {t.header.companyTitle}
    </span>
  );
}
