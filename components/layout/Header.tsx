import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { AuthWidget } from "@/components/ui/AuthWidget";
import { HeaderTitle } from "./HeaderTitle";

export function Header() {
  return (
    <header
      className="sticky top-0 z-50 h-[50px] min-h-[50px] bg-white flex items-center justify-between px-4 flex-shrink-0"
      role="banner"
    >
      <div className="flex items-center gap-3">
        <Link href="/inicio" className="h-12 w-auto flex items-center flex-shrink-0">
          <Image
            src={siteConfig.logo}
            alt={siteConfig.companyTitle}
            width={150}
            height={40}
            className="h-full w-auto object-contain object-left"
            priority
          />
        </Link>
        <HeaderTitle />
      </div>
      <AuthWidget />
    </header>
  );
}
