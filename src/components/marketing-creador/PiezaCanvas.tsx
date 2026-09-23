"use client";

import { forwardRef } from "react";
import { withBase } from "@/lib/basePath";
import { getPlantilla, type Pieza } from "./plantillas";

/**
 * La pieza tal cual se exporta: 1080x1350 px reales.
 *
 * La vista previa la encoge con `escala` (transform), no cambiando medidas:
 * así lo que se ve en pantalla y lo que sale en el PNG son el mismo nodo, y no
 * hay forma de que se desincronicen.
 *
 * El lienzo se arma leyendo `maqueta` y `campos` de la plantilla. Los bloques
 * de texto salen siempre en el mismo orden de lectura, y cada plantilla decide
 * cuáles aparecen.
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

function Titular({ pieza }: { pieza: Pieza }) {
  const { campos } = getPlantilla(pieza.plantilla);
  const l1 = campos.includes("l1") && pieza.l1;
  const lm = campos.includes("lm") && pieza.lm;
  const l2 = campos.includes("l2") && pieza.l2;
  if (!l1 && !lm && !l2) return null;
  return (
    <h1>
      {l1 ? <span className="l1">{pieza.l1}</span> : null}
      {lm ? <span className="lm">{pieza.lm}</span> : null}
      {l2 ? (
        <span className="l2" style={{ fontSize: `${pieza.l2Tamano}px` }}>
          {pieza.l2}
        </span>
      ) : null}
    </h1>
  );
}

function Bajada({ texto }: { texto: string }) {
  if (!texto.trim()) return null;
  return <p className="support" dangerouslySetInnerHTML={{ __html: bajadaHtml(texto) }} />;
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
  const usa = (c: Parameters<typeof campos.includes>[0]) => campos.includes(c);
  const claro = maqueta.fondo === "claro";

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

  let fondo: React.ReactNode = null;
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
    case "split":
      fondo = (
        <>
          <div className="fondo-solido" />
          {foto("split")}
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

  /* ---------- Bloque de texto ---------- */
  const estiloBloque: React.CSSProperties = {};
  if (maqueta.bloqueTop !== undefined) estiloBloque.top = `${maqueta.bloqueTop}px`;
  if (maqueta.bloqueBottom !== undefined) estiloBloque.bottom = `${maqueta.bloqueBottom}px`;
  if (maqueta.bloqueIzq !== undefined) estiloBloque.left = `${maqueta.bloqueIzq}px`;

  const chips = pieza.chips.filter(Boolean);
  const lista = pieza.lista.filter(Boolean);
  const pasos = pieza.pasos.filter(Boolean);

  /* ---------- Logo ---------- */
  const estiloLogo: React.CSSProperties = { top: `${maqueta.logoTop}px`, width: `${maqueta.logoAncho}px` };
  if (maqueta.logoIzq !== undefined) {
    estiloLogo.left = `${maqueta.logoIzq}px`;
    estiloLogo.transform = "none";
  }

  return (
    <div
      ref={ref}
      className={`pieza${claro ? " claro" : ""}`}
      style={{ transform: `scale(${escala})` }}
    >
      {fondo}
      {maqueta.velos?.includes("full") ? <div className="veil-full" /> : null}
      {maqueta.velos?.includes("top") ? <div className="veil-top" /> : null}
      {maqueta.velos?.includes("bottom") ? <div className="veil-bottom" /> : null}
      {panel}

      <div className="flag" style={{ background: pieza.flechaColor }} />
      <div className="wedge" />
      <div className="wedge-line" />

      <img
        className="logo"
        src={claro ? LOGO_OSCURO : LOGO_CLARO}
        alt="ASLI"
        style={estiloLogo}
      />

      <div className={`block${maqueta.alinear === "izquierda" ? " izq" : ""}`} style={estiloBloque}>
        {usa("eyebrow") && pieza.eyebrow ? <div className="eyebrow">{pieza.eyebrow}</div> : null}

        {usa("dato") && pieza.dato ? (
          <div className="dato-bloque">
            <div className="dato">{pieza.dato}</div>
            {pieza.datoEtiqueta ? <div className="dato-etiqueta">{pieza.datoEtiqueta}</div> : null}
          </div>
        ) : null}

        <Titular pieza={pieza} />

        {usa("cita") && pieza.cita ? (
          <>
            <blockquote className="cita">{pieza.cita}</blockquote>
            {pieza.firma ? <div className="firma">— {pieza.firma}</div> : null}
          </>
        ) : null}

        {usa("chips") && chips.length > 0 ? (
          <div className="chips">
            {chips.map((c, i) => (
              <div className="chip" key={`${c}-${i}`}>
                {c}
              </div>
            ))}
          </div>
        ) : null}

        {usa("lista") && lista.length > 0 ? (
          <ul className="list">
            {lista.map((item, i) => (
              <li key={`${item}-${i}`}>{item}</li>
            ))}
          </ul>
        ) : null}

        {usa("pasos") && pasos.length > 0 ? (
          <ol className="pasos">
            {pasos.map((item, i) => (
              <li key={`${item}-${i}`}>{item}</li>
            ))}
          </ol>
        ) : null}

        {usa("columnas") ? (
          <div className="columnas">
            <div>
              <h3>{pieza.colATitulo}</h3>
              <ul>
                {pieza.colA.filter(Boolean).map((t, i) => (
                  <li key={`a-${i}`}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="contra">
              <h3>{pieza.colBTitulo}</h3>
              <ul>
                {pieza.colB.filter(Boolean).map((t, i) => (
                  <li key={`b-${i}`}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {usa("ribbon") && pieza.ribbon ? <div className="ribbon">{pieza.ribbon}</div> : null}

        {usa("support") && !maqueta.soporteAbajo ? <Bajada texto={pieza.support} /> : null}
      </div>

      {usa("support") && maqueta.soporteAbajo ? (
        <div className="support-low">
          <Bajada texto={pieza.support} />
        </div>
      ) : null}

      <Pie />
    </div>
  );
});
