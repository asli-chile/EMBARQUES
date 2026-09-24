"use client";

import { forwardRef, type ReactNode } from "react";
import { withBase } from "@/lib/basePath";
import {
  getFormato,
  getPlantilla,
  partir,
  type Ajustes,
  type CampoId,
  type Extra,
  type Pieza,
} from "./plantillas";

/**
 * La pieza tal cual se exporta: 1080x1350 px reales.
 *
 * La vista previa la encoge con `escala` (transform), no cambiando medidas:
 * así lo que se ve en pantalla y lo que sale en el PNG son el mismo nodo, y no
 * hay forma de que se desincronicen.
 *
 * El lienzo se arma leyendo `maqueta` y `campos` de la plantilla. Los elementos
 * de contenido salen en el mismo orden de lectura siempre, apilados; pero si
 * uno tiene ajuste manual sale de la pila y se dibuja en su coordenada.
 */

const LOGO_CLARO = withBase("/logoblanco.png");
const LOGO_OSCURO = withBase("/logoasli.png");

/** Solo permitimos <b> en la bajada: el resto se escapa. */
function bajadaHtml(texto: string): string {
  const escapado = texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escapado.replace(/&lt;b&gt;/g, "<b>").replace(/&lt;\/b&gt;/g, "</b>");
}

function Marca() {
  return (
    <svg className="mark" viewBox="0 0 60 44" fill="none" aria-hidden="true">
      <path d="M22 2 L38 2 L60 42 L42 42 L30 18 L18 42 L0 42 Z" fill="#C8102E" />
    </svg>
  );
}

function Pie() {
  return (
    <div className="footer">
      <Marca />
      <div className="addr">
        <b>Longitudinal Sur KM 186,</b> <span>Curicó, Chile</span>
      </div>
    </div>
  );
}

/** Anillo de porcentaje. SVG y no un borde con conic-gradient: el exportador
 *  serializa SVG sin problemas, y conic-gradient sale con bandas. */
function Dona({ valor, texto }: { valor: number; texto: string }) {
  const r = 150;
  const circ = 2 * Math.PI * r;
  const avance = Math.max(0, Math.min(100, valor)) / 100;
  return (
    <div className="dona-bloque">
      <svg className="dona" viewBox="0 0 360 360" aria-hidden="true">
        <circle cx="180" cy="180" r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="38" />
        <circle
          cx="180"
          cy="180"
          r={r}
          fill="none"
          stroke="#C8102E"
          strokeWidth="38"
          strokeLinecap="butt"
          strokeDasharray={`${circ * avance} ${circ}`}
          transform="rotate(-90 180 180)"
        />
        <text x="180" y="180" className="dona-num" textAnchor="middle" dominantBaseline="central">
          {valor}%
        </text>
      </svg>
      {texto ? <div className="dato-etiqueta">{texto}</div> : null}
    </div>
  );
}

/**
 * Dibuja un bloque agregado a mano.
 *
 * Reutiliza las mismas clases que los elementos de plantilla: un parrafo
 * agregado y la bajada de una plantilla tienen que verse igual, si no la hoja
 * en blanco pareceria de otra marca.
 */
