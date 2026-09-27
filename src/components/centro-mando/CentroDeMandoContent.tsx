"use client";

import { useEffect, useMemo, useState } from "react";
import { withBase } from "@/lib/basePath";

const CLAVE = "erp-centro-mando-pedidos";

const FORMATOS = [
  { id: "reel", nombre: "Reel", medida: "9:16" },
  { id: "historia", nombre: "Historia", medida: "9:16" },
  { id: "feed", nombre: "Feed", medida: "4:5" },
  { id: "cuadrado", nombre: "Cuadrado", medida: "1:1" },
  { id: "horizontal", nombre: "Horizontal", medida: "16:9" },
] as const;

type FormatoId = (typeof FORMATOS)[number]["id"];
type TipoPedido = "video" | "imagenes" | "pack";
type Motor = "claude" | "cursor";
type OrigenCaptura = "web" | "portal";

type Pedido = {
  id: string;
  creado: string;
  tipo: TipoPedido;
  formatos: FormatoId[];
  motor: Motor;
  proyecto: string;
  encargo: string;
  guion: boolean;
  musica: boolean;
  volumenMusica: number;
  volumenVoz: number;
  capturas: boolean;
  origenCaptura: OrigenCaptura;
  imagenes: string[];
};

const input =
  "dash-control w-full rounded-lg border border-dash-border px-3.5 py-2.5 text-base text-dash-fg placeholder:text-dash-muted focus:border-dash-neon/50 focus:outline-none focus:ring-2 focus:ring-dash-neon/40";

