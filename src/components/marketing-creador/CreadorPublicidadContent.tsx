"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toPng } from "html-to-image";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { PiezaCanvas } from "./PiezaCanvas";
import {
  CATEGORIAS,
  COLORES_FLECHA,
  FAMILIAS,
  PIEZA_INICIAL,
  PLANTILLAS,
  getPlantilla,
  usaCampo,
  type FotoBanco,
  type Pieza,
  type PlantillaId,
} from "./plantillas";
import "@/styles/marketing-fuentes.css";
import "@/styles/marketing-pieza.css";

const BUCKET_BASE = `${import.meta.env.PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/marketing-banco`;
const ESCALA_PREVIA = 0.38;

const input =
  "dash-control w-full px-3 py-2 border border-dash-border rounded-lg text-sm text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40 focus:border-dash-neon/50";
const label = "block text-xs font-semibold text-dash-muted mb-1.5 uppercase tracking-wide";
const bloque = "space-y-3 rounded-xl border border-dash-border bg-dash-surface/70 p-4";

/* ------------------------------------------------------------------ */
/* Fuentes incrustadas                                                  */
/* ------------------------------------------------------------------ */

/**
 * Convierte las woff2 del creador en data: URIs.
 *
 * html-to-image sabe rastrear las hojas de estilo solo, pero recorre todas las
 * del documento y las de otro dominio no se pueden leer: el resultado dependía
 * de si Google Fonts había respondido. Acá leemos únicamente nuestra hoja, que
 * es del mismo origen, y el PNG sale igual siempre.
 */
let fuentesIncrustadas: Promise<string> | null = null;

