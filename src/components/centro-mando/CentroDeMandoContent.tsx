"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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

const PARADAS = new Set([
  "de", "la", "el", "en", "y", "que", "un", "una", "para", "con", "por", "del", "los", "las",
  "al", "lo", "se", "su", "sus", "tus", "tu", "mi", "me", "quiero", "necesito", "hacer", "como",
  "mas", "the", "and", "for",
]);

function piezas(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !PARADAS.has(t));
}

type Recomendacion = {
  nombre: string;
  titulo: string;
  resumen: string;
  porque: string;
};

function recomendarAgentes(texto: string): Recomendacion[] {
  const busca = piezas(texto);
  if (busca.length === 0) return [];
  const ranked = oficina.agentes.map((a) => {
    const depto = oficina.departamentos.find((d) => d.id === a.departamento)?.nombre ?? "";
    const campos = [
      { peso: 4, tokens: piezas(a.titulo) },
      { peso: 3, tokens: piezas(a.nombre.replaceAll("-", " ")) },
      { peso: 2, tokens: piezas(a.resumen) },
      { peso: 2, tokens: piezas(depto) },
    ];
    let total = 0;
    const vistos = new Set<string>();
    for (const palabra of busca) {
      for (const campo of campos) {
        if (campo.tokens.some((t) => t.includes(palabra) || palabra.includes(t))) {
          total += campo.peso;
          vistos.add(palabra);
          break;
        }
      }
    }
    return { a, total, vistos: [...vistos] };
  });
  return ranked
    .filter((p) => p.total > 0)
    .sort((x, y) => y.total - x.total)
    .slice(0, 5)
    .map((p) => ({
      nombre: p.a.nombre,
      titulo: p.a.titulo,
      resumen: p.a.resumen,
      porque: p.vistos.length > 0 ? `Coincide con: ${p.vistos.slice(0, 4).join(", ")}` : p.a.resumen,
    }));
}

const oficina = catalogo as {
  departamentos: { id: string; nombre: string }[];
  agentes: AgenteOficina[];
};

