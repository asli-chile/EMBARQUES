import { brand } from "@/lib/brand";

export function HeaderTitle() {
  return (
    <span className="text-sm font-normal text-brand-blue whitespace-nowrap font-sans uppercase">
      {brand.companyTitle}
    </span>
  );
}
