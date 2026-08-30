import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { brand } from "@/lib/brand";
import { useLocale } from "@/lib/i18n";
import { InicioBackground } from "@/components/inicio/InicioBackground";
import { InicioFooter, ScrollTopButton } from "@/components/inicio/inicio-ui";
import "@/styles/inicio.css";

/** Carga la tipografía condensada compartida con Inicio. */
export function useInicioFonts() {
  useEffect(() => {
    const id = "inicio-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

export function useScrollTop(mainRef: RefObject<HTMLElement | null>) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 400);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [mainRef]);

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return { showScrollTop, scrollToTop };
}

/** Shell visual compartido: Inicio / Servicios / Sobre nosotros. */
export function MarketingPageShell({ children }: { children: ReactNode }) {
  useInicioFonts();
  const { t } = useLocale();
  const mainRef = useRef<HTMLElement>(null);
  const bgParallaxRef = useRef<HTMLDivElement>(null);
  const { showScrollTop, scrollToTop } = useScrollTop(mainRef);

  return (
    <main
      ref={mainRef}
      className="inicio-surface flex-1 min-h-0 overflow-auto relative isolate scroll-smooth"
      role="main"
    >
      <InicioBackground parallaxRef={bgParallaxRef} />
      {children}
      <InicioFooter t={t.inicio} brand={brand} />
      <ScrollTopButton visible={showScrollTop} onClick={scrollToTop} />
    </main>
  );
}
