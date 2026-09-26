import { useCallback, useEffect, useState } from "react";
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
 * El costo es el límite de GitHub sin autenticar: **60 consultas por hora por IP**,
 * y la IP es la de la oficina. El 26-09-2026 se agotó (varias pestañas abiertas,
 * cada una consultando por su cuenta) y el indicador desapareció, porque se
 * ocultaba sin datos. De ahí tres reglas:
 *
 * - **Una pestaña consulta por todas.** El resultado vive en localStorage y las
 *   demás lo reciben por el evento `storage`; un candado de 20 s reparte el turno.
 * - **Nunca se oculta.** Sin datos o con GitHub cortado, muestra lo último que
 *   supo, apagado, y el detalle dice a qué hora se retoma.
 * - **Gasta lo justo.** 30 s con un deploy en curso, 2 min en reposo, nada con la
 *   pestaña oculta. El mensaje del commit se pide al pasar el mouse, una vez.
 */
const REPO = "asli-chile/embarques";
const RAMA = "master";
const RAPIDO_MS = 30_000;
const REPOSO_MS = 120_000;
const TICK_MS = 5_000;
const CLAVE = "asli.deploy.v1";
const CLAVE_TURNO = "asli.deploy.turno";
/** Los proyectos que se muestran, en este orden, aunque aún no hayan reportado. */
const PROYECTOS = ["embarques", "web2"] as const;

type EstadoGh = "pending" | "success" | "failure" | "error";
type Proyecto = { nombre: string; estado: EstadoGh | null; url: string | null; desde: string | null };
type Deploy = { sha: string; proyectos: Proyecto[] };
type Commit = { mensaje: string; fecha: string };
type Cache = {
  deploy: Deploy | null;
  commits: Record<string, Commit>;
  /** Cuándo se consultó por última vez (ms), lo haya hecho esta pestaña u otra. */
  consultado: number;
  /** Hasta cuándo GitHub dijo que no (ms). */
  pausaHasta: number | null;
};

const VACIO: Cache = { deploy: null, commits: {}, consultado: 0, pausaHasta: null };

// Ámbar para "desplegando": es algo que mirar, no un éxito ni un error.
const COLOR: Record<EstadoGh, string> = {
  pending: "var(--estado-atencion)",
  success: "var(--estado-ok)",
  failure: "var(--estado-error)",
  error: "var(--estado-error)",
};

function leerCache(): Cache {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Partial<Cache> | null;
    if (c && typeof c === "object") return { ...VACIO, ...c };
  } catch {
    /* sin localStorage o dato corrupto: se parte de cero */
  }
  return VACIO;
}

function guardarCache(c: Cache) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(c));
  } catch {
    /* sin localStorage: cada pestaña queda por su cuenta, igual funciona */
  }
}

/** Reparte el turno entre pestañas: la primera que lo toma consulta por 20 s. */
function tomarTurno(): boolean {
  try {
    const ahora = Date.now();
    if (Number(localStorage.getItem(CLAVE_TURNO)) > ahora) return false;
    localStorage.setItem(CLAVE_TURNO, String(ahora + 20_000));
  } catch {
    /* sin localStorage no hay con quién competir */
  }
  return true;
}

function enCurso(d: Deploy | null): boolean {
  // Sin estado todavía = Vercel aún no tomó el push: también cuenta como en curso.
  return !!d && d.proyectos.some((p) => p.estado === "pending" || p.estado === null);
}

function pausaDe(r: Response): number {
  const reset = Number(r.headers.get("x-ratelimit-reset"));
  return reset ? reset * 1000 : Date.now() + 15 * 60_000;
}

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
      className={`h-2 w-2 shrink-0 rounded-full ${estado === "pending" || !estado ? "animate-pulse" : ""}`}
      // Sin estado = Vercel aún no toma el push: ya es parte del deploy en curso.
      style={{ background: COLOR[estado ?? "pending"] }}
      aria-hidden
    />
  );
}

