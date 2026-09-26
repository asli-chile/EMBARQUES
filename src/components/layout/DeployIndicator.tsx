import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { esDueno } from "@/lib/herramientas-dueno";

/**
 * Estado del último deploy de `master` en Vercel (embarques y web2), junto al logo.
 *
 * No consulta a Vercel: cada proyecto publica su estado como *commit status* en
 * GitHub ("Vercel – embarques", "Vercel – web2"), y como el repo es público el
 * navegador lo lee sin credenciales. No hay token, tabla ni variable de entorno
 * que mantener, y los deploys siguen igual que siempre.
 *
 * El costo es el límite de GitHub sin autenticar: 60 consultas por hora por IP.
 * Por eso consulta cada 20 s solo mientras hay un deploy en curso, cada 90 s en
 * reposo, se pausa con la pestaña oculta y, si GitHub corta, espera a su reset.
 */
const REPO = "asli-chile/embarques";
const RAMA = "master";
const RAPIDO_MS = 20_000;
const REPOSO_MS = 90_000;
/** Los proyectos que se muestran, en este orden, aunque aún no hayan reportado. */
const PROYECTOS = ["embarques", "web2"] as const;

type EstadoGh = "pending" | "success" | "failure" | "error";
type Proyecto = { nombre: string; estado: EstadoGh | null; url: string | null; desde: string | null };
type Deploy = { sha: string; proyectos: Proyecto[] };
type Commit = { mensaje: string; fecha: string };

const COLOR: Record<EstadoGh, string> = {
  pending: "var(--estado-curso)",
  success: "var(--estado-ok)",
  failure: "var(--estado-error)",
  error: "var(--estado-error)",
};

function hace(iso: string | null, ahora: number, corto = false): string {
  if (!iso) return "";
  const s = Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 1000));
  const sep = corto ? "" : " ";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}${sep}${corto ? "m" : "min"}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${sep}h`;
  return `${Math.floor(h / 24)}${sep}d`;
}

function Punto({ estado }: { estado: EstadoGh | null }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${estado === "pending" ? "animate-pulse" : ""}`}
      style={{ background: estado ? COLOR[estado] : "rgb(255 255 255 / 0.3)" }}
      aria-hidden
    />
  );
}

