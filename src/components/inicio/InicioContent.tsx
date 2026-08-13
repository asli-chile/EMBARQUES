import { useState, useEffect, useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n";
import { brand } from "@/lib/brand";
import { useAuth } from "@/lib/auth/AuthContext";
import "@/styles/inicio.css";
import type { KpiData } from "./inicio-data";
import { InicioBackground } from "./InicioBackground";
import { InicioHero } from "./InicioHero";
import { InicioLoggedInHome } from "./InicioLoggedInHome";
import { InicioGuestLanding } from "./InicioGuestLanding";
import { InicioAuthSkeleton } from "./InicioSkeleton";
import { InicioFooter, ScrollTopButton } from "./inicio-ui";

gsap.registerPlugin(ScrollTrigger);

export function InicioContent() {
  const { t } = useLocale();
  const { profile, isExternalUser, isLoading: authLoading } = useAuth();
  const isLoggedIn = !authLoading && !isExternalUser && profile !== null;
  const mainRef = useRef<HTMLElement>(null);
  const bgParallaxRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [kpiData, setKpiData] = useState<KpiData>({
    operacionesActivas: 0,
    contenedores: 0,
    proximosEtd: 0,
    documentosPendientes: 0,
  });
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    const id = "inicio-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    try {
      setSupabase(createClient());
    } catch {
      setSupabase(null);
      setLoadingKpis(false);
    }
  }, []);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;
    const handleScroll = () => setShowScrollTop(mainElement.scrollTop > 400);
    mainElement.addEventListener("scroll", handleScroll);
    return () => mainElement.removeEventListener("scroll", handleScroll);
  }, []);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main || authLoading) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const heroItems = main.querySelectorAll<HTMLElement>("[data-hero-item]");
      if (heroItems.length) {
        gsap.set(heroItems, { autoAlpha: 0, y: 28 });
        gsap.to(heroItems, {
          autoAlpha: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.1,
          ease: "power3.out",
          delay: 0.05,
        });
      }

      const parallaxEl = bgParallaxRef.current;
      if (parallaxEl) {
        gsap.to(parallaxEl, {
          y: 48,
          ease: "none",
          scrollTrigger: {
            trigger: main,
            scroller: main,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.45,
          },
        });
      }

      main.querySelectorAll<HTMLElement>("[data-inicio-section]").forEach((section) => {
        const items = section.querySelectorAll<HTMLElement>("[data-inicio-reveal]");
        if (!items.length) return;
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 32 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.06,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              scroller: main,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          },
        );
      });
    }, main);

    return () => ctx.revert();
  }, [isLoggedIn, authLoading]);

  useEffect(() => {
    if (!loadingKpis && !authLoading) {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  }, [loadingKpis, isLoggedIn, authLoading]);

  useEffect(() => {
    if (!supabase) return;
    const fetchKpiData = async () => {
      try {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const todayStr = today.toISOString().split("T")[0];
        const nextWeekStr = nextWeek.toISOString().split("T")[0];
        const estadosFinalizados = ["COMPLETADO", "CANCELADO", "ARRIBADO"];

        const { data: operaciones } = await supabase
          .from("operaciones")
          .select("id, contenedor, etd, estado_operacion")
          .is("deleted_at", null);

        const { count: docCount } = await supabase.from("documentos").select("id", { count: "exact", head: true });

        const ops = operaciones || [];
        const operacionesActivas = ops.filter(
          (o) => !estadosFinalizados.includes(o.estado_operacion?.toUpperCase() || ""),
        ).length;
        const contenedoresUnicos = new Set(ops.map((o) => o.contenedor).filter(Boolean)).size;
        const proximosEtd = ops.filter((o) => {
          if (!o.etd) return false;
          const etdDate = o.etd.split("T")[0];
          return etdDate >= todayStr && etdDate <= nextWeekStr;
        }).length;

        setKpiData({
          operacionesActivas,
          contenedores: contenedoresUnicos,
          proximosEtd,
          documentosPendientes: docCount || 0,
        });
      } catch {
        // mantener valores por defecto
      } finally {
        setLoadingKpis(false);
      }
    };

    fetchKpiData();
  }, [supabase]);

  const handleScrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main
      ref={mainRef}
      className="inicio-surface flex-1 min-h-0 overflow-auto relative isolate scroll-smooth"
      role="main"
    >
      <InicioBackground parallaxRef={bgParallaxRef} />

      {authLoading ? (
        <InicioAuthSkeleton />
      ) : (
        <>
          <InicioHero t={t.inicio} isLoggedIn={isLoggedIn} profile={profile} compact={isLoggedIn} />

          {isLoggedIn ? (
            <InicioLoggedInHome kpiData={kpiData} loadingKpis={loadingKpis} />
          ) : (
            <InicioGuestLanding kpiData={kpiData} loadingKpis={loadingKpis} />
          )}

          <InicioFooter t={t.inicio} brand={brand} />
        </>
      )}

      <ScrollTopButton visible={showScrollTop && !authLoading} onClick={handleScrollToTop} />
    </main>
  );
}
