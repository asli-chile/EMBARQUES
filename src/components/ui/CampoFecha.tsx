import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { addDays, addMonths, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { useNeonTheme } from "@/lib/ui/neonTheme";

/**
 * Campo de fecha (o fecha y hora) que se lee y se escribe como en Chile:
 * `dd/mm/aaaa` y `dd/mm/aaaa hh:mm`, con la hora en 24 h.
 *
 * No usa el `<input type="date|datetime-local">` nativo: ignora `lang` y toma
 * el idioma del sistema operativo, así que en un equipo en inglés mostraba
 * `09/28/2026 08:00 AM` y un selector de hora con AM/PM. El calendario es
 * propio: en español, semana desde el lunes y hora en dos listas de 24 h.
 *
 * El valor que entra y sale es ISO (`2026-09-28` o `2026-09-28T08:00`), el
 * mismo que daba el nativo. Las columnas `timestamptz` llegan de Supabase con
 * zona (`…T08:00:00+00:00`): se toman la fecha y la hora tal como están, que es
 * como se guardaron, sin convertir.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → texto a mostrar. Vacío si no es una fecha. */
export function isoATexto(v: string | null | undefined, conHora: boolean): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v ?? "");
  if (!m) return "";
  const fecha = `${m[3]}/${m[2]}/${m[1]}`;
  return conHora ? `${fecha} ${m[4] ?? "00"}:${m[5] ?? "00"}` : fecha;
}

/**
 * Texto escrito → ISO. `""` si se borró; `null` si no es una fecha válida
 * (todavía a medio escribir, o un 31/02).
 */
export function textoAIso(texto: string, conHora: boolean): string | null {
  const t = texto.trim();
  if (!t) return "";
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?:[ T,]+(\d{1,2}):(\d{2}))?$/.exec(t);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(anio, mes - 1, dia);
  if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  const fecha = `${anio}-${pad(mes)}-${pad(dia)}`;
  if (!conHora) return fecha;
  const hora = m[4] != null ? Number(m[4]) : 0;
  const min = m[5] != null ? Number(m[5]) : 0;
  if (hora > 23 || min > 59) return null;
  return `${fecha}T${pad(hora)}:${pad(min)}`;
}

/** Partes del valor ISO: la fecha como Date local y la hora aparte. */
function partes(v: string | null | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v ?? "");
  if (!m) return null;
  return {
    fecha: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
    hora: m[4] != null ? Number(m[4]) : 0,
    min: m[5] != null ? Number(m[5]) : 0,
  };
}

const aIso = (d: Date, conHora: boolean, hora: number, min: number) => {
  const fecha = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return conHora ? `${fecha}T${pad(hora)}:${pad(min)}` : fecha;
};

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 12 }, (_, i) => i * 5);

type Props = {
  value: string;
  onChange: (iso: string) => void;
  conHora?: boolean;
  /** Clases del campo de texto (las mismas del resto del formulario). */
  className?: string;
  id?: string;
  disabled?: boolean;
};