const COLORES_SALA: Record<string, string> = {
  direccion: "#8B5CF6",
  marketing: "#EC4899",
  "seo-cro": "#F97316",
  ventas: "#EAB308",
  producto: "#14B8A6",
  ingenieria: "#3B82F6",
  "datos-ia": "#06B6D4",
  seguridad: "#EF4444",
  calidad: "#84CC16",
  finanzas: "#22C55E",
  herramientas: "#94A3B8",
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
  const [busca, setBusca] = useState("");
  const [marcados, setMarcados] = useState<string[]>([]);
  const [necesidad, setNecesidad] = useState("");
  const [recomendados, setRecomendados] = useState<Recomendacion[]>([]);
  const [motorAgente, setMotorAgente] = useState<Motor>("claude");
  const [avisoAgente, setAvisoAgente] = useState<string | null>(null);
  const [enviandoAgente, setEnviandoAgente] = useState(false);
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
    if (!q) return oficina.agentes;
    return oficina.agentes.filter((a) => {
      const depto = oficina.departamentos.find((d) => d.id === a.departamento)?.nombre ?? "";
      return `${a.titulo} ${a.nombre} ${a.resumen} ${depto}`.toLowerCase().includes(q);
    });
  }, [busca]);

  const salasPlano = useMemo(() => {
    const porSala = new Map<string, AgenteOficina[]>();
    for (const agente of visibles) {
      const lista = porSala.get(agente.departamento) ?? [];
      lista.push(agente);
      porSala.set(agente.departamento, lista);
    }
    return oficina.departamentos
      .map((d) => ({
        ...d,
        color: COLORES_SALA[d.id] ?? "#94A3B8",
        agentes: porSala.get(d.id) ?? [],
      }))
      .filter((d) => d.agentes.length > 0);
  }, [visibles]);

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

  function alternarMarca(nombre: string) {
    setMarcados((prev) => (prev.includes(nombre) ? prev.filter((n) => n !== nombre) : [...prev, nombre]));
  }

  function sugerir() {
    if (necesidad.trim().length < 8) {
      setRecomendados([]);
      setAvisoAgente("Describe un poco más qué quieres resolver.");
      return;
    }
    const lista = recomendarAgentes(necesidad);
    setRecomendados(lista);
    setAvisoAgente(lista.length === 0 ? "Ningún agente calza. Márcalos en el plano." : null);
  }

  function usarRecomendacion() {
    setMarcados((prev) => [...new Set([...prev, ...recomendados.map((r) => r.nombre)])]);
  }

  async function encargarAgentes() {
    if (marcados.length === 0) {
      setAvisoAgente("Marca al menos un agente, o acepta la recomendación.");
      return;
    }
    if (necesidad.trim() === "") {
      setAvisoAgente("Escribe qué necesitas.");
      return;
    }
    setEnviandoAgente(true);
    try {
      const res = await fetch("http://127.0.0.1:4317/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentes: marcados,
          texto: necesidad.trim(),
          modelo: motorAgente === "cursor" ? "composer-2.5" : "sonnet",
          permiso: "lectura",
          motor: motorAgente,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo encargar.");
      const quien = motorAgente === "cursor" ? "Cursor" : "Claude";
      setAvisoAgente(
        marcados.length === 1
          ? `${quien} ya tiene el encargo. Lo ves en la oficina en vivo.`
          : `${quien} ya tiene el encargo de ${marcados.length} agentes. Lo ves en la oficina en vivo.`,
      );
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "";
      setAvisoAgente(
        mensaje && mensaje !== "Failed to fetch"
          ? mensaje
          : "La oficina atiende en esta computadora. Ábrela y vuelve a encargar.",
      );
    } finally {
      setEnviandoAgente(false);
    }
  }

  return (
    <main className="cmd">
      <div className="cmd-ficheros" role="tablist" aria-label="Secciones">
        <button
          type="button"
          role="tab"
          className={vista === "pedido" ? "cmd-ficha cmd-ficha-activa" : "cmd-ficha"}
          aria-selected={vista === "pedido"}
          onClick={() => setVista("pedido")}
        >
          Creador de contenido
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
        {vista === "oficina" ? (
          <section className="of" aria-label="Oficina de agentes">
            <header className="of-barra">
              <div className="of-marca">
                <span className="of-lampara" aria-hidden="true" />
                <h1>Oficina de agentes</h1>
              </div>
              <p className="of-pulso">
                <b>{visibles.length}</b> en su escritorio
              </p>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar agente…"
                aria-label="Buscar agente"
              />
            </header>
            <div className="of-cuerpo">
            {salasPlano.length === 0 ? (
              <p className="of-vacio">Ningún agente coincide con la búsqueda.</p>
            ) : (
              <div className="of-plano">
                {salasPlano.map((sala) => (
                  <section key={sala.id} className="of-sala" style={{ "--color-sala": sala.color } as CSSProperties}>
                    <div className="of-sala-cabecera">
                      <h2>{sala.nombre}</h2>
                      <span>{sala.agentes.length} agentes</span>
                    </div>
                    <div className="of-escritorios">
                      {sala.agentes.map((a) => (
                        <button
                          key={a.nombre}
                          type="button"
                          className={[
                            "of-escritorio",
                            marcados.includes(a.nombre) ? "of-escritorio-activo" : "",
                            recomendados.some((r) => r.nombre === a.nombre) ? "of-escritorio-sugerido" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-pressed={marcados.includes(a.nombre)}
                          onClick={() => alternarMarca(a.nombre)}
                        >
                          <span className="of-luz" aria-hidden="true" />
                          <span className="of-nombre">{a.titulo}</span>
                          <span className="of-resumen">{a.resumen}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
            <aside className="of-encargo" aria-label="Encargo a agentes">
              <h2>Encargo</h2>
              <p className="of-ayuda">
                Marca uno o varios escritorios, o describe lo que quieres y te recomiendo agentes.
              </p>
              <label className="of-campo">
                Qué necesitas
                <textarea
                  value={necesidad}
                  onChange={(e) => setNecesidad(e.target.value)}
                  rows={5}
                  placeholder="Un reel de cereza, marítimo y aéreo, para exportadores."
                />
              </label>
              <button type="button" className="of-btn" onClick={sugerir}>
                Recomendar agentes
              </button>
              {recomendados.length > 0 ? (
                <>
                  <ul className="of-recs">
                    {recomendados.map((r) => (
                      <li key={r.nombre}>
                        <button
                          type="button"
                          className={marcados.includes(r.nombre) ? "of-rec of-rec-on" : "of-rec"}
                          aria-pressed={marcados.includes(r.nombre)}
                          onClick={() => alternarMarca(r.nombre)}
                        >
                          <strong>{r.titulo}</strong>
                          <span>{r.porque}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="of-btn" onClick={usarRecomendacion}>
                    Marcar la recomendación
                  </button>
                </>
              ) : null}
              <p className="of-marcados">
                {marcados.length === 0 ? "Ningún escritorio marcado." : `${marcados.length} marcados`}
              </p>
              <div className="of-chips">
                {marcados.map((nombre) => (
                  <button key={nombre} type="button" className="of-chip" onClick={() => alternarMarca(nombre)}>
                    {oficina.agentes.find((a) => a.nombre === nombre)?.titulo ?? nombre}
                  </button>
                ))}
              </div>
              <div className="of-motores" role="group" aria-label="A quién encargar">
                <button
                  type="button"
                  className={motorAgente === "claude" ? "of-btn of-btn-on" : "of-btn"}
                  aria-pressed={motorAgente === "claude"}
                  onClick={() => setMotorAgente("claude")}
                >
                  Claude
                </button>
                <button
                  type="button"
                  className={motorAgente === "cursor" ? "of-btn of-btn-on" : "of-btn"}
                  aria-pressed={motorAgente === "cursor"}
                  onClick={() => setMotorAgente("cursor")}
                >
                  Cursor
                </button>
              </div>
              <button type="button" className="of-btn of-btn-primario" disabled={enviandoAgente} onClick={encargarAgentes}>
                {enviandoAgente ? "Encargando…" : "Hacer el pedido"}
              </button>
              {avisoAgente ? <p className="of-aviso">{avisoAgente}</p> : null}
            </aside>
            </div>
          </section>
        ) : (
        <div className="cmd-mando">
        <header className="cmd-frente">
          <div className="cmd-marca">
            <span className="cmd-lampara" aria-hidden="true" />
            <div>
              <p className="cmd-kicker">ПУЛЬТ · ASLI</p>
              <h1 className="cmd-titulo">Creador de contenido</h1>
            </div>
          </div>
          <p className="cmd-serie">ЭВМ-186 · CURICÓ</p>
        </header>
        <div className="cmd-mando-cuerpo">
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
        </div>
        </div>
        )}
      </div>
    </main>
  );
}
