import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

/**
 * Uso del plan de Claude de Rodrigo, junto al logo.
 *
 * El dato no lo calcula el ERP: lo sube cada minuto el widget de escritorio de
 * Rodrigo (que lee la sesión de Claude Code en su PC) a `claude_uso`. Por eso
 * puede quedar viejo — si el PC está apagado, el indicador lo dice en vez de
 * mostrar el último número como si fuera actual.
 *
 * Se decide por el correo del usuario autenticado, no por el perfil efectivo:
 * "ver como" no debe esconderlo ni mostrárselo a otro. La barrera real es RLS.
 */
const CORREO = "rodrigo.caceres@asli.cl";
const REFRESCO_MS = 30_000;
/**
 * Pasado esto sin noticias del widget, el dato se muestra como viejo. El widget
 * sube cada minuto; si Claude le pide esperar (429) espacia los intentos, y
 * durante esa espera el indicador lo dice en vez de fingir que está al día.
 */
const VIEJO_SEG = 5 * 60;

type Uso = {
  sesion_pct: number | null;
  sesion_reinicia: string | null;
  semana_pct: number | null;
  semana_reinicia: string | null;
  actualizado: string;
};

function colorDe(pct: number): string {
  if (pct >= 85) return "var(--estado-error)";
  if (pct >= 60) return "var(--estado-atencion)";
  return "#D97757"; // coral de Claude
}

function duracion(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

function Barra({ pct, alto }: { pct: number; alto: string }) {
  return (
    <span className={`block w-full overflow-hidden rounded-full bg-white/15 ${alto}`}>
      <span
        className="block h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: colorDe(pct) }}
      />
    </span>
  );
}

export function ClaudeUsoIndicator() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const tr = t.claudeUso;
  const habilitado = (user?.email ?? "").trim().toLowerCase() === CORREO;

  const [uso, setUso] = useState<Uso | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const cargar = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("claude_uso")
      .select("sesion_pct, sesion_reinicia, semana_pct, semana_reinicia, actualizado")
      .eq("id", 1)
      .maybeSingle();
    if (data) setUso(data as Uso);
  }, [supabase]);

  useEffect(() => {
    if (!habilitado) return;
    void cargar();
    const datos = window.setInterval(() => void cargar(), REFRESCO_MS);
    // la cuenta regresiva corre sola entre consultas
    const reloj = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => {
      window.clearInterval(datos);
      window.clearInterval(reloj);
    };
  }, [habilitado, cargar]);

  if (!habilitado || !uso) return null;

  const loc = locale === "en" ? enUS : es;
  const reinicio = uso.sesion_reinicia ? new Date(uso.sesion_reinicia) : null;
  const restante = reinicio ? (reinicio.getTime() - ahora) / 1000 : 0;
  // pasada la hora de reinicio la ventana está nueva, aunque el widget no haya avisado
  const sesionPct = restante > 0 ? Number(uso.sesion_pct ?? 0) : 0;

  const reinicioSemana = uso.semana_reinicia ? new Date(uso.semana_reinicia) : null;
  const semanaPct =
    reinicioSemana && reinicioSemana.getTime() > ahora ? Number(uso.semana_pct ?? 0) : 0;

  const edad = (ahora - new Date(uso.actualizado).getTime()) / 1000;
  const viejo = edad > VIEJO_SEG;

  return (
    <div className="group asli-no-drag relative z-10 mr-3 hidden items-center md:flex">
      <div
        className={`flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-[12px] font-semibold text-white/90 ${
          viejo ? "opacity-60" : ""
        }`}
        aria-label={tr.aria}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: viejo ? "rgb(148 163 184)" : colorDe(sesionPct) }}
          aria-hidden
        />
        <span className="tabular-nums">{Math.round(sesionPct)}%</span>
        <span className="w-12">
          <Barra pct={sesionPct} alto="h-1.5" />
        </span>
        <span className="font-medium text-white/60 tabular-nums">
          {restante > 0 && reinicio ? format(reinicio, "HH:mm") : tr.ventanaNueva}
        </span>
      </div>

      {/* Detalle al pasar el mouse */}
      <div
        className="pointer-events-none absolute right-0 top-full z-[200] mt-2 w-64 rounded-xl border border-white/10 bg-[#0B1A3D] p-4 text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
        role="tooltip"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
            {tr.sesion}
          </span>
          <span className="text-lg font-bold tabular-nums">
            {Math.round(sesionPct)}%{" "}
            <span className="text-[11px] font-medium text-white/50">{tr.usado}</span>
          </span>
        </div>
        <div className="mt-2">
          <Barra pct={sesionPct} alto="h-2" />
        </div>
        <p className="mt-2 text-[12px] text-white/80">
          {restante > 0 && reinicio
            ? `${tr.reiniciaEn} ${duracion(restante)} · ${format(reinicio, "HH:mm")}`
            : tr.ventanaNueva}
        </p>

        {reinicioSemana && (
          <>
            <div className="mt-3 flex items-baseline justify-between text-[11px]">
              <span className="font-semibold uppercase tracking-wider text-white/60">{tr.semana}</span>
              <span className="text-white/70 tabular-nums">
                {Math.round(semanaPct)}% · {format(reinicioSemana, "EEE HH:mm", { locale: loc })}
              </span>
            </div>
            <div className="mt-1.5">
              <Barra pct={semanaPct} alto="h-1" />
            </div>
          </>
        )}

        <p className={`mt-3 text-[11px] ${viejo ? "text-[var(--estado-atencion)]" : "text-white/40"}`}>
          {viejo
            ? `${tr.sinNoticias} ${duracion(edad)}`
            : `${tr.quedan} ${Math.max(0, 100 - Math.round(sesionPct))}%`}
        </p>
      </div>
    </div>
  );
}
