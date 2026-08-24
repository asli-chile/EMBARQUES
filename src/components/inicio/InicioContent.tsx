import { useState, useEffect, useRef, useLayoutEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n";
import { brand } from "@/lib/brand";
import { useAuth } from "@/lib/auth/AuthContext";
import { applyOperacionesClienteFilter, shouldSkipOperacionesForCliente } from "@/lib/auth/operacionesClienteScope";
import { shouldUseHeavyVisualEffects } from "@/lib/ui/devicePerf";
import "@/styles/inicio.css";
import {
  emptyKpiData,
  monthKey,
  type KpiData,
} from "./inicio-data";
import { InicioBackground } from "./InicioBackground";
import { InicioHero } from "./InicioHero";
import { InicioLoggedInHome } from "./InicioLoggedInHome";
import { InicioGuestLanding } from "./InicioGuestLanding";
import { InicioAuthSkeleton } from "./InicioSkeleton";
import { InicioFooter, ScrollTopButton } from "./inicio-ui";

const CLOSED_ESTADOS = new Set(["CANCELADO", "ARRIBADO", "ARRIBADA", "COMPLETADO", "COMPLETADA"]);

export function InicioContent() {
  const { t } = useLocale();
  const { profile, isExternalUser, isLoading: authLoading, isCliente, isEjecutivo, empresaNombres } = useAuth();
  const isLoggedIn = !authLoading && !isExternalUser && profile !== null;
  const mainRef = useRef<HTMLElement>(null);
  const bgParallaxRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [kpiData, setKpiData] = useState<KpiData>(emptyKpiData);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    if (!shouldUseHeavyVisualEffects()) return;
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
    if (!main || authLoading || !shouldUseHeavyVisualEffects()) return;

    let reverted = false;
    let revert = () => {};

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (reverted || !mainRef.current) return;
      gsap.registerPlugin(ScrollTrigger);
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
      revert = () => ctx.revert();
    });

    return () => {
      reverted = true;
      revert();
    };
  }, [isLoggedIn, authLoading]);

  useEffect(() => {
    if (loadingKpis || authLoading || !shouldUseHeavyVisualEffects()) return;
    void import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
  }, [loadingKpis, isLoggedIn, authLoading]);

  useEffect(() => {
    if (!supabase || authLoading) return;
    const fetchKpiData = async () => {
      try {
        if (shouldSkipOperacionesForCliente({ isCliente, isEjecutivo, empresaNombres })) {
          setKpiData(emptyKpiData());
          return;
        }

        const now = new Date();
        const thisMonth = monthKey(now);
        const prevMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

        let opsQuery = supabase
          .from("operaciones")
          .select("id, contenedor, estado_operacion, created_at, etd")
          .is("deleted_at", null);
        opsQuery = applyOperacionesClienteFilter(opsQuery, { isCliente, isEjecutivo, empresaNombres });
        const { data: operaciones } = await opsQuery;

        const ops = operaciones || [];

        let operacionesMesActual = 0;
        let operacionesMesAnterior = 0;
        let operacionesCompletadas = 0;

        for (const o of ops) {
          const estado = (o.estado_operacion ?? "").trim().toUpperCase();
          if (CLOSED_ESTADOS.has(estado)) operacionesCompletadas += 1;

          const raw = o.created_at || o.etd;
          if (!raw) continue;
          const d = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw);
          if (Number.isNaN(d.getTime())) continue;
          const key = monthKey(d);
          if (key === thisMonth) operacionesMesActual += 1;
          if (key === prevMonth) operacionesMesAnterior += 1;
        }

        setKpiData({
          operacionesTotal: ops.length,
          contenedoresHistoricos: new Set(ops.map((o) => o.contenedor).filter(Boolean)).size,
          operacionesMesActual,
          operacionesMesAnterior,
          operacionesCompletadas,
        });
      } catch {
        // mantener valores por defecto
      } finally {
        setLoadingKpis(false);
      }
    };

    fetchKpiData();
  }, [supabase, authLoading, isCliente, isEjecutivo, empresaNombres]);

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
          <InicioHero t={t.inicio} isLoggedIn={isLoggedIn} profile={profile} isCliente={isCliente} compact={isLoggedIn} />

          {isLoggedIn ? (
            <InicioLoggedInHome kpiData={kpiData} loadingKpis={loadingKpis} isCliente={isCliente} />
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
