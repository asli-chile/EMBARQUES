"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toPng } from "html-to-image";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { PiezaCanvas, type TipoArrastre } from "./PiezaCanvas";
import { medirElementos, mover, type Arrastre, type Guia } from "./editor";
import {
  CATEGORIAS,
  COLORES_FLECHA,
  FAMILIAS,
  FORMATOS,
  getFormato,
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
      // El alto sale de la proporcion real de la pieza: con formatos distintos
      // un alto fijo de 750 deformaba la imagen.
      canvas.height = Math.round((600 * img.naturalHeight) / img.naturalWidth);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("sin contexto 2d"));
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("no se pudo leer el PNG"));
    img.src = pngDataUrl;
  });
}

/**
 * Deja la imagen lista para subir: la reduce y la devuelve como data URL.
 *
 * Se hace en el navegador y no en el servidor para que la funcion no tenga que
 * cargar una libreria de imagenes ni recibir archivos de 8 MB. Los logos van en
 * PNG porque casi siempre traen transparencia; las fotos en JPEG, que pesa mucho
 * menos para el mismo resultado.
 */
async function prepararImagen(file: File, tipo: "foto" | "logo"): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width: w, height: h } = bitmap;

  let escala = 1;
  if (tipo === "foto") {
    const corto = Math.min(w, h);
    escala = Math.min(1, 1300 / corto);
  } else {
    escala = Math.min(1, 600 / Math.max(w, h));
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * escala);
  canvas.height = Math.round(h * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("El navegador no pudo procesar la imagen");
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return tipo === "logo" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.82);
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

  /* ---- ajuste manual ---- */
  const [ajustando, setAjustando] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [guias, setGuias] = useState<Guia[]>([]);
  const arrastre = useRef<{
    arrastre: Arrastre;
    inicio: { puntero: { x: number; y: number }; ajuste: NonNullable<Pieza["ajustes"][string]>; alto: number };
  } | null>(null);

  const [subiendo, setSubiendo] = useState<null | "foto" | "logo">(null);
  const [categoriaSubida, setCategoriaSubida] = useState("puerto");
  const [logos, setLogos] = useState<{ archivo: string; url: string }[]>([]);

  const archivoFoto = useRef<HTMLInputElement>(null);
  const archivoLogo = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const colPrevia = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.38);
  const plantilla = getPlantilla(pieza.plantilla);
  const fmt = getFormato(pieza.formato ?? "post");
  const dims = { ancho: fmt.ancho, alto: fmt.alto };
  const usaFoto = plantilla.campos.includes("foto");

  /* ---- la vista previa se ajusta al hueco disponible ----
     Con una escala fija la pieza quedaba chica en pantallas grandes y dejaba
     media columna vacia. Se mide la columna y se calcula cuanto entra; en
     pantallas angostas solo se mira el ancho, porque ahi la columna crece con
     su contenido y leer el alto se realimentaria. */
  useEffect(() => {
    const el = colPrevia.current;
    if (!el) return;

    const medir = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width < 80) return;
      const anchoUtil = width - 48; // padding lateral
      const anchoPantalla = window.matchMedia("(min-width: 1024px)").matches;
      const altoUtil = height - 150; // botones de descarga y separacion
      const s = anchoPantalla
        ? Math.min(anchoUtil / fmt.ancho, altoUtil / fmt.alto)
        : anchoUtil / fmt.ancho;
      setEscala(Math.max(0.22, Math.min(0.8, s)));
    };

    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fmt.ancho, fmt.alto]);

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

  /* ---- logos del evento ---- */
  const cargarLogos = useCallback(async () => {
    try {
      const r = await fetch("/embarques/api/marketing/banco");
      if (!r.ok) return;
      const d = (await r.json()) as { logos?: { archivo: string; url: string }[] };
      setLogos(d.logos ?? []);
    } catch {
      /* si falla, el selector queda vacio y se puede subir uno igual */
    }
  }, []);

  useEffect(() => {
    void cargarLogos();
  }, [cargarLogos]);

  /* ---- subir al banco ---- */
  const subir = useCallback(
    async (file: File, tipo: "foto" | "logo") => {
      setSubiendo(tipo);
      setAviso(null);
      try {
        const dataUrl = await prepararImagen(file, tipo);
        const r = await fetch("/embarques/api/marketing/banco", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: file.name, categoria: categoriaSubida, tipo, dataUrl }),
        });
        const d = (await r.json()) as { url?: string; archivo?: string; error?: string };
        if (!r.ok || !d.url || !d.archivo) throw new Error(d.error ?? "No se pudo subir");

        if (tipo === "foto") {
          // Se agrega al listado local en vez de recargar el manifiesto: el
          // bucket lo sirve con cache y volveria la version anterior.
          setBanco((b) => [{ archivo: d.archivo!, categoria: categoriaSubida, estado: "ok" }, ...b]);
          setPieza((pz) => ({ ...pz, foto: d.url! }));
        } else {
          setLogos((l) => [{ archivo: d.archivo!, url: d.url! }, ...l]);
          setPieza((pz) => ({ ...pz, logo2: d.url! }));
        }
      } catch (e: unknown) {
        setAviso(e instanceof Error ? e.message : "No se pudo subir la imagen");
      } finally {
        setSubiendo(null);
      }
    },
    [categoriaSubida],
  );

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

  /* ---- ajuste manual ----
     Al entrar se miden todos los elementos y se congela su posicion actual.
     Asi el salto de "apilado" a "libre" no mueve nada de lugar, que es lo que
     pasaria si cada uno arrancara en una coordenada inventada. */
  const alternarAjuste = useCallback(() => {
    if (ajustando) {
      setAjustando(false);
      setSeleccion(null);
      setGuias([]);
      return;
    }
    // La medicion va fuera de cualquier updater: un setState dentro del
    // updater de otro es un efecto lateral y React lo descarta.
    const lienzo = canvasRef.current;
    if (lienzo) {
      const medidos = medirElementos(lienzo, escala);
      setPieza((p) => ({ ...p, ajustes: { ...medidos, ...p.ajustes } }));
    }
    setAjustando(true);
  }, [ajustando, escala]);

  const restablecer = useCallback((id?: string) => {
    setPieza((p) => {
      if (!id) return { ...p, ajustes: {} };
      const resto = { ...p.ajustes };
      delete resto[id];
      return { ...p, ajustes: resto };
    });
    setSeleccion(null);
  }, []);

  const tomar = useCallback(
    (id: string, tipo: TipoArrastre, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSeleccion(id);

      const ajuste = pieza.ajustes[id];
      if (!ajuste) return;

      // El alto lo decide el contenido, asi que se mide en vez de guardarlo.
      const el = canvasRef.current?.querySelector<HTMLElement>(`[data-elemento="${id}"]`);
      const alto = el ? el.getBoundingClientRect().height / escala : 0;

      arrastre.current = {
        arrastre:
          tipo === "mover"
            ? { modo: "mover", id }
            : { modo: "redimensionar", id, esquina: tipo === "esquina" },
        inicio: { puntero: { x: e.clientX, y: e.clientY }, ajuste, alto },
      };
    },
    [escala, pieza.ajustes],
  );

  /* El puntero se sigue en la ventana y no en el elemento: si se mueve rapido,
     el cursor se sale del elemento y los eventos dejarian de llegar. */
  useEffect(() => {
    const alMover = (e: PointerEvent) => {
      const a = arrastre.current;
      if (!a) return;
      const r = mover(a.arrastre, a.inicio, { x: e.clientX, y: e.clientY }, escala, dims);
      setGuias(r.guias);
      setPieza((p) => ({ ...p, ajustes: { ...p.ajustes, [a.arrastre.id]: r.ajuste } }));
    };
    const alSoltar = () => {
      if (!arrastre.current) return;
      arrastre.current = null;
      setGuias([]);
    };
    window.addEventListener("pointermove", alMover);
    window.addEventListener("pointerup", alSoltar);
    window.addEventListener("pointercancel", alSoltar);
    return () => {
      window.removeEventListener("pointermove", alMover);
      window.removeEventListener("pointerup", alSoltar);
      window.removeEventListener("pointercancel", alSoltar);
    };
  }, [dims.alto, dims.ancho, escala]);

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

        // El modo ajuste se apaga solo al exportar (el canvas recibe editor
        // undefined), pero hay que esperar un repintado para que las manijas y
        // el contorno ya no esten en el DOM cuando se serializa.
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        const opciones = {
          width: fmt.ancho,
          height: fmt.alto,
          pixelRatio: 1,
          cacheBust: true,
          fontEmbedCSS,
          // Cinturon y tirantes: si algo de la UI del editor quedara en el
          // arbol, igual no entra al PNG.
          filter: (nodo: HTMLElement) => !nodo.classList?.contains?.("editor-ui"),
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
        <div
          ref={colPrevia}
          className="flex min-w-0 shrink-0 flex-col items-center justify-center gap-4 overflow-hidden p-6 lg:h-full lg:w-[42%] lg:max-w-[820px]"
        >
          <div
            className="relative overflow-hidden rounded-xl border border-dash-border bg-dash-surface shadow-2xl"
            style={{ width: fmt.ancho * escala, height: fmt.alto * escala }}
          >
            <PiezaCanvas
              ref={canvasRef}
              pieza={pieza}
              escala={escala}
              /* Durante la exportacion se pasa sin editor: asi el PNG sale sin
                 manijas ni contornos, sin tener que tocar el DOM a mano. */
              editor={
                ajustando && exportando === null
                  ? { activo: true, seleccion, onTomar: tomar }
                  : undefined
              }
            />

            {/* Las guias van fuera de la pieza, en un overlay: asi no hay
                manera de que terminen dentro de la imagen exportada. */}
            {guias.map((g, i) => (
              <div
                key={`${g.eje}-${g.en}-${i}`}
                className={`guia ${g.eje} ${g.tipo === "centro" ? "centro" : ""}`}
                style={g.eje === "x" ? { left: g.en * escala } : { top: g.en * escala }}
              />
            ))}
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
              PNG {fmt.ancho}×{fmt.alto}
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

          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={alternarAjuste}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                ajustando
                  ? "border-dash-neon bg-dash-neon/15 text-dash-fg"
                  : "border-dash-border bg-dash-control text-dash-muted hover:border-dash-neon/50"
              }`}
            >
              <Icon icon={ajustando ? "mdi:cursor-move" : "mdi:tune-variant"} className="h-4 w-4" />
              {ajustando ? "Ajustando posiciones" : "Ajustar posiciones"}
            </button>

            {ajustando && seleccion ? (
              <button
                type="button"
                onClick={() => restablecer(seleccion)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-2 text-xs font-bold text-dash-muted transition hover:border-dash-neon/50"
              >
                <Icon icon="mdi:restore" className="h-4 w-4" />
                Devolver este
              </button>
            ) : null}

            {Object.keys(pieza.ajustes).length > 0 ? (
              <button
                type="button"
                onClick={() => restablecer()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-2 text-xs font-bold text-dash-muted transition hover:border-dash-neon/50"
              >
                <Icon icon="mdi:backup-restore" className="h-4 w-4" />
                Devolver todo a la plantilla
              </button>
            ) : null}
          </div>

          {ajustando ? (
            <p className="max-w-[420px] text-center text-xs text-dash-muted">
              Arrastrá cualquier elemento. Las líneas marcan cuándo queda alineado al centro o a los
              márgenes. Las manijas de la derecha cambian el ancho y el tamaño.
            </p>
          ) : null}
        </div>

        {/* ---------------- Herramientas (lo único que scrollea) ---------------- */}
        {/* El contenido va con ancho maximo: estirado a 1300 px los campos de una
            linea se vuelven incomodos de leer y de completar. */}
        <div className="min-h-0 flex-1 overflow-y-auto border-dash-border p-5 lg:border-l">
          <div className="mx-auto w-full max-w-[860px] space-y-5">
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
            <span className={label}>Formato</span>
            <div className="grid grid-cols-3 gap-2">
              {FORMATOS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => set("formato", f.id)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                    (pieza.formato ?? "post") === f.id
                      ? "border-dash-neon bg-dash-neon/10 text-dash-fg"
                      : "border-dash-border bg-dash-control text-dash-muted hover:border-dash-neon/40"
                  }`}
                >
                  {f.nombre}
                </button>
              ))}
            </div>
            <p className="text-xs text-dash-muted">
              Las plantillas se adaptan al alto del formato. Si moviste algo a mano, conviene
              revisarlo al cambiar.
            </p>
          </div>

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

            {usaCampo(pieza.plantilla, "evento") && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={label} htmlFor="c-ev-fecha">
                    Fecha
                  </label>
                  <input
                    id="c-ev-fecha"
                    className={input}
                    value={pieza.eventoFecha}
                    onChange={(e) => set("eventoFecha", e.target.value)}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="c-ev-lugar">
                    Lugar
                  </label>
                  <input
                    id="c-ev-lugar"
                    className={input}
                    value={pieza.eventoLugar}
                    onChange={(e) => set("eventoLugar", e.target.value)}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="c-ev-stand">
                    Stand
                  </label>
                  <input
                    id="c-ev-stand"
                    className={input}
                    value={pieza.eventoStand}
                    onChange={(e) => set("eventoStand", e.target.value)}
                  />
                </div>
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

          {/* ---- Logo del evento o del cliente ---- */}
          {usaCampo(pieza.plantilla, "logo2") ? (
            <div className={bloque}>
              <div className="flex items-center justify-between">
                <span className={`${label} mb-0`}>Logo del evento o cliente</span>
                <button
                  type="button"
                  onClick={() => archivoLogo.current?.click()}
                  disabled={subiendo !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-1.5 text-xs font-bold text-dash-fg transition hover:border-dash-neon/50 disabled:opacity-50"
                >
                  <Icon
                    icon={subiendo === "logo" ? "mdi:loading" : "mdi:upload"}
                    className={`h-4 w-4 ${subiendo === "logo" ? "animate-spin" : ""}`}
                  />
                  Subir logo
                </button>
              </div>
              <input
                ref={archivoLogo}
                type="file"
                accept="image/png,image/webp,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void subir(f, "logo");
                  e.target.value = "";
                }}
              />

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => set("logo2", "")}
                  className={`flex h-16 items-center justify-center rounded border-2 text-xs font-semibold transition ${
                    pieza.logo2 === ""
                      ? "border-dash-neon text-dash-fg"
                      : "border-dash-border text-dash-muted hover:border-dash-neon/40"
                  }`}
                >
                  Sin logo
                </button>
                {logos.map((l) => (
                  <button
                    key={l.archivo}
                    type="button"
                    onClick={() => set("logo2", l.url)}
                    title={l.archivo}
                    className={`flex h-16 items-center justify-center rounded border-2 bg-white/90 p-1.5 transition ${
                      pieza.logo2 === l.url ? "border-dash-neon" : "border-transparent hover:border-white/40"
                    }`}
                  >
                    <img src={l.url} alt="" className="max-h-full max-w-full object-contain" />
                  </button>
                ))}
              </div>
              <p className="text-xs text-dash-muted">
                Conviene un PNG con fondo transparente. Se guarda para las próximas piezas.
              </p>
            </div>
          ) : null}

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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => archivoFoto.current?.click()}
                  disabled={subiendo !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-1.5 text-xs font-bold text-dash-fg transition hover:border-dash-neon/50 disabled:opacity-50"
                >
                  <Icon
                    icon={subiendo === "foto" ? "mdi:loading" : "mdi:image-plus"}
                    className={`h-4 w-4 ${subiendo === "foto" ? "animate-spin" : ""}`}
                  />
                  {subiendo === "foto" ? "Subiendo…" : "Subir foto"}
                </button>
                <select
                  value={categoriaSubida}
                  onChange={(e) => setCategoriaSubida(e.target.value)}
                  aria-label="Categoría de la foto que se sube"
                  className="dash-control rounded-lg border border-dash-border px-2 py-1.5 text-xs text-dash-fg"
                >
                  {CATEGORIAS.filter((c) => c.id !== "todas").map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <input
                  ref={archivoFoto}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void subir(f, "foto");
                    e.target.value = "";
                  }}
                />
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
        </div>
      </main>
    </div>
  );
}