export function DeployIndicator() {
  const { user } = useAuth();
  const { t } = useLocale();
  const tr = t.deployIndicador;
  const habilitado = esDueno(user?.email);

  const [deploy, setDeploy] = useState<Deploy | null>(null);
  const [commit, setCommit] = useState<Commit | null>(null);
  const [pausaHasta, setPausaHasta] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const shaCommit = useRef<string | null>(null);
  const pausaRef = useRef<number | null>(null);

  /** Devuelve si queda algún deploy en curso, para decidir el próximo intervalo. */
  const cargar = useCallback(async (): Promise<boolean> => {
    // Con el límite agotado, insistir no sirve: se espera al reset que dio GitHub.
    if (pausaRef.current && Date.now() < pausaRef.current) return false;
    const r = await fetch(`https://api.github.com/repos/${REPO}/commits/${RAMA}/status`, {
      cache: "no-cache", // revalida con ETag: los 304 no gastan del límite
      headers: { Accept: "application/vnd.github+json" },
    });
    if (r.status === 403 || r.status === 429) {
      const reset = Number(r.headers.get("x-ratelimit-reset"));
      pausaRef.current = reset ? reset * 1000 : Date.now() + 15 * 60_000;
      setPausaHasta(pausaRef.current);
      return false;
    }
    if (!r.ok) return false;
    pausaRef.current = null;
    setPausaHasta(null);

    const data = (await r.json()) as {
      sha: string;
      statuses: { context: string; state: EstadoGh; target_url: string; created_at: string }[];
    };
    const proyectos: Proyecto[] = PROYECTOS.map((nombre) => {
      const s = data.statuses.find((x) => x.context.replace(/^Vercel\s*[–-]\s*/, "") === nombre);
      return { nombre, estado: s?.state ?? null, url: s?.target_url ?? null, desde: s?.created_at ?? null };
    });
    setDeploy({ sha: data.sha, proyectos });

    // El mensaje del commit se pide una vez por commit, no en cada vuelta.
    if (shaCommit.current !== data.sha) {
      shaCommit.current = data.sha;
      const c = await fetch(`https://api.github.com/repos/${REPO}/commits/${data.sha}`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (c.ok) {
        const cj = (await c.json()) as { commit: { message: string; author: { date: string } } };
        setCommit({ mensaje: cj.commit.message.split("\n")[0], fecha: cj.commit.author.date });
      } else {
        shaCommit.current = null;
      }
    }
    // Sin estado todavía = Vercel aún no tomó el push: también cuenta como en curso.
    return proyectos.some((p) => p.estado === "pending" || p.estado === null);
  }, []);

  useEffect(() => {
    if (!habilitado) return;
    let vivo = true;
    let timer: number | undefined;

    const vuelta = async () => {
      if (!vivo) return;
      let enCurso = false;
      if (document.visibilityState === "visible") {
        try {
          enCurso = await cargar();
        } catch {
          /* sin red: se reintenta en la próxima vuelta */
        }
      }
      if (vivo) timer = window.setTimeout(vuelta, enCurso ? RAPIDO_MS : REPOSO_MS);
    };
    void vuelta();

    // Al volver a la pestaña se consulta en el acto, en vez de esperar la vuelta.
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(timer);
      void vuelta();
    };
    document.addEventListener("visibilitychange", alVolver);
    const reloj = window.setInterval(() => setAhora(Date.now()), 10_000);
    return () => {
      vivo = false;
      window.clearTimeout(timer);
      window.clearInterval(reloj);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [habilitado, cargar]);

  if (!habilitado || !deploy) return null;

  const estados = deploy.proyectos.map((p) => p.estado);
  const resumen: EstadoGh | null = estados.some((e) => e === "failure" || e === "error")
    ? "failure"
    : estados.some((e) => e === "pending" || e === null)
      ? "pending"
      : "success";
  const textoEstado = (e: EstadoGh | null) =>
    e === "success" ? tr.listo : e === "pending" ? tr.desplegando : e ? tr.fallo : tr.esperandoVercel;
  const fechas = deploy.proyectos.map((p) => p.desde).filter((d): d is string => !!d).sort();
  const ultimo = fechas.length ? fechas[fechas.length - 1] : null;

  return (
    <div className="group asli-no-drag relative z-10 ml-3 hidden items-center md:flex">
      <div
        className="flex h-8 items-center gap-2.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] pl-2.5 pr-3 text-[12px] leading-none text-white/90"
        aria-label={`${tr.aria}: ${textoEstado(resumen)}`}
      >
        {/* El cohete lleva el resumen: se lee de un vistazo sin mirar cada punto. */}
        <Icon
          icon="lucide:rocket"
          width={15}
          height={15}
          className={`shrink-0 ${resumen === "pending" ? "animate-pulse" : ""}`}
          style={{ color: resumen ? COLOR[resumen] : undefined }}
          aria-hidden
        />
        <span className="h-3.5 w-px shrink-0 bg-white/15" aria-hidden />
        <span className="flex items-center gap-3">
          {deploy.proyectos.map((p) => (
            <span key={p.nombre} className="flex items-center gap-1.5">
              <Punto estado={p.estado} />
              <span className="font-semibold">{p.nombre}</span>
            </span>
          ))}
        </span>
        <span className="text-[11px] font-medium text-white/45 tabular-nums">{hace(ultimo, ahora, true)}</span>
      </div>

      {/* Detalle al pasar el mouse. El pt-2 hace de puente para poder llegar a los enlaces. */}
      <div className="invisible absolute left-0 top-full z-[200] pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="w-72 rounded-xl border border-white/10 bg-[#0B1A3D] p-4 text-white shadow-xl">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
              {tr.titulo} · {RAMA}
            </span>
            <span className="text-[12px] font-semibold" style={{ color: resumen ? COLOR[resumen] : undefined }}>
              {textoEstado(resumen)}
            </span>
          </div>

          <a
            href={`https://github.com/${REPO}/commit/${deploy.sha}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block rounded-md text-[12px] text-white/85 hover:text-white"
          >
            <span className="font-mono text-white/50">{deploy.sha.slice(0, 7)}</span>{" "}
            {commit?.mensaje ?? ""}
          </a>
          {commit && (
            <p className="mt-0.5 text-[11px] text-white/40">
              {tr.commitHace} {hace(commit.fecha, ahora)}
            </p>
          )}

          <ul className="mt-3 space-y-2">
            {deploy.proyectos.map((p) => (
              <li key={p.nombre} className="flex items-center gap-2 text-[12px]">
                <Punto estado={p.estado} />
                <span className="font-semibold">{p.nombre}</span>
                <span className="text-white/60">
                  {textoEstado(p.estado)}
                  {p.desde ? ` · ${hace(p.desde, ahora)}` : ""}
                </span>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto flex items-center gap-1 text-[11px] text-white/60 hover:text-white"
                  >
                    Vercel
                    <Icon icon="lucide:external-link" width={11} height={11} aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>

          {pausaHasta && (
            <p className="mt-3 text-[11px] text-[var(--estado-atencion)]">
              {tr.limiteGithub} {new Date(pausaHasta).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
