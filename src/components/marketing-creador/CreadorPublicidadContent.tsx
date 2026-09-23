"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toPng } from "html-to-image";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { PiezaCanvas } from "./PiezaCanvas";
import {
  CATEGORIAS,
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
const ESCALA_PREVIA = 0.36;

const input =
  "dash-control w-full px-3 py-2 border border-dash-border rounded-lg text-sm text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40 focus:border-dash-neon/50";
const label = "block text-xs font-semibold text-dash-muted mb-1.5 uppercase tracking-wide";

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
    setPieza((p) => ({ ...p, plantilla: id, l2Tamano: getPlantilla(id).l2TamanoPorDefecto }));
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

        const nombre = slugificar(pieza.l2 || pieza.eyebrow);
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
    [pieza.eyebrow, pieza.l2],
  );

  const listaTexto = pieza.lista.join("\n");
  const chipsTexto = pieza.chips.join(", ");

  return (
    /*
     * El contenedor .dash-neon no es decorativo: es donde se declaran
     * --dash-fg, --dash-control y el resto de las variables del tema. Sin él,
     * las utilidades dash-* toman el valor de :root (texto casi blanco) y
     * .dash-control no pinta fondo, así que los campos quedaban blanco sobre
     * blanco. data-theme es lo que permite alternar claro/oscuro.
     */
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto" role="main">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6">
          <header className="mb-6">
            <h1 className="flex items-center gap-3 text-2xl font-bold text-dash-fg">
              <Icon icon="mdi:image-edit-outline" className="h-7 w-7 text-dash-neon" />
              Creador de publicidad
            </h1>
            <p className="mt-1.5 text-sm text-dash-muted">
              Arma una pieza para redes siguiendo la identidad de ASLI y descárgala lista para
              publicar o para enviar por correo.
            </p>
          </header>

          {aviso ? (
            <div className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              {aviso}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            {/* ---------------- Vista previa ---------------- */}
            <section className="order-2 lg:order-1">
              <div className="lg:sticky lg:top-4">
                <div
                  className="overflow-hidden rounded-xl border border-dash-border bg-dash-surface shadow-2xl"
                  style={{ width: 1080 * ESCALA_PREVIA, height: 1350 * ESCALA_PREVIA }}
                >
                  <PiezaCanvas ref={canvasRef} pieza={pieza} escala={ESCALA_PREVIA} />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
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
                    JPG 600 para correo
                  </button>
                </div>
                <p className="mt-2 text-xs text-dash-muted">
                  La descarga sale del navegador. En Chrome y Edge queda idéntica a la vista previa.
                </p>
              </div>
            </section>

            {/* ---------------- Formulario ---------------- */}
            <section className="order-1 space-y-5 lg:order-2">
              {/* Plantilla */}
              <div>
                <span className={label}>Plantilla</span>
                <div className="grid grid-cols-2 gap-2">
                  {PLANTILLAS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => cambiarPlantilla(p.id)}
                      title={p.descripcion}
                      className={`rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition ${
                        pieza.plantilla === p.id
                          ? "border-dash-neon bg-dash-neon/10 text-dash-fg"
                          : "border-dash-border bg-dash-control text-dash-muted hover:border-dash-neon/40"
                      }`}
                    >
                      {p.nombre}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-dash-muted">{plantilla.descripcion}</p>
              </div>

              {/* Textos */}
              <div className="space-y-3 rounded-xl border border-dash-border bg-dash-surface/70 p-4">
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
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-xs text-dash-muted">Tamaño</span>
                      <input
                        type="range"
                        min={70}
                        max={170}
                        step={2}
                        value={pieza.l2Tamano}
                        onChange={(e) => set("l2Tamano", Number(e.target.value))}
                        className="flex-1 accent-[#C8102E]"
                        aria-label="Tamaño de la línea grande"
                      />
                      <span className="w-12 text-right text-xs tabular-nums text-dash-muted">
                        {pieza.l2Tamano}px
                      </span>
                    </div>
                  </div>
                )}

                {usaCampo(pieza.plantilla, "chips") && (
                  <div>
                    <label className={label} htmlFor="c-chips">
                      Etiquetas (separadas por coma)
                    </label>
                    <input
                      id="c-chips"
                      className={input}
                      value={chipsTexto}
                      onChange={(e) =>
                        set(
                          "chips",
                          e.target.value.split(",").map((s) => s.trim()),
                        )
                      }
                    />
                  </div>
                )}

                {usaCampo(pieza.plantilla, "lista") && (
                  <div>
                    <label className={label} htmlFor="c-lista">
                      Lista (una por línea)
                    </label>
                    <textarea
                      id="c-lista"
                      className={`${input} min-h-[110px] resize-y`}
                      value={listaTexto}
                      onChange={(e) => set("lista", e.target.value.split("\n"))}
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

              {/* Banco de imágenes */}
              <div className="rounded-xl border border-dash-border bg-dash-surface/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className={`${label} mb-0`}>Foto de fondo</span>
                  <span className="text-xs text-dash-muted">{fotosVisibles.length} fotos</span>
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
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

                <div className="grid max-h-[300px] grid-cols-4 gap-1.5 overflow-auto pr-1">
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

                <label className="mt-3 flex items-center gap-2 text-xs text-dash-muted">
                  <input
                    type="checkbox"
                    checked={mostrarVetadas}
                    onChange={(e) => setMostrarVetadas(e.target.checked)}
                    className="accent-[#C8102E]"
                  />
                  Mostrar también las vetadas (tienen marca de otra empresa visible)
                </label>

                <div className="mt-3">
                  <label className={label} htmlFor="c-pos">
                    Encuadre vertical de la foto
                  </label>
                  <input
                    id="c-pos"
                    type="range"
                    min={0}
                    max={100}
                    value={pieza.fotoPosicion}
                    onChange={(e) => set("fotoPosicion", Number(e.target.value))}
                    className="w-full accent-[#C8102E]"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