export function CampoFecha({ value, onChange, conHora = false, className = "", id, disabled }: Props) {
  const [theme] = useNeonTheme();
  const [texto, setTexto] = useState(() => isoATexto(value, conHora));
  const [enfocado, setEnfocado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(() => startOfMonth(partes(value)?.fecha ?? new Date()));
  const [estilo, setEstilo] = useState<CSSProperties>({});
  const campoRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Si el valor cambia desde afuera (otra fila, descartar), se refleja; pero
     no mientras se escribe, para no pisar lo que va a medias. */
  useEffect(() => {
    if (!enfocado) setTexto(isoATexto(value, conHora));
  }, [value, conHora, enfocado]);

  /* Se avisa apenas el texto es una fecha completa, no al salir del campo:
     así Enter guarda lo escrito aunque el foco siga aquí. */
  const escribir = (t: string) => {
    setTexto(t);
    const iso = textoAIso(t, conHora);
    if (iso !== null && iso !== textoAIso(isoATexto(value, conHora), conHora)) onChange(iso);
  };

  const emitir = (iso: string) => {
    onChange(iso);
    setTexto(isoATexto(iso, conHora));
  };

  /* ── Panel ── */

  const ubicar = useCallback(() => {
    const r = campoRef.current?.getBoundingClientRect();
    if (!r) return;
    const ancho = conHora ? 400 : 288;
    const alto = 330;
    const abajo = window.innerHeight - r.bottom >= alto + 8 || r.top < alto + 8;
    setEstilo({
      position: "fixed",
      top: abajo ? r.bottom + 6 : r.top - alto - 6,
      left: Math.max(8, Math.min(r.left, window.innerWidth - ancho - 8)),
      width: ancho,
    });
  }, [conHora]);

  useLayoutEffect(() => {
    if (abierto) ubicar();
  }, [abierto, ubicar]);

  /* Al abrir, la lista de horas se centra en la elegida. Solo al abrir y solo
     dentro de la lista: scrollIntoView movería también la ficha de atrás. */
  const listaHorasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const lista = listaHorasRef.current;
    const hora = partes(value)?.hora ?? 8;
    const el = lista?.querySelector<HTMLElement>(`[data-hora="${hora}"]`);
    if (lista && el) lista.scrollTop = el.offsetTop - lista.clientHeight / 2 + el.offsetHeight / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!campoRef.current?.contains(t) && !panelRef.current?.contains(t)) setAbierto(false);
    };
    window.addEventListener("mousedown", fuera);
    window.addEventListener("scroll", ubicar, true);
    window.addEventListener("resize", ubicar);
    return () => {
      window.removeEventListener("mousedown", fuera);
      window.removeEventListener("scroll", ubicar, true);
      window.removeEventListener("resize", ubicar);
    };
  }, [abierto, ubicar]);

  const abrir = () => {
    if (disabled) return;
    setMes(startOfMonth(partes(value)?.fecha ?? new Date()));
    setAbierto((v) => !v);
  };

  const actual = partes(value);
  const hoy = new Date();
  const inicio = startOfWeek(mes, { weekStartsOn: 1 });
  const dias = Array.from({ length: 42 }, (_, i) => addDays(inicio, i));

  const elegirDia = (d: Date) => {
    emitir(aIso(d, conHora, actual?.hora ?? 0, actual?.min ?? 0));
    // Sin hora, elegir el día es terminar. Con hora, falta la hora.
    if (!conHora) setAbierto(false);
  };
  const elegirHora = (hora: number, min: number) => emitir(aIso(actual?.fecha ?? hoy, conHora, hora, min));

  /* Escape cierra el panel sin replegar la ficha que lo contiene. */
  const teclaPanel = (e: React.KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setAbierto(false);
  };

  const claseLista =
    "relative min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-dash-border bg-dash-bg p-1 [scrollbar-width:thin]";
  const claseOpcion = (activa: boolean) =>
    `block w-full rounded-md py-1 text-center text-[13px] font-semibold tabular-nums transition-colors ${
      activa ? "bg-[var(--estado-curso)] text-white" : "text-dash-fg hover:bg-dash-control"
    }`;

  const panel = (
    <div
      ref={panelRef}
      style={estilo}
      data-theme={theme}
      onKeyDown={teclaPanel}
      className="dash-neon motion-enter-lift z-[9999] flex gap-3 rounded-2xl border border-dash-border bg-[var(--dash-surface)] p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
    >
      <div className="w-[16.5rem] shrink-0">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMes((m) => addMonths(m, -1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-dash-muted hover:bg-dash-control hover:text-dash-fg"
            aria-label="Mes anterior"
          >
            <Icon icon="lucide:chevron-left" width={16} height={16} />
          </button>
          <span className="text-[13px] font-bold capitalize text-dash-fg">{format(mes, "MMMM yyyy", { locale: es })}</span>
          <button
            type="button"
            onClick={() => setMes((m) => addMonths(m, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-dash-muted hover:bg-dash-control hover:text-dash-fg"
            aria-label="Mes siguiente"
          >
            <Icon icon="lucide:chevron-right" width={16} height={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {DIAS.map((d) => (
            <span key={d} className="py-1 text-[10.5px] font-bold uppercase text-dash-muted">
              {d}
            </span>
          ))}
          {dias.map((d) => {
            const elegido = actual && isSameDay(d, actual.fecha);
            const esHoy = isSameDay(d, hoy);
            const delMes = isSameMonth(d, mes);
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => elegirDia(d)}
                className={`h-8 rounded-lg text-[12.5px] font-semibold tabular-nums transition-colors ${
                  elegido
                    ? "bg-[var(--estado-curso)] text-white"
                    : esHoy
                      ? "text-dash-fg ring-1 ring-inset ring-[var(--estado-curso)] hover:bg-dash-control"
                      : delMes
                        ? "text-dash-fg hover:bg-dash-control"
                        : "text-dash-muted/50 hover:bg-dash-control"
                }`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-dash-border pt-2">
          <button
            type="button"
            onClick={() => {
              emitir("");
              setAbierto(false);
            }}
            className="rounded-lg px-2 py-1 text-[12px] font-semibold text-dash-muted hover:bg-dash-control hover:text-dash-fg"
          >
            Borrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMes(startOfMonth(hoy));
              elegirDia(hoy);
            }}
            className="rounded-lg px-2 py-1 text-[12px] font-semibold text-[var(--estado-curso)] hover:bg-dash-control"
          >
            Hoy
          </button>
          {conHora && (
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-full bg-[var(--estado-curso)] px-3 py-1 text-[12px] font-bold text-white"
            >
              Listo
            </button>
          )}
        </div>
      </div>

      {/* Hora en 24 h: dos listas, hora y minutos de 5 en 5. Un minuto que no
          sea múltiplo de 5 se escribe en el campo y también se muestra aquí. */}
      {conHora && (
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="mb-2 flex h-7 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-dash-muted">
            <Icon icon="lucide:clock" width={13} height={13} aria-hidden />
            Hora
          </p>
          <div className="flex min-h-0 flex-1 gap-1.5" style={{ maxHeight: 262 }}>
            <div ref={listaHorasRef} className={claseLista} aria-label="Hora">
              {HORAS.map((h) => (
                <button
                  key={h}
                  type="button"
                  data-hora={h}
                  onClick={() => elegirHora(h, actual?.min ?? 0)}
                  className={claseOpcion(actual?.hora === h)}
                >
                  {pad(h)}
                </button>
              ))}
            </div>
            <div className={claseLista} aria-label="Minutos">
              {(actual && !MINUTOS.includes(actual.min) ? [...MINUTOS, actual.min].sort((a, b) => a - b) : MINUTOS).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => elegirHora(actual?.hora ?? 0, m)}
                  className={claseOpcion(actual?.min === m)}
                >
                  {pad(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div ref={campoRef} className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={texto}
        disabled={disabled}
        placeholder={conHora ? "dd/mm/aaaa hh:mm" : "dd/mm/aaaa"}
        onFocus={() => setEnfocado(true)}
        onChange={(e) => escribir(e.target.value)}
        onBlur={() => {
          setEnfocado(false);
          // Lo que quedó a medias o inválido vuelve al último valor bueno.
          if (textoAIso(texto, conHora) === null) setTexto(isoATexto(value, conHora));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && e.altKey) {
            e.preventDefault();
            abrir();
          }
        }}
        className={`${className} pr-10 tabular-nums`}
      />
      <button
        type="button"
        onClick={abrir}
        disabled={disabled}
        aria-label="Abrir calendario"
        aria-expanded={abierto}
        className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors disabled:opacity-40 ${
          abierto ? "bg-dash-control text-[var(--estado-curso)]" : "text-dash-muted hover:bg-dash-control hover:text-dash-fg"
        }`}
      >
        <Icon icon="lucide:calendar" width={15} height={15} aria-hidden />
      </button>
      {abierto && typeof document !== "undefined" && createPortal(panel, document.body)}
    </div>
  );
}