function BloqueExtra({
  extra,
  alineacion,
  completa,
  redondeo,
}: {
  extra: Extra;
  alineacion: string;
  completa: boolean;
  redondeo: number;
}) {
  const limpio = extra.lineas.filter((x) => x.trim());
  const pares = limpio.map(partir);

  switch (extra.tipo) {
    case "titulo":
      return (
        <h1>
          <span className="l2" style={{ fontSize: `${extra.tam}px` }}>
            {extra.texto}
          </span>
        </h1>
      );
    case "subtitulo":
      return (
        <h1>
          <span className="l1" style={{ fontSize: `${extra.tam}px` }}>
            {extra.texto}
          </span>
        </h1>
      );
    case "parrafo":
      return <p className="support" dangerouslySetInnerHTML={{ __html: bajadaHtml(extra.texto) }} />;
    case "cinta":
      return <div className="ribbon">{extra.texto}</div>;
    case "cita":
      return (
        <>
          <blockquote className="cita">{extra.texto}</blockquote>
          {extra.texto2 ? <div className="firma">— {extra.texto2}</div> : null}
        </>
      );
    case "dato":
      return (
        <div className="dato-bloque">
          <div className="dato" style={{ fontSize: `${extra.tam}px` }}>
            {extra.texto}
          </div>
          {extra.texto2 ? <div className="dato-etiqueta">{extra.texto2}</div> : null}
        </div>
      );
    case "lista":
      return (
        <ul className="list">
          {limpio.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      );
    case "checklist":
      return (
        <ul className="checklist">
          {limpio.map((t, i) => (
            <li key={i}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 12.5 L9.5 18 L20 6"
                  fill="none"
                  stroke="#C8102E"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      );
    case "pasos":
      return (
        <ol className="pasos">
          {limpio.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      );
    case "metricas":
      return (
        <div className="metricas">
          {pares.map(([n, et], i) => (
            <div key={i}>
              <div className="m-num">{n}</div>
              <div className="m-et">{et}</div>
            </div>
          ))}
        </div>
      );
    case "barras":
      return (
        <div className="barras">
          {pares.map(([et, v], i) => {
            const n = Math.max(0, Math.min(100, parseInt(v, 10) || 0));
            return (
              <div className="barra" key={i}>
                <div className="b-cab">
                  <span>{et}</span>
                  <span className="b-val">{n}%</span>
                </div>
                <div className="b-riel">
                  <div className="b-relleno" style={{ width: `${n}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      );
    case "tabla":
      return (
        <div className="tabla">
          {pares.map(([a2, b2], i) => (
            <div className="fila" key={i}>
              <span>{a2}</span>
              <span className="valor">{b2}</span>
            </div>
          ))}
        </div>
      );
    case "tarjetas":
      return (
        <div className={`tarjetas${pares.length >= 4 ? " cuatro" : ""}`}>
          {pares.map(([t, d], i) => (
            <div className="tarjeta" key={i}>
              <h3>{t}</h3>
              {d ? <p>{d}</p> : null}
            </div>
          ))}
        </div>
      );
    case "hitos":
      return (
        <div className="hitos">
          {pares.map(([f, t], i) => (
            <div className="hito" key={i}>
              <div className="h-fecha">{f}</div>
              <div className="h-texto">{t}</div>
            </div>
          ))}
        </div>
      );
    case "imagen":
      return extra.url ? (
        <img
          className="imagen-bloque"
          src={extra.url}
          alt=""
          /* Sin esto el navegador arranca su propio arrastre de imagen y el
             gesto se pierde a mitad de camino. */
          draggable={false}
          style={{
            marginLeft: alineacion === "izq" ? 0 : undefined,
            objectFit: completa ? "contain" : "cover",
            borderRadius: redondeo ? `${redondeo}px` : undefined,
          }}
        />
      ) : (
        <div className="imagen-vacia">Elegí una foto</div>
      );
    case "pie":
      return <Pie />;
    default:
      return null;
  }
}

/** Fondos cuyo recorte es parte del diseno y no se deben redondear. */
const SILUETA = ["split", "medallon", "arco"];

/**
 * Estilo del marco que recorta la foto.
 *
 * El redondeo va en el marco y no en la foto por el acercamiento: la foto se
 * agranda con `transform: scale`, y si el borde viviera en ella se iria fuera
 * de la vista junto con la imagen. En el marco se queda quieto.
 */
function marcoRedondeado(r: number, aSangre: boolean): React.CSSProperties {
  return {
    borderRadius: `${r}px`,
    overflow: "hidden",
    // Ademas del overflow, el recorte explicito: el exportador serializa el
    // fondo y ahi el redondeo solo se sostiene con clip-path. Es el mismo
    // motivo por el que el medallon usa circle() y no border-radius.
    clipPath: `inset(0 round ${r}px)`,
    // Una foto a sangre no mostraria el redondeo: sus esquinas caen fuera de
    // la pieza. Se le deja un margen igual al radio para que el borde exista.
    ...(aSangre ? { inset: `${r}px` } : null),
  };
}

export type TipoArrastre = "mover" | "ancho" | "esquina";

export type Editor = {
  activo: boolean;
  seleccion: string | null;
  onTomar: (id: string, tipo: TipoArrastre, e: React.PointerEvent) => void;
  /** La foto de fondo no es un elemento: arrastrarla reencuadra. */
  onTomarFoto: (e: React.PointerEvent) => void;
};

type Props = {
  pieza: Pieza;
  /** Id del elemento que se está editando: se marca en la vista previa. */
  resaltado?: string | null;
  /** 1 = tamaño real. La vista previa se ajusta al hueco disponible. */
  escala?: number;
  editor?: Editor;
};

export const PiezaCanvas = forwardRef<HTMLDivElement, Props>(function PiezaCanvas(
  { pieza, escala = 1, editor, resaltado },
  ref,
) {
  const { campos, maqueta } = getPlantilla(pieza.plantilla);
  const usa = (c: CampoId) => campos.includes(c);
  const claro = maqueta.fondo === "claro" || maqueta.fondo === "marco";
  const ajustes: Ajustes = pieza.ajustes ?? {};

  /* Las maquetas estan escritas para 1080x1350. En los otros formatos toda
     coordenada vertical se multiplica por este factor, asi la composicion se
     mantiene proporcional en vez de amontonarse arriba. El CSS hace lo mismo
     con --k para las bandas y los velos. */
  /* La plantilla propone una alineacion; si la persona eligio otra, manda la
     suya. Las clases al-* van al final de la hoja para ganarle a la que pone
     la maqueta sin tener que subir la especificidad. */
  const alineacion =
    pieza.alineacion ?? (maqueta.alinear === "izquierda" ? "izq" : "centro");

  const fmt = getFormato(pieza.formato ?? "post");
  const k = fmt.alto / 1350;
  const v = (n: number) => Math.round(n * k);

  /* ---------- Foto ---------- */
  // El acercamiento va por transform y no por background-size: así el encuadre
  // (background-position) sigue significando lo mismo con y sin zoom.
  const completa = pieza.fotoAjuste === "completa";
  const estiloFoto: React.CSSProperties = pieza.foto
    ? {
        backgroundImage: `url("${pieza.foto}")`,
        backgroundPosition: `${pieza.fotoPosicionX}% ${pieza.fotoPosicion}%`,
        // "completa" entra toda la foto y deja ver el fondo alrededor; hay que
        // apagar la repeticion, que con contain llenaria el hueco con copias.
        backgroundSize: completa ? "contain" : "cover",
        backgroundRepeat: "no-repeat",
        transform: pieza.fotoZoom !== 100 ? `scale(${pieza.fotoZoom / 100})` : undefined,
      }
    : { background: "#0d1b38" };

  const redondeo = pieza.fotoRedondeo ?? 0;

  const foto = (extra = "") => {
    const clases = `photo ${extra}${maqueta.arco ? " arco" : ""}`.trim();
    // Las variantes con silueta propia (diagonal, medallon, arco) ya traen su
    // clip-path. Redondearlas lo pisaria y perderian la forma, asi que no se
    // tocan: esa silueta es el diseno de la plantilla.
    const propia = SILUETA.some((c) => clases.includes(c));
    const r = propia ? 0 : redondeo;
    // La foto no tiene data-elemento, asi que el arrastre de elementos no la
    // alcanza y en modo ajuste parecia trabada. Arrastrarla corre el encuadre,
    // que es lo unico que tiene sentido mover en un fondo.
    const movible = (editor?.activo ?? false) && !!pieza.foto;
    return (
      <div
        className={`${clases}${movible ? " movible" : ""}`}
        style={r ? marcoRedondeado(r, extra === "") : undefined}
        onPointerDown={movible ? editor?.onTomarFoto : undefined}
      >
        <div className="photo-img" style={estiloFoto} />
      </div>
    );
  };

  let fondo: ReactNode;
  switch (maqueta.fondo) {
    case "foto":
      fondo = foto();
      break;
    case "foto-arriba":
      fondo = foto("top");
      break;
    case "foto-abajo":
      fondo = foto("bottom");
      break;
    case "foto-banda":
      fondo = foto("band");
      break;
    case "foto-banda-baja":
      fondo = (
        <>
          <div className="fondo-solido" />
          <div className="stripes" />
          {foto("band-baja")}
        </>
      );
      break;
    case "split":
      fondo = (
        <>
          <div className="fondo-solido" />
          {foto("split")}
        </>
      );
      break;
    case "split-derecha":
      fondo = (
        <>
          <div className="fondo-solido" />
          {foto("split der")}
        </>
      );
      break;
    case "poster":
      fondo = (
        <>
          {foto()}
          <div className="franja-top" />
          <div className="franja-bottom" />
        </>
      );
      break;
    case "medallon":
      fondo = (
        <>
          <div className="fondo-solido" />
          <div className="stripes" />
          {foto("medallon")}
        </>
      );
      break;
    case "marco":
      fondo = (
        <>
          <div className="fondo-claro" />
          {foto("marco")}
        </>
      );
      break;
    case "claro":
      fondo = <div className="fondo-claro" />;
      break;
    default:
      fondo = (
        <>
          <div className="fondo-solido" />
          <div className="stripes" />
        </>
      );
  }

  /* ---------- Panel ---------- */
  let panel: ReactNode = null;
  if (maqueta.panelTop !== undefined) {
    panel = (
      <>
        <div
          className={`panel${maqueta.panelVariante ? ` ${maqueta.panelVariante}` : ""}`}
          style={{ top: `${v(maqueta.panelTop)}px` }}
        />
        <div
          className="stripes"
          style={{
            top: `${v(maqueta.panelTop)}px`,
            clipPath:
              maqueta.panelVariante === "recto"
                ? "none"
                : maqueta.panelVariante === "invertida"
                  ? "polygon(0 0, 100% 16%, 100% 100%, 0 100%)"
                  : "polygon(0 16%, 100% 0, 100% 100%, 0 100%)",
          }}
        />
      </>
    );
  } else if (maqueta.panelArriba !== undefined) {
    panel = (
      <>
        <div className="panel up" style={{ top: 0, height: `${v(maqueta.panelArriba)}px`, bottom: "auto" }} />
        <div
          className="stripes"
          style={{
            top: 0,
            height: `${v(maqueta.panelArriba)}px`,
            bottom: "auto",
            clipPath: "polygon(0 0, 100% 0, 100% 86%, 0 100%)",
          }}
        />
      </>
    );
  }

  /* ---------- Bloque ---------- */
  const estiloBloque: React.CSSProperties = {};
  if (maqueta.bloqueTop !== undefined) estiloBloque.top = `${v(maqueta.bloqueTop)}px`;
  if (maqueta.bloqueBottom !== undefined) estiloBloque.bottom = `${v(maqueta.bloqueBottom)}px`;
  if (maqueta.bloqueIzq !== undefined) estiloBloque.left = `${maqueta.bloqueIzq}px`;
  if (maqueta.bloqueDer !== undefined) estiloBloque.right = `${maqueta.bloqueDer}px`;

  /* En un formato mas bajo que 4:5 las posiciones se comprimen pero el texto
     no, asi que el bloque terminaba montandose sobre el pie. Se achica en la
     misma proporcion. Nunca se agranda: en historia sobra alto, y agrandar la
     letra solo la haria desproporcionada. */
  const kt = Math.min(1, k);
  if (kt < 1) {
    estiloBloque.transform = `scale(${kt})`;
    estiloBloque.transformOrigin =
      maqueta.bloqueBottom !== undefined ? "bottom center" : "top center";
  }

  const limpio = (xs: string[]) => xs.filter((x) => x.trim());
  const pares = (xs: string[]) => limpio(xs).map(partir);

  const chips = limpio(pieza.chips);
  const lista = limpio(pieza.lista);
  const pasos = limpio(pieza.pasos);
  const tarjetas = pares(pieza.tarjetas);
  const barras = pares(pieza.barras);
  const metricas = pares(pieza.metricas);
  const hitos = pares(pieza.hitos);
  const tabla = pares(pieza.tabla);

  /* ---------- Logo ---------- */
  // El envoltorio es el que posiciona, asi que el centrado va aca y no en la
  // clase .logo, que dentro del envoltorio se dibuja estatica.
  const estiloLogo: React.CSSProperties = {
    top: `${v(maqueta.logoTop)}px`,
    width: `${maqueta.logoAncho}px`,
    left: "50%",
    transform: "translateX(-50%)",
  };
  if (maqueta.logoIzq !== undefined) {
    estiloLogo.left = `${maqueta.logoIzq}px`;
    estiloLogo.transform = "none";
  }

  const bajada =
    usa("support") && pieza.support.trim() ? (
      <p className="support" dangerouslySetInnerHTML={{ __html: bajadaHtml(pieza.support) }} />
    ) : null;

  /* ------------------------------------------------------------------ */
  /* Contenido                                                           */
  /* ------------------------------------------------------------------ */
  /* Se arma como lista con id para poder separarlo en dos: lo que sigue
     apilado y lo que ya tiene posicion propia. El id es el que usa el ajuste. */

  const contenidos: { id: string; nodo: ReactNode }[] = [];
  const sumar = (id: string, nodo: ReactNode) => {
    if (nodo) contenidos.push({ id, nodo });
  };

  sumar("eyebrow", usa("eyebrow") && pieza.eyebrow ? <div className="eyebrow">{pieza.eyebrow}</div> : null);

  sumar(
    "dato",
    usa("dato") && pieza.dato ? (
      <div className="dato-bloque">
        <div className="dato">{pieza.dato}</div>
        {pieza.datoEtiqueta ? <div className="dato-etiqueta">{pieza.datoEtiqueta}</div> : null}
      </div>
    ) : null,
  );

  sumar("dona", usa("dona") ? <Dona valor={parseInt(pieza.dato, 10) || 0} texto={pieza.datoEtiqueta} /> : null);

  sumar(
    "titular",
    usa("l1") || usa("lm") || usa("l2") ? (
      <h1 className={`${maqueta.titularPlano ? "plano" : ""} ${maqueta.filete ? "filete" : ""}`.trim()}>
        {usa("l1") && pieza.l1 ? <span className="l1">{pieza.l1}</span> : null}
        {usa("lm") && pieza.lm ? <span className="lm">{pieza.lm}</span> : null}
        {usa("l2") && pieza.l2 ? (
          <span className="l2" style={{ fontSize: `${pieza.l2Tamano}px` }}>
            {pieza.l2}
          </span>
        ) : null}
      </h1>
    ) : null,
  );

  sumar(
    "cita",
    usa("cita") && pieza.cita ? (
      <>
        <blockquote className="cita">{pieza.cita}</blockquote>
        {pieza.firma ? <div className="firma">— {pieza.firma}</div> : null}
      </>
    ) : null,
  );

  sumar(
    "metricas",
    usa("metricas") && metricas.length > 0 ? (
      <div className="metricas">
        {metricas.map(([n, et], i) => (
          <div key={`m-${i}`}>
            <div className="m-num">{n}</div>
            <div className="m-et">{et}</div>
          </div>
        ))}
      </div>
    ) : null,
  );

  sumar(
    "barras",
    usa("barras") && barras.length > 0 ? (
      <div className="barras">
        {barras.map(([et, v], i) => {
          const n = Math.max(0, Math.min(100, parseInt(v, 10) || 0));
          return (
            <div className="barra" key={`b-${i}`}>
              <div className="b-cab">
                <span>{et}</span>
                <span className="b-val">{n}%</span>
              </div>
              <div className="b-riel">
                <div className="b-relleno" style={{ width: `${n}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    ) : null,
  );

  sumar(
    "tarjetas",
    usa("tarjetas") && tarjetas.length > 0 ? (
      <div className={`tarjetas${tarjetas.length >= 4 ? " cuatro" : ""}`}>
        {tarjetas.map(([t, d], i) => (
          <div className="tarjeta" key={`t-${i}`}>
            <h3>{t}</h3>
            {d ? <p>{d}</p> : null}
          </div>
        ))}
      </div>
    ) : null,
  );

  sumar(
    "lista",
    usa("lista") && lista.length > 0 ? (
      <ul className="list">
        {lista.map((item, i) => (
          <li key={`l-${i}`}>{item}</li>
        ))}
      </ul>
    ) : null,
  );

  sumar(
    "checklist",
    usa("checklist") && lista.length > 0 ? (
      <ul className="checklist">
        {lista.map((item, i) => (
          <li key={`c-${i}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 12.5 L9.5 18 L20 6"
                fill="none"
                stroke="#C8102E"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ) : null,
  );

  sumar(
    "pasos",
    usa("pasos") && pasos.length > 0 ? (
      <ol className="pasos">
        {pasos.map((item, i) => (
          <li key={`p-${i}`}>{item}</li>
        ))}
      </ol>
    ) : null,
  );

  sumar(
    "hitos",
    usa("hitos") && hitos.length > 0 ? (
      <div className="hitos">
        {hitos.map(([f, t], i) => (
          <div className="hito" key={`h-${i}`}>
            <div className="h-fecha">{f}</div>
            <div className="h-texto">{t}</div>
          </div>
        ))}
      </div>
    ) : null,
  );

  sumar(
    "tabla",
    usa("tabla") && tabla.length > 0 ? (
      <div className="tabla">
        {tabla.map(([a, b], i) => (
          <div className="fila" key={`f-${i}`}>
            <span>{a}</span>
            <span className="valor">{b}</span>
          </div>
        ))}
      </div>
    ) : null,
  );

  sumar(
    "columnas",
    usa("columnas") ? (
      <div className="columnas">
        <div>
          <h3>{pieza.colATitulo}</h3>
          <ul>
            {limpio(pieza.colA).map((t, i) => (
              <li key={`ca-${i}`}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="contra">
          <h3>{pieza.colBTitulo}</h3>
          <ul>
            {limpio(pieza.colB).map((t, i) => (
              <li key={`cb-${i}`}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    ) : null,
  );

  sumar(
    "chips",
    usa("chips") && chips.length > 0 ? (
      <div className="chips">
        {chips.map((c, i) => (
          <div className="chip" key={`ch-${i}`}>
            {c}
          </div>
        ))}
      </div>
    ) : null,
  );

  sumar(
    "evento",
    usa("evento") && (pieza.eventoFecha || pieza.eventoLugar || pieza.eventoStand) ? (
      <div className="evento">
        {pieza.eventoFecha ? <span>{pieza.eventoFecha}</span> : null}
        {pieza.eventoLugar ? <span>{pieza.eventoLugar}</span> : null}
        {pieza.eventoStand ? <span className="destacado">{pieza.eventoStand}</span> : null}
      </div>
    ) : null,
  );

  sumar("ribbon", usa("ribbon") && pieza.ribbon ? <div className="ribbon">{pieza.ribbon}</div> : null);
  sumar(
    "ribbon2",
    usa("ribbon2") && pieza.ribbon2 ? <div className="ribbon secundaria">{pieza.ribbon2}</div> : null,
  );

  if (!maqueta.soporteAbajo) sumar("support", bajada);

  /* Los bloques agregados van al final, en su orden. Al llevar id propio
     entran al mismo sistema de posicionado, arrastre y marcador. */
  for (const extra of pieza.extras ?? []) {
    sumar(
      extra.id,
      <BloqueExtra extra={extra} alineacion={alineacion} completa={completa} redondeo={redondeo} />,
    );
  }

  /* ---------- Envoltorio de cada elemento ---------- */
  const envolver = ({ id, nodo }: { id: string; nodo: ReactNode }) => {
    const ajuste = ajustes[id];
    const editable = editor?.activo ?? false;
    const seleccionado = editor?.seleccion === id;

    const estilo: React.CSSProperties = ajuste
      ? {
          position: "absolute",
          left: `${ajuste.x}px`,
          top: `${ajuste.y}px`,
          width: `${ajuste.w}px`,
          ...(ajuste.escala && ajuste.escala !== 1
            ? { transform: `scale(${ajuste.escala})`, transformOrigin: "top left" }
            : {}),
        }
      : {};

    return (
      <div
        key={id}
        data-elemento={id}
        className={`elemento${ajuste ? " suelto" : ""}${editable ? " editable" : ""}${
          seleccionado ? " sel" : ""
        }${maqueta.alinear === "izquierda" ? " izq" : ""} al-${alineacion}${
          resaltado === id ? " resaltado" : ""
        }`}
        style={estilo}
        onPointerDown={editable ? (e) => editor?.onTomar(id, "mover", e) : undefined}
      >
        {nodo}
        {editable && seleccionado ? (
          /* La clase editor-ui es la que el exportador descarta: las manijas
             no pueden salir en el PNG. */
          <>
            <span
              className="editor-ui manija lado"
              onPointerDown={(e) => {
                e.stopPropagation();
                editor?.onTomar(id, "ancho", e);
              }}
            />
            <span
              className="editor-ui manija esquina"
              onPointerDown={(e) => {
                e.stopPropagation();
                editor?.onTomar(id, "esquina", e);
              }}
            />
          </>
        ) : null}
      </div>
    );
  };

  /* Logo y pie no viven en el flujo: ya nacen con posicion propia. Para que
     tambien se puedan mover, el envoltorio es el que posiciona y el hijo pasa a
     estatico; asi el contorno de seleccion tiene donde dibujarse (un <img> no
     admite ::after) y el ajuste solo cambia las coordenadas del envoltorio. */
  const envolverFijo = (id: string, nodo: ReactNode, base: React.CSSProperties) => {
    const ajuste = ajustes[id];
    const editable = editor?.activo ?? false;
    const seleccionado = editor?.seleccion === id;

    const estilo: React.CSSProperties = ajuste
      ? {
          position: "absolute",
          left: `${ajuste.x}px`,
          top: `${ajuste.y}px`,
          width: `${ajuste.w}px`,
          right: "auto",
          bottom: "auto",
          transform: ajuste.escala && ajuste.escala !== 1 ? `scale(${ajuste.escala})` : undefined,
          transformOrigin: "top left",
        }
      : { position: "absolute", ...base };

    return (
      <div
        data-elemento={id}
        className={`elemento fijo${id === "pie" ? " pie" : ""}${ajuste ? " suelto" : ""}${editable ? " editable" : ""}${
          seleccionado ? " sel" : ""
        }`}
        style={estilo}
        onPointerDown={editable ? (e) => editor?.onTomar(id, "mover", e) : undefined}
      >
        {nodo}
        {editable && seleccionado ? (
          <>
            <span
              className="editor-ui manija lado"
              onPointerDown={(e) => {
                e.stopPropagation();
                editor?.onTomar(id, "ancho", e);
              }}
            />
            <span
              className="editor-ui manija esquina"
              onPointerDown={(e) => {
                e.stopPropagation();
                editor?.onTomar(id, "esquina", e);
              }}
            />
          </>
        ) : null}
      </div>
    );
  };

  const enFlujo = contenidos.filter((c) => !ajustes[c.id]);
  const sueltos = contenidos.filter((c) => ajustes[c.id]);

  return (
    <div
      ref={ref}
      className={`pieza${claro ? " claro" : ""}`}
      style={
        {
          width: `${fmt.ancho}px`,
          height: `${fmt.alto}px`,
          transform: `scale(${escala})`,
          "--k": k,
        } as React.CSSProperties
      }
    >
      {fondo}
      {maqueta.velos?.includes("full") ? <div className="veil-full" /> : null}
      {maqueta.velos?.includes("top") ? <div className="veil-top" /> : null}
      {maqueta.velos?.includes("bottom") ? <div className="veil-bottom" /> : null}
      {panel}

      <div className="flag" style={{ background: pieza.flechaColor }} />
      {maqueta.bandaLateral ? (
        <div className="banda-lat">
          <span>{pieza.eyebrow}</span>
        </div>
      ) : null}
      {maqueta.marcoInterior ? <div className="marco-int" /> : null}

      <div className="wedge" />
      <div className="wedge-line" />

      {envolverFijo(
        "logo",
        maqueta.dupla && usa("logo2") ? (
          /* Los dos logos como una sola unidad centrada: si se posicionaran por
             separado, cambiar el ancho de uno descentraria al otro. */
          <div className="logos-dupla">
            <img
              src={claro ? LOGO_OSCURO : LOGO_CLARO}
              alt="ASLI"
              style={{ width: `${maqueta.logoAncho}px` }}
            />
            {pieza.logo2 ? (
              <>
                <span className="divisor" />
                {/* El invitado va dentro de una caja de tamano fijo y se ajusta
                    con object-fit. Los logos ajenos vienen cuadrados, apaisados
                    o verticales: fijarle ancho o alto a la imagen deformaba unos
                    y recortaba otros. Con la caja, cualquiera entra centrado y
                    con su proporcion intacta. */}
                <span
                  className="invitado-caja"
                  style={{
                    height: `${Math.round(maqueta.logoAncho * 0.5)}px`,
                    width: `${Math.round(maqueta.logoAncho * 1.1)}px`,
                  }}
                >
                  <img src={pieza.logo2} alt="" draggable={false} />
                </span>
              </>
            ) : null}
          </div>
        ) : (
          <img className="logo" src={claro ? LOGO_OSCURO : LOGO_CLARO} alt="ASLI" draggable={false} />
        ),
        estiloLogo,
      )}

      {!maqueta.dupla && usa("logo2") && pieza.logo2 && maqueta.logo2Top !== undefined ? (
        <span
          className="logo invitado-caja suelta"
          style={{
            top: `${v(maqueta.logo2Top)}px`,
            height: `${Math.round((maqueta.logo2Ancho ?? 200) * 0.55)}px`,
            width: `${maqueta.logo2Ancho ?? 200}px`,
            ...(maqueta.logo2Izq !== undefined ? { left: `${maqueta.logo2Izq}px`, transform: "none" } : {}),
          }}
        >
          <img src={pieza.logo2} alt="" draggable={false} />
        </span>
      ) : null}

      <div
        className={`block${maqueta.alinear === "izquierda" ? " izq" : ""} al-${alineacion}${
          maqueta.cajaTexto ? ` caja ${maqueta.cajaTexto === "navy" ? "" : maqueta.cajaTexto}` : ""
        }`}
        style={estiloBloque}
      >
        {enFlujo.map(envolver)}
      </div>

      {/* Los ajustados salen del bloque: sus coordenadas son del lienzo, no
          del bloque, que se mueve segun la plantilla. */}
      {sueltos.map(envolver)}

      {maqueta.soporteAbajo && bajada ? <div className="support-low">{bajada}</div> : null}

      {/* El pie es opcional: la hoja en blanco arranca sin el y se agrega
          como bloque si se quiere. */}
      {(pieza.mostrarPie ?? true) && !maqueta.sinPie
        ? envolverFijo("pie", <Pie />, { left: 0, right: 0, bottom: "44px" })
        : null}
    </div>
  );
});