function cargarFuentes(): Promise<string> {
  if (fuentesIncrustadas) return fuentesIncrustadas;
  fuentesIncrustadas = (async () => {
    // La hoja ya está aplicada en la página; la leemos desde el DOM para no
    // depender de cómo la haya nombrado el bundler.
    const reglas: string[] = [];
    for (const hoja of Array.from(document.styleSheets)) {
      let cssRules: CSSRuleList;
      try {
        cssRules = hoja.cssRules;
      } catch {
        continue; // hoja de otro dominio: no se puede leer, no es nuestra
      }
      for (const regla of Array.from(cssRules)) {
        if (regla instanceof CSSFontFaceRule && /Montserrat|Barlow/.test(regla.cssText)) {
          reglas.push(regla.cssText);
        }
      }
    }

    const conDatos = await Promise.all(
      reglas.map(async (regla) => {
        const url = /url\((["']?)([^)"']+)\1\)/.exec(regla)?.[2];
        if (!url || url.startsWith("data:")) return regla;
        try {
          const buf = await fetch(url).then((r) => r.arrayBuffer());
          let binario = "";
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i += 1) binario += String.fromCharCode(bytes[i]);
          const base64 = btoa(binario);
          return regla.replace(/url\((["']?)[^)"']+\1\)/, `url(data:font/woff2;base64,${base64})`);
        } catch {
          return regla;
        }
      }),
    );
    return conDatos.join("\n");
  })();
  return fuentesIncrustadas;
}

/* ------------------------------------------------------------------ */
/* Utilidades de descarga                                               */
/* ------------------------------------------------------------------ */

function descargar(dataUrl: string, nombre: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = nombre;
  a.click();
}

/** Reduce el PNG a 600px de ancho y lo guarda como JPEG: el tamaño que pide el correo. */
function aJpegCorreo(pngDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 750;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("sin contexto 2d"));
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, 600, 750);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("no se pudo leer el PNG"));
    img.src = pngDataUrl;
  });
}

function slugificar(texto: string): string {
  return (
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "pieza-asli"
  );
}

/* ------------------------------------------------------------------ */
/* Controles reutilizables                                              */
/* ------------------------------------------------------------------ */

function Deslizador({
  id,
  titulo,
  valor,
  min,
  max,
  paso = 1,
  sufijo = "",
  desactivado = false,
  nota,
  onChange,
}: {
  id: string;
  titulo: string;
  valor: number;
  min: number;
  max: number;
  paso?: number;
  sufijo?: string;
  desactivado?: boolean;
  nota?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className={desactivado ? "opacity-45" : undefined}>
      <div className="mb-1 flex items-baseline justify-between">
        <label className={`${label} mb-0`} htmlFor={id}>
          {titulo}
        </label>
        <span className="text-xs tabular-nums text-dash-muted">
          {valor}
          {sufijo}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        disabled={desactivado}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#C8102E] disabled:cursor-not-allowed"
      />
      {nota ? <p className="mt-1 text-xs text-dash-muted">{nota}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Componente                                                           */
/* ------------------------------------------------------------------ */

export function CreadorPublicidadContent() {
  const [pieza, setPieza] = useState<Pieza>(PIEZA_INICIAL);
  const [banco, setBanco] = useState<FotoBanco[]>([]);
  const [bancoError, setBancoError] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string>("todas");
  const [mostrarVetadas, setMostrarVetadas] = useState(false);
  const [exportando, setExportando] = useState<null | "png" | "jpg">(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [theme] = useNeonTheme();

  const canvasRef = useRef<HTMLDivElement>(null);
  const plantilla = getPlantilla(pieza.plantilla);
  const usaFoto = plantilla.campos.includes("foto");

  /* ---- banco de imágenes ---- */
  useEffect(() => {
    let vivo = true;
    fetch(`${BUCKET_BASE}/banco.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`banco.json: ${r.status}`);
        return r.json();
      })
      .then((data: { fotos: FotoBanco[] }) => {
        if (!vivo) return;
        setBanco(data.fotos ?? []);
        const primera = (data.fotos ?? []).find((f) => f.estado === "ok" && f.categoria === "puerto");
        if (primera) {
          setPieza((p) => (p.foto ? p : { ...p, foto: `${BUCKET_BASE}/fotos/${primera.archivo}` }));
        }
      })
      .catch((e: unknown) => {
        if (vivo) setBancoError(e instanceof Error ? e.message : "no se pudo cargar el banco");
      });
    return () => {
      vivo = false;
    };
  }, []);

  const fotosVisibles = useMemo(() => {
    return banco.filter((f) => {
      if (!mostrarVetadas && f.estado === "vetada") return false;
      if (categoria !== "todas" && f.categoria !== categoria) return false;
      return true;
    });
  }, [banco, categoria, mostrarVetadas]);

  const set = useCallback(<K extends keyof Pieza>(campo: K, valor: Pieza[K]) => {
    setPieza((p) => ({ ...p, [campo]: valor }));
  }, []);

  const cambiarPlantilla = useCallback((id: PlantillaId) => {
    const nueva = getPlantilla(id);
    setPieza((p) => ({
      ...p,
      plantilla: id,
      l2Tamano: nueva.l2TamanoPorDefecto,
      flechaColor: nueva.flechaPorDefecto ?? p.flechaColor,
    }));
  }, []);

  /* ---- exportar ---- */
  const exportar = useCallback(
    async (tipo: "png" | "jpg") => {
      const node = canvasRef.current;
      if (!node) return;
      setExportando(tipo);
      setAviso(null);
      try {
        const fontEmbedCSS = await cargarFuentes();
        await document.fonts.ready;

        const opciones = {
          width: 1080,
          height: 1350,
          pixelRatio: 1,
          cacheBust: true,
          fontEmbedCSS,
          // La vista previa está encogida con transform; para el PNG se captura
          // el nodo a tamaño real.
          style: { transform: "scale(1)", transformOrigin: "top left" },
        };

        // La primera pasada suele salir sin la foto: html-to-image la descarga
        // mientras serializa. La segunda ya la tiene en caché.
        await toPng(node, opciones);
        const png = await toPng(node, opciones);

        const nombre = slugificar(pieza.l2 || pieza.dato || pieza.eyebrow);
        if (tipo === "png") {
          descargar(png, `${nombre}-1080x1350.png`);
        } else {
          descargar(await aJpegCorreo(png), `${nombre}-correo-600.jpg`);
        }
      } catch (e: unknown) {
        setAviso(
          `No se pudo exportar: ${e instanceof Error ? e.message : "error desconocido"}. Probá de nuevo en Chrome o Edge.`,
        );
      } finally {
        setExportando(null);
      }
    },
    [pieza.dato, pieza.eyebrow, pieza.l2],
  );

  /** Los campos de varias líneas se editan como texto y se guardan como lista. */
  const porLineas = (
    campo: "lista" | "pasos" | "colA" | "colB" | "tarjetas" | "barras" | "metricas" | "hitos" | "tabla",
  ) => ({
    value: pieza[campo].join("\n"),
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => set(campo, e.target.value.split("\n")),
  });

  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      {/*
       * Dos columnas independientes: la vista previa queda fija a la izquierda
       * y solo el panel de la derecha scrollea. Por eso el overflow-hidden va
       * acá y el overflow-y-auto en la columna de herramientas.
       * Bajo lg se apilan y vuelve a scrollear todo junto.
       */}
      <main
        className="dash-page flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
        role="main"
      >
        {/* ---------------- Vista previa (fija) ---------------- */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-4 p-5 lg:h-full">
          <div
            className="overflow-hidden rounded-xl border border-dash-border bg-dash-surface shadow-2xl"
            style={{ width: 1080 * ESCALA_PREVIA, height: 1350 * ESCALA_PREVIA }}
          >
            <PiezaCanvas ref={canvasRef} pieza={pieza} escala={ESCALA_PREVIA} />
          </div>

          <div className="flex w-full flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => exportar("png")}
              disabled={exportando !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C8102E] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#a60d26] disabled:opacity-50"
            >
              <Icon
                icon={exportando === "png" ? "mdi:loading" : "mdi:download"}
                className={`h-5 w-5 ${exportando === "png" ? "animate-spin" : ""}`}
              />
              PNG 1080×1350
            </button>
            <button
              type="button"
              onClick={() => exportar("jpg")}
              disabled={exportando !== null}
              className="inline-flex items-center gap-2 rounded-lg border border-dash-border bg-dash-control px-4 py-2.5 text-sm font-bold text-dash-fg transition hover:border-dash-neon/50 disabled:opacity-50"
            >
              <Icon
                icon={exportando === "jpg" ? "mdi:loading" : "mdi:email-outline"}
                className={`h-5 w-5 ${exportando === "jpg" ? "animate-spin" : ""}`}
              />
              JPG 600 correo
            </button>
          </div>
        </div>

        {/* ---------------- Herramientas (lo único que scrollea) ---------------- */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto border-dash-border p-5 lg:border-l">
          <header>
            <h1 className="flex items-center gap-2.5 text-xl font-bold text-dash-fg">
              <Icon icon="mdi:image-edit-outline" className="h-6 w-6 text-dash-neon" />
              Creador de publicidad
            </h1>
            <p className="mt-1 text-sm text-dash-muted">
              Elegí una plantilla, escribí los textos y descargá la pieza.
            </p>
          </header>

          {aviso ? (
            <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              {aviso}
            </div>
          ) : null}

          {/* ---- Plantilla ----
               Desplegable y no grilla de botones: con 67 opciones los botones
               se comian la pantalla y obligaban a scrollear para ver el resto
               de las herramientas. Los optgroup mantienen la agrupacion. */}
          <div className={bloque}>
            <label className={label} htmlFor="c-plantilla">
              Plantilla · {PLANTILLAS.length} disponibles
            </label>
            <select
              id="c-plantilla"
              className={input}
              value={pieza.plantilla}
              onChange={(e) => cambiarPlantilla(e.target.value)}
            >
              {FAMILIAS.map((fam) => (
                <optgroup key={fam.id} label={`${fam.nombre} — ${fam.descripcion}`}>
                  {PLANTILLAS.filter((p) => p.familia === fam.id).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-dash-muted">{plantilla.descripcion}</p>
          </div>

          {/* ---- Textos ---- */}
          <div className={bloque}>
            <span className={label}>Textos</span>

            {usaCampo(pieza.plantilla, "eyebrow") && (
              <div>
                <label className={label} htmlFor="c-eyebrow">
                  Cinta de arriba
                </label>
                <input
                  id="c-eyebrow"
                  className={input}
                  value={pieza.eyebrow}
                  onChange={(e) => set("eyebrow", e.target.value)}
                  placeholder="Exportación marítima"
                />
              </div>
            )}

            {(usaCampo(pieza.plantilla, "dato") || usaCampo(pieza.plantilla, "dona")) && (
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <div>
                  <label className={label} htmlFor="c-dato">
                    Cifra
                  </label>
                  <input
                    id="c-dato"
                    className={input}
                    value={pieza.dato}
                    onChange={(e) => set("dato", e.target.value)}
                    placeholder={usaCampo(pieza.plantilla, "dona") ? "90" : "90%"}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="c-dato-et">
                    Qué significa
                  </label>
                  <input
                    id="c-dato-et"
                    className={input}
                    value={pieza.datoEtiqueta}
                    onChange={(e) => set("datoEtiqueta", e.target.value)}
                  />
                </div>
              </div>
            )}

            {usaCampo(pieza.plantilla, "l1") && (
              <div>
                <label className={label} htmlFor="c-l1">
                  Titular — línea chica
                </label>
                <input
                  id="c-l1"
                  className={input}
                  value={pieza.l1}
                  onChange={(e) => set("l1", e.target.value)}
                />
              </div>
            )}

            {usaCampo(pieza.plantilla, "lm") && (
              <div>
                <label className={label} htmlFor="c-lm">
                  Titular — línea intermedia (opcional)
                </label>
                <input
                  id="c-lm"
                  className={input}
                  value={pieza.lm}
                  onChange={(e) => set("lm", e.target.value)}
                  placeholder="de la"
                />
              </div>
            )}

            {usaCampo(pieza.plantilla, "l2") && (
              <div>
                <label className={label} htmlFor="c-l2">
                  Titular — línea grande
                </label>
                <input
                  id="c-l2"
                  className={input}
                  value={pieza.l2}
                  onChange={(e) => set("l2", e.target.value)}
                />
                <div className="mt-2">
                  <Deslizador
                    id="c-l2-size"
                    titulo="Tamaño del titular"
                    valor={pieza.l2Tamano}
                    min={60}
                    max={180}
                    paso={2}
                    sufijo="px"
                    onChange={(v) => set("l2Tamano", v)}
                  />
                </div>
              </div>
            )}

            {usaCampo(pieza.plantilla, "cita") && (
              <>
                <div>
                  <label className={label} htmlFor="c-cita">
                    Frase
                  </label>
                  <textarea
                    id="c-cita"
                    className={`${input} min-h-[90px] resize-y`}
                    value={pieza.cita}
                    onChange={(e) => set("cita", e.target.value)}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="c-firma">
                    Firma
                  </label>
                  <input
                    id="c-firma"
                    className={input}
                    value={pieza.firma}
                    onChange={(e) => set("firma", e.target.value)}
                  />
                </div>
              </>
            )}

            {usaCampo(pieza.plantilla, "chips") && (
              <div>
                <label className={label} htmlFor="c-chips">
                  Etiquetas (separadas por coma)
                </label>
                <input
                  id="c-chips"
                  className={input}
                  value={pieza.chips.join(", ")}
                  onChange={(e) =>
                    set(
                      "chips",
                      e.target.value.split(",").map((s) => s.trim()),
                    )
                  }
                />
              </div>
            )}

            {(usaCampo(pieza.plantilla, "lista") || usaCampo(pieza.plantilla, "checklist")) && (
              <div>
                <label className={label} htmlFor="c-lista">
                  {usaCampo(pieza.plantilla, "checklist") ? "Checklist" : "Lista"} (una por línea)
                </label>
                <textarea
                  id="c-lista"
                  className={`${input} min-h-[110px] resize-y`}
                  {...porLineas("lista")}
                />
              </div>
            )}

            {usaCampo(pieza.plantilla, "pasos") && (
              <div>
                <label className={label} htmlFor="c-pasos">
                  Pasos (uno por línea, se numeran solos)
                </label>
                <textarea
                  id="c-pasos"
                  className={`${input} min-h-[110px] resize-y`}
                  {...porLineas("pasos")}
                />
              </div>
            )}

            {usaCampo(pieza.plantilla, "columnas") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label} htmlFor="c-colA-t">
                    Columna izquierda
                  </label>
                  <input
                    id="c-colA-t"
                    className={input}
                    value={pieza.colATitulo}
                    onChange={(e) => set("colATitulo", e.target.value)}
                  />
                  <textarea
                    className={`${input} mt-2 min-h-[100px] resize-y`}
                    aria-label="Puntos de la columna izquierda"
                    {...porLineas("colA")}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="c-colB-t">
                    Columna derecha
                  </label>
                  <input
                    id="c-colB-t"
                    className={input}
                    value={pieza.colBTitulo}
                    onChange={(e) => set("colBTitulo", e.target.value)}
                  />
                  <textarea
                    className={`${input} mt-2 min-h-[100px] resize-y`}
                    aria-label="Puntos de la columna derecha"
                    {...porLineas("colB")}
                  />
                </div>
              </div>
            )}

            {usaCampo(pieza.plantilla, "tarjetas") && (
              <div>
                <label className={label} htmlFor="c-tarjetas">
                  Tarjetas — una por línea: título | texto
                </label>
                <textarea
                  id="c-tarjetas"
                  className={`${input} min-h-[110px] resize-y`}
                  {...porLineas("tarjetas")}
                />
              </div>
            )}

            {usaCampo(pieza.plantilla, "barras") && (
              <div>
                <label className={label} htmlFor="c-barras">
                  Barras — una por línea: etiqueta | número del 0 al 100
                </label>
                <textarea
                  id="c-barras"
                  className={`${input} min-h-[90px] resize-y`}
                  {...porLineas("barras")}
                />
              </div>
            )}

            {usaCampo(pieza.plantilla, "metricas") && (
              <div>
                <label className={label} htmlFor="c-metricas">
                  Cifras — una por línea: número | etiqueta
                </label>
                <textarea
                  id="c-metricas"
                  className={`${input} min-h-[90px] resize-y`}
                  {...porLineas("metricas")}
                />
              </div>
            )}

            {usaCampo(pieza.plantilla, "hitos") && (
              <div>
                <label className={label} htmlFor="c-hitos">
                  Hitos — uno por línea: fecha | qué pasó
                </label>
                <textarea
                  id="c-hitos"
                  className={`${input} min-h-[100px] resize-y`}
                  {...porLineas("hitos")}
                />
              </div>
            )}

            {usaCampo(pieza.plantilla, "tabla") && (
              <div>
                <label className={label} htmlFor="c-tabla">
                  Tabla — una fila por línea: concepto | valor
                </label>
                <textarea
                  id="c-tabla"
                  className={`${input} min-h-[100px] resize-y`}
                  {...porLineas("tabla")}
                />
              </div>
            )}

            {usaCampo(pieza.plantilla, "ribbon") && (
              <div>
                <label className={label} htmlFor="c-ribbon">
                  Cinta de llamado a la acción
                </label>
                <input
                  id="c-ribbon"
                  className={input}
                  value={pieza.ribbon}
                  onChange={(e) => set("ribbon", e.target.value)}
                />
              </div>
            )}

            {usaCampo(pieza.plantilla, "ribbon2") && (
              <div>
                <label className={label} htmlFor="c-ribbon2">
                  Segunda cinta (contorno)
                </label>
                <input
                  id="c-ribbon2"
                  className={input}
                  value={pieza.ribbon2}
                  onChange={(e) => set("ribbon2", e.target.value)}
                />
              </div>
            )}

            {usaCampo(pieza.plantilla, "support") && (
              <div>
                <label className={label} htmlFor="c-support">
                  Bajada
                </label>
                <textarea
                  id="c-support"
                  className={`${input} min-h-[80px] resize-y`}
                  value={pieza.support}
                  onChange={(e) => set("support", e.target.value)}
                />
                <p className="mt-1 text-xs text-dash-muted">
                  Se puede destacar una parte con {"<b>"}así{"</b>"}.
                </p>
              </div>
            )}
          </div>

          {/* ---- Color de la flecha ---- */}
          <div className={bloque}>
            <span className={label}>Color de la flecha superior</span>
            <div className="flex flex-wrap gap-2">
              {COLORES_FLECHA.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set("flechaColor", c.valor)}
                  title={c.nombre}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    pieza.flechaColor === c.valor
                      ? "border-dash-neon bg-dash-neon/10 text-dash-fg"
                      : "border-dash-border bg-dash-control text-dash-muted hover:border-dash-neon/40"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-sm border border-white/30"
                    style={{ background: c.valor }}
                  />
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* ---- Banco de imágenes ---- */}
          {usaFoto ? (
            <div className={bloque}>
              <div className="flex items-center justify-between">
                <span className={`${label} mb-0`}>Foto de fondo</span>
                <span className="text-xs text-dash-muted">{fotosVisibles.length} fotos</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {CATEGORIAS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoria(c.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      categoria === c.id
                        ? "bg-dash-neon/20 text-dash-fg"
                        : "bg-dash-control text-dash-muted hover:text-dash-fg"
                    }`}
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>

              {bancoError ? (
                <p className="text-xs text-amber-300">No se pudo cargar el banco: {bancoError}</p>
              ) : null}

              <div className="grid max-h-[260px] grid-cols-5 gap-1.5 overflow-auto pr-1">
                {fotosVisibles.map((f) => {
                  const url = `${BUCKET_BASE}/fotos/${f.archivo}`;
                  const activa = pieza.foto === url;
                  return (
                    <button
                      key={f.archivo}
                      type="button"
                      onClick={() => set("foto", url)}
                      title={f.nota ? `${f.estado}: ${f.nota}` : f.archivo}
                      className={`relative aspect-[4/3] overflow-hidden rounded border-2 transition ${
                        activa ? "border-dash-neon" : "border-transparent hover:border-white/30"
                      }`}
                    >
                      <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {f.estado !== "ok" ? (
                        <span
                          className={`absolute left-0 top-0 px-1 text-[9px] font-bold uppercase ${
                            f.estado === "vetada" ? "bg-red-600 text-white" : "bg-amber-400 text-black"
                          }`}
                        >
                          {f.estado === "vetada" ? "vetada" : "revisar"}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <label className="flex items-center gap-2 text-xs text-dash-muted">
                <input
                  type="checkbox"
                  checked={mostrarVetadas}
                  onChange={(e) => setMostrarVetadas(e.target.checked)}
                  className="accent-[#C8102E]"
                />
                Mostrar también las vetadas (tienen marca de otra empresa visible)
              </label>

              <Deslizador
                id="c-zoom"
                titulo="Acercar la foto"
                valor={pieza.fotoZoom}
                min={100}
                max={250}
                sufijo="%"
                onChange={(v) => set("fotoZoom", v)}
              />

              <Deslizador
                id="c-pos-y"
                titulo="Mover en vertical"
                valor={pieza.fotoPosicion}
                min={0}
                max={100}
                onChange={(v) => set("fotoPosicion", v)}
              />

              <Deslizador
                id="c-pos-x"
                titulo="Mover en horizontal"
                valor={pieza.fotoPosicionX}
                min={0}
                max={100}
                desactivado={pieza.fotoZoom === 100}
                nota={pieza.fotoZoom === 100 ? "Se activa al acercar la foto." : undefined}
                onChange={(v) => set("fotoPosicionX", v)}
              />
            </div>
          ) : (
            <div className={bloque}>
              <p className="text-xs text-dash-muted">
                Esta plantilla no usa foto: el fondo es sólido y no hay nada que encuadrar.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
