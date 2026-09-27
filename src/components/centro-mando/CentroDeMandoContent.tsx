"use client";

import { useEffect, useMemo, useState } from "react";
import { withBase } from "@/lib/basePath";
import "./centro-mando.css";
import catalogo from "./oficina.json";

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
type Vista = "pedido" | "oficina";

type AgenteOficina = {
  nombre: string;
  titulo: string;
  departamento: string;
  resumen: string;
};

const oficina = catalogo as {
  departamentos: { id: string; nombre: string }[];
  agentes: AgenteOficina[];
};

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
  const [vista, setVista] = useState<Vista>("pedido");
  const [sala, setSala] = useState("todas");
  const [busca, setBusca] = useState("");
  const [ficha, setFicha] = useState<string | null>(null);
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

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return oficina.agentes.filter((a) => {
      if (sala !== "todas" && a.departamento !== sala) return false;
      if (!q) return true;
      return `${a.titulo} ${a.nombre} ${a.resumen}`.toLowerCase().includes(q);
    });
  }, [busca, sala]);

  const elegido = oficina.agentes.find((a) => a.nombre === ficha) ?? null;

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
    <main className="cmd">
      <div className="cmd-ficheros" role="tablist" aria-label="Pantallas">
        <button
          type="button"
          role="tab"
          className={vista === "pedido" ? "cmd-ficha cmd-ficha-activa" : "cmd-ficha"}
          aria-selected={vista === "pedido"}
          onClick={() => setVista("pedido")}
        >
          Centro de mando
        </button>
        <button
          type="button"
          role="tab"
          className={vista === "oficina" ? "cmd-ficha cmd-ficha-activa" : "cmd-ficha"}
          aria-selected={vista === "oficina"}
          onClick={() => setVista("oficina")}
        >
          Oficina de agentes
        </button>
      </div>
      <div className="cmd-chasis">
        <header className="cmd-frente">
          <div className="cmd-marca">
            <span className="cmd-lampara" aria-hidden="true" />
            <div>
              <p className="cmd-kicker">ПУЛЬТ · ASLI</p>
              <h1 className="cmd-titulo">{vista === "pedido" ? "Centro de mando" : "Oficina de agentes"}</h1>
            </div>
          </div>
          <p className="cmd-serie">ЭВМ-186 · CURICÓ</p>
        </header>

        {vista === "pedido" ? (
        <div className="cmd-rejilla">
          <section className="cmd-pantalla" aria-label="Pedido">
            <div className="cmd-cuerpo">
              <fieldset className="cmd-bloque">
                <legend className="cmd-leyenda">Pedido</legend>
                <div className="cmd-opciones">
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
                      className="cmd-tecla"
                      aria-pressed={tipo === id}
                      onClick={() => setTipo(id)}
                    >
                      {nombre}
                    </button>
                  ))}
                </div>
              </fieldset>

              {llevaVideo ? (
                <fieldset className="cmd-bloque">
                  <legend className="cmd-leyenda">Formatos</legend>
                  <div className="cmd-formatos">
                    {FORMATOS.map((f) => (
                      <label key={f.id} className="cmd-casilla">
                        <input
                          type="checkbox"
                          checked={formatos.includes(f.id)}
                          onChange={() => alternarFormato(f.id)}
                        />
                        {f.nombre}
                        <span className="cmd-medida">{f.medida}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              <fieldset className="cmd-bloque">
                <legend className="cmd-leyenda">Motor</legend>
                <div className="cmd-opciones">
                  {(
                    [
                      ["claude", "Claude"],
                      ["cursor", "Cursor"],
                    ] as const
                  ).map(([id, nombre]) => (
                    <button
                      key={id}
                      type="button"
                      className="cmd-tecla"
                      aria-pressed={motor === id}
                      onClick={() => setMotor(id)}
                    >
                      {nombre}
                    </button>
                  ))}
                </div>
              </fieldset>

              {llevaVideo ? (
                <label className="cmd-campo">
                  Carpeta en proyectos
                  <input
                    type="text"
                    value={proyecto}
                    onChange={(e) => setProyecto(e.target.value)}
                    placeholder="contenedor"
                  />
                </label>
              ) : null}

              <label className="cmd-campo">
                Encargo
                <textarea
                  value={encargo}
                  onChange={(e) => setEncargo(e.target.value)}
                  placeholder="Temporada de cereza. Marítimo y aéreo desde Curicó."
                />
              </label>

              <div className="cmd-archivos">
                <label className="cmd-archivo">
                  <input type="file" accept="image/*" multiple onChange={(e) => nombresDe(e.target.files)} />
                  Subir imágenes
                </label>
                <label className="cmd-archivo">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    {...{ webkitdirectory: "", directory: "" }}
                    onChange={(e) => nombresDe(e.target.files)}
                  />
                  Subir carpeta
                </label>
                <a className="cmd-enlace" href={withBase("/creador-publicidad")}>
                  Abrir el creador de imágenes
                </a>
              </div>
              {imagenes.length > 0 ? (
                <p className="cmd-nota">
                  {imagenes.length} archivo(s): {imagenes.join(", ")}
                </p>
              ) : null}

              {llevaVideo ? (
                <fieldset className="cmd-bloque cmd-opcion">
                  <legend className="cmd-leyenda">Primer render</legend>
                  <label className="cmd-check">
                    <input type="checkbox" checked={guion} onChange={(e) => setGuion(e.target.checked)} />
                    Guion después del video
                  </label>
                  <label className="cmd-check">
                    <input type="checkbox" checked={musica} onChange={(e) => setMusica(e.target.checked)} />
                    Con música
                  </label>
                  {musica ? (
                    <label className="cmd-volumen">
                      Volumen de la música: {volumenMusica}%
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={volumenMusica}
                        onChange={(e) => setVolumenMusica(Number(e.target.value))}
                      />
                    </label>
                  ) : null}
                  <label className="cmd-volumen">
                    Volumen de la voz, cuando la subas: {volumenVoz}%
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volumenVoz}
                      onChange={(e) => setVolumenVoz(Number(e.target.value))}
                    />
                  </label>
                  <label className="cmd-check">
                    <input type="checkbox" checked={capturas} onChange={(e) => setCapturas(e.target.checked)} />
                    Capturas
                  </label>
                  {capturas ? (
                    <div className="cmd-opciones">
                      <label className="cmd-radio">
                        <input
                          type="radio"
                          name="origen"
                          checked={origenCaptura === "web"}
                          onChange={() => setOrigenCaptura("web")}
                        />
                        asli.cl
                      </label>
                      <label className="cmd-radio">
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

              {aviso ? <p className="cmd-aviso">{aviso}</p> : null}

              <div className="cmd-lanzar">
                <button type="button" className="cmd-enviar" onClick={pedir}>
                  Dejar el pedido
                </button>
                <p className="cmd-nota">{resumen}</p>
              </div>
            </div>
          </section>

          <aside className="cmd-registro">
            <h2>Registro</h2>
            <div className="cmd-lista">
              {pedidos.length === 0 ? (
                <p className="cmd-vacio">Todavía no hay pedidos. El primero queda en este equipo.</p>
              ) : (
                pedidos.map((p) => (
                  <article key={p.id} className="cmd-pedido">
                    <p className="cmd-cuando">
                      {new Date(p.creado).toLocaleString("es-CL")} · {p.motor}
                    </p>
                    <h3>{p.tipo === "imagenes" ? "Imágenes" : p.proyecto || "Sin carpeta"}</h3>
                    <p>{p.encargo}</p>
                    {p.formatos.length > 0 ? <p>{p.formatos.join(" · ")}</p> : null}
                    <p>
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
            </div>
          </aside>
        </div>
        ) : (
          <section className="cmd-pantalla" aria-label="Oficina de agentes">
            <div className="cmd-cuerpo">
              <div className="cmd-oficina-barra">
                <label className="cmd-campo">
                  Buscar agente
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="seo, cfo, cereza, copy…"
                  />
                </label>
                <a className="cmd-enlace" href="http://127.0.0.1:4317" target="_blank" rel="noreferrer">
                  Abrir la oficina en vivo
                </a>
              </div>
              <div className="cmd-formatos">
                <button
                  type="button"
                  className="cmd-tecla"
                  aria-pressed={sala === "todas"}
                  onClick={() => setSala("todas")}
                >
                  Todas · {oficina.agentes.length}
                </button>
                {oficina.departamentos.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="cmd-tecla"
                    aria-pressed={sala === d.id}
                    onClick={() => setSala(d.id)}
                  >
                    {d.nombre}
                  </button>
                ))}
              </div>
              <div className="cmd-planta">
                <ul className="cmd-escritorios">
                  {visibles.map((a) => (
                    <li key={a.nombre}>
                      <button
                        type="button"
                        className={ficha === a.nombre ? "cmd-escritorio cmd-escritorio-activo" : "cmd-escritorio"}
                        onClick={() => setFicha(a.nombre)}
                      >
                        <span>{a.titulo}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <aside className="cmd-ficha-agente">
                  {elegido ? (
                    <>
                      <p className="cmd-cuando">
                        {oficina.departamentos.find((d) => d.id === elegido.departamento)?.nombre}
                      </p>
                      <h2>{elegido.titulo}</h2>
                      <p>{elegido.resumen}</p>
                    </>
                  ) : (
                    <p className="cmd-vacio">
                      {visibles.length === 0
                        ? "Ningún agente coincide con la búsqueda."
                        : "Elige un escritorio para ver qué hace."}
                    </p>
                  )}
                </aside>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
