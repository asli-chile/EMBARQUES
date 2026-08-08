import { brand } from "@/lib/brand";

export function HeaderTitle() {
  return (
    <span className="text-lg font-semibold text-brand-blue whitespace-nowrap font-sans uppercase tracking-wide">
      {brand.companyTitle}
    </span>
  );
}