function leerPedidos(): Pedido[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return [];
    const data = JSON.parse(crudo) as Pedido[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function CentroDeMandoContent() {
  const [tipo, setTipo] = useState<TipoPedido>("video");
  const [formatos, setFormatos] = useState<FormatoId[]>(["reel"]);
  const [motor, setMotor] = useState<Motor>("claude");
  const [proyecto, setProyecto] = useState("");
  const [encargo, setEncargo] = useState("");
  const [guion, setGuion] = useState(true);
  const [musica, setMusica] = useState(false);
  const [volumenMusica, setVolumenMusica] = useState(70);
  const [volumenVoz, setVolumenVoz] = useState(100);
  const [capturas, setCapturas] = useState(false);
  const [origenCaptura, setOrigenCaptura] = useState<OrigenCaptura>("web");
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  const llevaVideo = tipo === "video" || tipo === "pack";

  useEffect(() => {
    setPedidos(leerPedidos());
  }, []);

  const resumen = useMemo(() => {
    if (!llevaVideo) return "Solo imágenes, en el creador.";
    const piezas = FORMATOS.filter((f) => formatos.includes(f.id))
      .map((f) => f.nombre)
      .join(", ");
    return piezas || "Marca al menos un formato.";
  }, [formatos, llevaVideo]);

  function alternarFormato(id: FormatoId) {
    setFormatos((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }

  function guardar(pedido: Pedido) {
    const siguiente = [pedido, ...pedidos];
    setPedidos(siguiente);
    localStorage.setItem(CLAVE, JSON.stringify(siguiente));
  }

  function pedir() {
    if (llevaVideo && formatos.length === 0) {
      setAviso("Marca al menos un formato de video.");
      return;
    }
    if (llevaVideo && proyecto.trim() === "") {
      setAviso("Escribe el nombre de la carpeta en proyectos.");
      return;
    }
    if (encargo.trim() === "") {
      setAviso("Escribe el encargo: tema y qué hay que decir.");
      return;
    }
    const pedido: Pedido = {
      id: crypto.randomUUID(),
      creado: new Date().toISOString(),
      tipo,
      formatos: llevaVideo ? formatos : [],
      motor,
      proyecto: proyecto.trim(),
      encargo: encargo.trim(),
      guion: llevaVideo && guion,
      musica: llevaVideo && musica,
      volumenMusica,
      volumenVoz,
      capturas: llevaVideo && capturas,
      origenCaptura,
      imagenes,
    };
    guardar(pedido);
    setAviso(null);
    setEncargo("");
    setImagenes([]);
  }

  function nombresDe(lista: FileList | null) {
    if (!lista) return;
    setImagenes((prev) => [...prev, ...Array.from(lista).map((f) => f.name)]);
  }

  return (
    <main className="erp-carga min-h-0 flex-1 overflow-auto p-4 md:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-dash-muted">ASLI · superadmin</p>
          <h1 className="mt-1 text-2xl font-semibold text-dash-fg">Centro de mando</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dash-muted">
            Pide el video, las imágenes o el pack. El motor se elige una vez. El primer render es el video con los
            textos; el guion y la voz llegan después.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
          <section className="flex flex-col gap-5 rounded-2xl border border-dash-border bg-dash-surface/80 p-4 md:p-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-dash-fg">Pedido</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["video", "Solo video"],
                    ["imagenes", "Solo imágenes"],
                    ["pack", "Pack"],
                  ] as const
                ).map(([id, nombre]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTipo(id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                      tipo === id
                        ? "border-dash-neon bg-dash-neon/15 text-dash-fg"
                        : "border-dash-border text-dash-muted"
                    }`}
                  >
                    {nombre}
                  </button>
                ))}
              </div>
            </fieldset>

            {llevaVideo ? (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-dash-fg">Formatos</legend>
                <div className="flex flex-wrap gap-2">
                  {FORMATOS.map((f) => {
                    const activo = formatos.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                          activo ? "border-dash-neon text-dash-fg" : "border-dash-border text-dash-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={activo}
                          onChange={() => alternarFormato(f.id)}
                        />
                        {f.nombre}
                        <span className="text-xs text-dash-muted">{f.medida}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-dash-fg">Motor</legend>
              <div className="flex gap-2">
                {(
                  [
                    ["claude", "Claude"],
                    ["cursor", "Cursor"],
                  ] as const
                ).map(([id, nombre]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMotor(id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                      motor === id
                        ? "border-dash-neon bg-dash-neon/15 text-dash-fg"
                        : "border-dash-border text-dash-muted"
                    }`}
                  >
                    {nombre}
                  </button>
                ))}
              </div>
            </fieldset>

            {llevaVideo ? (
              <label className="block text-sm font-semibold text-dash-muted">
                Carpeta en proyectos
                <input
                  className={`${input} mt-1.5`}
                  value={proyecto}
                  onChange={(e) => setProyecto(e.target.value)}
                  placeholder="contenedor"
                />
              </label>
            ) : null}

            <label className="block text-sm font-semibold text-dash-muted">
              Encargo
              <textarea
                className={`${input} mt-1.5 min-h-28 resize-y`}
                value={encargo}
                onChange={(e) => setEncargo(e.target.value)}
                placeholder="Temporada de cereza, para ejecutivos de exportadoras. Marítimo y aéreo desde Curicó."
              />
            </label>

            <div className="flex flex-wrap gap-3 text-sm text-dash-fg">
              <label className="flex items-center gap-2">
                <input type="file" accept="image/*" multiple className="max-w-[14rem] text-xs" onChange={(e) => nombresDe(e.target.files)} />
                Subir imágenes
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="max-w-[14rem] text-xs"
                  // La carpeta solo existe en Chromium; el tipo estándar no la declara.
                  {...{ webkitdirectory: "", directory: "" }}
                  onChange={(e) => nombresDe(e.target.files)}
                />
                Subir carpeta
              </label>
              <a className="font-semibold text-dash-neon underline-offset-2 hover:underline" href={withBase("/creador-publicidad")}>
                Abrir el creador de imágenes
              </a>
            </div>
            {imagenes.length > 0 ? (
              <p className="text-xs text-dash-muted">{imagenes.length} archivo(s): {imagenes.join(", ")}</p>
            ) : null}

            {llevaVideo ? (
              <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-semibold text-dash-fg">Opciones del primer render</legend>
                <label className="flex items-center gap-2 text-sm text-dash-fg">
                  <input type="checkbox" checked={guion} onChange={(e) => setGuion(e.target.checked)} />
                  Guion después del video
                </label>
                <label className="flex items-center gap-2 text-sm text-dash-fg">
                  <input type="checkbox" checked={musica} onChange={(e) => setMusica(e.target.checked)} />
                  Con música
                </label>
                {musica ? (
                  <label className="text-sm text-dash-muted">
                    Volumen de la música: {volumenMusica}%
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volumenMusica}
                      onChange={(e) => setVolumenMusica(Number(e.target.value))}
                      className="mt-1 block w-full"
                    />
                  </label>
                ) : null}
                <label className="text-sm text-dash-muted">
                  Volumen de la voz, cuando la subas: {volumenVoz}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volumenVoz}
                    onChange={(e) => setVolumenVoz(Number(e.target.value))}
                    className="mt-1 block w-full"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-dash-fg">
                  <input type="checkbox" checked={capturas} onChange={(e) => setCapturas(e.target.checked)} />
                  Capturas
                </label>
                {capturas ? (
                  <div className="flex flex-wrap gap-2 pl-6 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="origen"
                        checked={origenCaptura === "web"}
                        onChange={() => setOrigenCaptura("web")}
                      />
                      asli.cl
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="origen"
                        checked={origenCaptura === "portal"}
                        onChange={() => setOrigenCaptura("portal")}
                      />
                      Portal, cuenta de prueba
                    </label>
                  </div>
                ) : null}
              </fieldset>
            ) : null}

            {aviso ? <p className="text-sm font-semibold text-red-400">{aviso}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={pedir}
                className="rounded-lg bg-dash-neon px-4 py-2.5 text-sm font-semibold text-[#04120f]"
              >
                Dejar el pedido
              </button>
              <p className="text-sm text-dash-muted">{resumen}</p>
            </div>
          </section>

          <aside className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-dash-fg">Pedidos en este navegador</h2>
            {pedidos.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-dash-border p-4 text-sm text-dash-muted">
                Todavía no hay pedidos. El primero queda guardado aquí, en este equipo.
              </p>
            ) : (
              pedidos.map((p) => (
                <article key={p.id} className="rounded-2xl border border-dash-border p-4">
                  <p className="text-xs uppercase tracking-wide text-dash-muted">
                    {new Date(p.creado).toLocaleString("es-CL")} · {p.motor}
                  </p>
                  <h3 className="mt-1 font-semibold text-dash-fg">
                    {p.tipo === "imagenes" ? "Imágenes" : p.proyecto || "Sin carpeta"}
                  </h3>
                  <p className="mt-1 text-sm text-dash-muted">{p.encargo}</p>
                  {p.formatos.length > 0 ? (
                    <p className="mt-2 text-xs text-dash-fg">{p.formatos.join(" · ")}</p>
                  ) : null}
                  <p className="mt-2 text-xs leading-relaxed text-dash-muted">
                    {p.musica ? `Música al ${p.volumenMusica}%. ` : "Sin música. "}
                    {p.guion ? `Guion después del render. Voz al ${p.volumenVoz}%.` : "Sin guion."}
                    {p.capturas
                      ? p.origenCaptura === "portal"
                        ? " Capturas del portal con la cuenta de prueba."
                        : " Capturas de asli.cl."
                      : ""}
                  </p>
                </article>
              ))
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