export function DeployIndicator() {
  const { user } = useAuth();
  const { t } = useLocale();
  const tr = t.deployIndicador;
  const habilitado = esDueno(user?.email);

  // localStorage solo existe en el navegador: se lee en el efecto, no al crear el estado.
  const [cache, setCache] = useState<Cache>(VACIO);
  const [ahora, setAhora] = useState(() => Date.now());

  const actualizar = useCallback((cambio: (c: Cache) => Cache) => {
    const nuevo = cambio(leerCache());
    guardarCache(nuevo);
    setCache(nuevo);
  }, []);

  const consultar = useCallback(async () => {
    const r = await fetch(`https://api.github.com/repos/${REPO}/commits/${RAMA}/status`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (r.status === 403 || r.status === 429) {
      const pausa = pausaDe(r);
      actualizar((c) => ({ ...c, consultado: Date.now(), pausaHasta: pausa }));
      return;
    }
    if (!r.ok) {
      actualizar((c) => ({ ...c, consultado: Date.now() }));
      return;
    }
    const data = (await r.json()) as {
      sha: string;
      statuses: { context: string; state: EstadoGh; target_url: string; created_at: string }[];
    };
    const proyectos: Proyecto[] = PROYECTOS.map((nombre) => {
      const s = data.statuses.find((x) => x.context.replace(/^Vercel\s*[–-]\s*/, "") === nombre);
      return { nombre, estado: s?.state ?? null, url: s?.target_url ?? null, desde: s?.created_at ?? null };
    });
    actualizar((c) => ({ ...c, deploy: { sha: data.sha, proyectos }, consultado: Date.now(), pausaHasta: null }));
  }, [actualizar]);

  useEffect(() => {
    if (!habilitado) return;
    setCache(leerCache());

    const tick = () => {
      const n = Date.now();
      setAhora(n);
      if (document.visibilityState !== "visible") return;
      const c = leerCache();
      if (c.pausaHasta && n < c.pausaHasta) return;
      const intervalo = enCurso(c.deploy) ? RAPIDO_MS : REPOSO_MS;
      if (n - c.consultado < intervalo) return;
      if (!tomarTurno()) return;
      void consultar().catch(() => {
        /* sin red: la próxima vuelta reintenta */
      });
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);

    // Lo que consulta otra pestaña llega acá sin gastar otra consulta.
    const alCambiar = (e: StorageEvent) => {
      if (e.key === CLAVE) setCache(leerCache());
    };
    window.addEventListener("storage", alCambiar);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", alCambiar);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [habilitado, consultar]);

  /** El mensaje del commit se pide al abrir el detalle, una vez por commit. */
  const pedirCommit = useCallback(async () => {
    const c = leerCache();
    const sha = c.deploy?.sha;
    if (!sha || c.commits[sha] || (c.pausaHasta && Date.now() < c.pausaHasta)) return;
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/commits/${sha}`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (r.status === 403 || r.status === 429) {
        const pausa = pausaDe(r);
        actualizar((x) => ({ ...x, pausaHasta: pausa }));
        return;
      }
      if (!r.ok) return;
      const cj = (await r.json()) as { commit: { message: string; author: { date: string } } };
      const commit = { mensaje: cj.commit.message.split("\n")[0], fecha: cj.commit.author.date };
      // Solo se guardan los últimos: el resto ya no se va a mostrar.
      actualizar((x) => ({ ...x, commits: { [sha]: commit } }));
    } catch {
      /* sin red: se reintenta al volver a pasar el mouse */
    }
  }, [actualizar]);

  if (!habilitado) return null;

  const { deploy, pausaHasta } = cache;
  const pausado = !!pausaHasta && ahora < pausaHasta;
  const commit = deploy ? cache.commits[deploy.sha] : undefined;
  const proyectos: Proyecto[] =
    deploy?.proyectos ?? PROYECTOS.map((nombre) => ({ nombre, estado: null, url: null, desde: null }));

  const estados = proyectos.map((p) => p.estado);
  const resumen: EstadoGh | null = !deploy
    ? null
    : estados.some((e) => e === "failure" || e === "error")
      ? "failure"
      : estados.some((e) => e === "pending" || e === null)
        ? "pending"
        : "success";
  const textoEstado = (e: EstadoGh | null) =>
    e === "success" ? tr.listo : e === "pending" ? tr.desplegando : e ? tr.fallo : tr.esperandoVercel;
  const fechas = proyectos.map((p) => p.desde).filter((d): d is string => !!d).sort();
  const ultimo = fechas.length ? fechas[fechas.length - 1] : null;
  const horaPausa = pausaHasta
    ? new Date(pausaHasta).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div
      className="group asli-no-drag relative z-10 ml-3 hidden items-center md:flex"
      onMouseEnter={() => void pedirCommit()}
      onFocus={() => void pedirCommit()}
    >
      <div
        className="flex h-8 items-center gap-2.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] pl-2.5 pr-3 text-[12px] leading-none text-white/90"
        aria-label={`${tr.aria}: ${deploy ? textoEstado(resumen) : tr.sinDatos}`}
      >
        {/* El cohete lleva el resumen; en gris si el dato no está al día. */}
        <Icon
          icon="lucide:rocket"
          width={15}
          height={15}
          className={`shrink-0 ${resumen === "pending" && !pausado ? "animate-pulse" : ""}`}
          style={{ color: resumen && !pausado ? COLOR[resumen] : "rgb(255 255 255 / 0.4)" }}
          aria-hidden
        />
        <span className="h-3.5 w-px shrink-0 bg-white/15" aria-hidden />
        <span className={`flex items-center gap-3 ${deploy ? "" : "opacity-50"}`}>
          {proyectos.map((p) => (
            <span key={p.nombre} className="flex items-center gap-1.5">
              {deploy ? (
                <Punto estado={p.estado} />
              ) : (
                <span className="h-2 w-2 shrink-0 rounded-full bg-white/30" aria-hidden />
              )}
              <span className="font-semibold">{p.nombre}</span>
            </span>
          ))}
        </span>
        <span className="text-[11px] font-medium text-white/45 tabular-nums">
          {pausado ? (
            <Icon icon="lucide:clock" width={12} height={12} aria-label={tr.limiteGithub} />
          ) : (
            hace(ultimo, ahora, true)
          )}
        </span>
      </div>

      {/* Detalle al pasar el mouse. El pt-2 hace de puente para poder llegar a los enlaces. */}
      <div className="invisible absolute left-0 top-full z-[200] pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="w-72 rounded-xl border border-white/10 bg-[#0B1A3D] p-4 text-white shadow-xl">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
              {tr.titulo} · {RAMA}
            </span>
            {deploy && (
              <span className="text-[12px] font-semibold" style={{ color: resumen ? COLOR[resumen] : undefined }}>
                {textoEstado(resumen)}
              </span>
            )}
          </div>

          {deploy ? (
            <>
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
                {proyectos.map((p) => (
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
            </>
          ) : (
            <p className="mt-2 text-[12px] text-white/60">{tr.sinDatos}</p>
          )}

          {pausado && (
            <p className="mt-3 text-[11px] text-[var(--estado-atencion)]">
              {deploy ? tr.limiteGithubUltimo : tr.limiteGithub} {horaPausa}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
