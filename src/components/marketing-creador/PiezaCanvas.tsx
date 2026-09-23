"use client";

import { forwardRef } from "react";
import { withBase } from "@/lib/basePath";
import { getPlantilla, partir, type CampoId, type Pieza } from "./plantillas";

/**
 * La pieza tal cual se exporta: 1080x1350 px reales.
 *
 * La vista previa la encoge con `escala` (transform), no cambiando medidas:
 * así lo que se ve en pantalla y lo que sale en el PNG son el mismo nodo, y no
 * hay forma de que se desincronicen.
 *
 * El lienzo se arma leyendo `maqueta` y `campos` de la plantilla. Los elementos
 * de contenido salen siempre en el mismo orden de lectura, y cada plantilla
 * decide cuáles aparecen.
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

type Props = {
  pieza: Pieza;
  /** 1 = tamaño real. La vista previa usa ~0.38. */
  escala?: number;
};

export const PiezaCanvas = forwardRef<HTMLDivElement, Props>(function PiezaCanvas(
  { pieza, escala = 1 },
  ref,
) {
  const { campos, maqueta } = getPlantilla(pieza.plantilla);
  const usa = (c: CampoId) => campos.includes(c);
  const claro = maqueta.fondo === "claro" || maqueta.fondo === "marco";

  /* ---------- Foto ---------- */
  // El acercamiento va por transform y no por background-size: así el encuadre
  // (background-position) sigue significando lo mismo con y sin zoom.
  const estiloFoto: React.CSSProperties = pieza.foto
    ? {
        backgroundImage: `url("${pieza.foto}")`,
        backgroundPosition: `${pieza.fotoPosicionX}% ${pieza.fotoPosicion}%`,
        transform: pieza.fotoZoom !== 100 ? `scale(${pieza.fotoZoom / 100})` : undefined,
      }
    : { background: "#0d1b38" };

  const foto = (extra = "") => <div className={`photo ${extra}`.trim()} style={estiloFoto} />;

  let fondo: React.ReactNode;
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
  let panel: React.ReactNode = null;
  if (maqueta.panelTop !== undefined) {
    panel = (
      <>
        <div className="panel" style={{ top: `${maqueta.panelTop}px` }} />
        <div
          className="stripes"
          style={{ top: `${maqueta.panelTop}px`, clipPath: "polygon(0 16%, 100% 0, 100% 100%, 0 100%)" }}
        />
      </>
    );
  } else if (maqueta.panelArriba !== undefined) {
    panel = (
      <>
        <div className="panel up" style={{ top: 0, height: `${maqueta.panelArriba}px`, bottom: "auto" }} />
        <div
          className="stripes"
          style={{
            top: 0,
            height: `${maqueta.panelArriba}px`,
            bottom: "auto",
            clipPath: "polygon(0 0, 100% 0, 100% 86%, 0 100%)",
          }}
        />
      </>
    );
  }

  /* ---------- Bloque ---------- */
  const estiloBloque: React.CSSProperties = {};
  if (maqueta.bloqueTop !== undefined) estiloBloque.top = `${maqueta.bloqueTop}px`;
  if (maqueta.bloqueBottom !== undefined) estiloBloque.bottom = `${maqueta.bloqueBottom}px`;
  if (maqueta.bloqueIzq !== undefined) estiloBloque.left = `${maqueta.bloqueIzq}px`;
  if (maqueta.bloqueDer !== undefined) estiloBloque.right = `${maqueta.bloqueDer}px`;

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
  const estiloLogo: React.CSSProperties = {
    top: `${maqueta.logoTop}px`,
    width: `${maqueta.logoAncho}px`,
  };
  if (maqueta.logoIzq !== undefined) {
    estiloLogo.left = `${maqueta.logoIzq}px`;
    estiloLogo.transform = "none";
  }

  const bajada =
    usa("support") && pieza.support.trim() ? (
      <p className="support" dangerouslySetInnerHTML={{ __html: bajadaHtml(pieza.support) }} />
    ) : null;

  return (
    <div ref={ref} className={`pieza${claro ? " claro" : ""}`} style={{ transform: `scale(${escala})` }}>
      {fondo}
      {maqueta.velos?.includes("full") ? <div className="veil-full" /> : null}
      {maqueta.velos?.includes("top") ? <div className="veil-top" /> : null}
      {maqueta.velos?.includes("bottom") ? <div className="veil-bottom" /> : null}
      {panel}

      <div className="flag" style={{ background: pieza.flechaColor }} />
      <div className="wedge" />
      <div className="wedge-line" />

      <img className="logo" src={claro ? LOGO_OSCURO : LOGO_CLARO} alt="ASLI" style={estiloLogo} />

      <div className={`block${maqueta.alinear === "izquierda" ? " izq" : ""}`} style={estiloBloque}>
        {usa("eyebrow") && pieza.eyebrow ? <div className="eyebrow">{pieza.eyebrow}</div> : null}

        {usa("dato") && pieza.dato ? (
          <div className="dato-bloque">
            <div className="dato">{pieza.dato}</div>
            {pieza.datoEtiqueta ? <div className="dato-etiqueta">{pieza.datoEtiqueta}</div> : null}
          </div>
        ) : null}

        {usa("dona") ? (
          <Dona valor={parseInt(pieza.dato, 10) || 0} texto={pieza.datoEtiqueta} />
        ) : null}

        {usa("l1") || usa("lm") || usa("l2") ? (
          <h1>
            {usa("l1") && pieza.l1 ? <span className="l1">{pieza.l1}</span> : null}
            {usa("lm") && pieza.lm ? <span className="lm">{pieza.lm}</span> : null}
            {usa("l2") && pieza.l2 ? (
              <span className="l2" style={{ fontSize: `${pieza.l2Tamano}px` }}>
                {pieza.l2}
              </span>
            ) : null}
          </h1>
        ) : null}

        {usa("cita") && pieza.cita ? (
          <>
            <blockquote className="cita">{pieza.cita}</blockquote>
            {pieza.firma ? <div className="firma">— {pieza.firma}</div> : null}
          </>
        ) : null}

        {usa("metricas") && metricas.length > 0 ? (
          <div className="metricas">
            {metricas.map(([n, et], i) => (
              <div key={`m-${i}`}>
                <div className="m-num">{n}</div>
                <div className="m-et">{et}</div>
              </div>
            ))}
          </div>
        ) : null}

        {usa("barras") && barras.length > 0 ? (
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
        ) : null}

        {usa("tarjetas") && tarjetas.length > 0 ? (
          <div className={`tarjetas${tarjetas.length >= 4 ? " cuatro" : ""}`}>
            {tarjetas.map(([t, d], i) => (
              <div className="tarjeta" key={`t-${i}`}>
                <h3>{t}</h3>
                {d ? <p>{d}</p> : null}
              </div>
            ))}
          </div>
        ) : null}

        {usa("lista") && lista.length > 0 ? (
          <ul className="list">
            {lista.map((item, i) => (
              <li key={`l-${i}`}>{item}</li>
            ))}
          </ul>
        ) : null}

        {usa("checklist") && lista.length > 0 ? (
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
        ) : null}

        {usa("pasos") && pasos.length > 0 ? (
          <ol className="pasos">
            {pasos.map((item, i) => (
              <li key={`p-${i}`}>{item}</li>
            ))}
          </ol>
        ) : null}

        {usa("hitos") && hitos.length > 0 ? (
          <div className="hitos">
            {hitos.map(([f, t], i) => (
              <div className="hito" key={`h-${i}`}>
                <div className="h-fecha">{f}</div>
                <div className="h-texto">{t}</div>
              </div>
            ))}
          </div>
        ) : null}

        {usa("tabla") && tabla.length > 0 ? (
          <div className="tabla">
            {tabla.map(([a, b], i) => (
              <div className="fila" key={`f-${i}`}>
                <span>{a}</span>
                <span className="valor">{b}</span>
              </div>
            ))}
          </div>
        ) : null}

        {usa("columnas") ? (
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
        ) : null}

        {usa("chips") && chips.length > 0 ? (
          <div className="chips">
            {chips.map((c, i) => (
              <div className="chip" key={`ch-${i}`}>
                {c}
              </div>
            ))}
          </div>
        ) : null}

        {usa("ribbon") && pieza.ribbon ? <div className="ribbon">{pieza.ribbon}</div> : null}
        {usa("ribbon2") && pieza.ribbon2 ? <div className="ribbon secundaria">{pieza.ribbon2}</div> : null}

        {maqueta.soporteAbajo ? null : bajada}
      </div>

      {maqueta.soporteAbajo && bajada ? <div className="support-low">{bajada}</div> : null}

      <Pie />
    </div>
  );
});
