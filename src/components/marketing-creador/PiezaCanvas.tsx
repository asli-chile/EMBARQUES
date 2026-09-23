"use client";

import { forwardRef } from "react";
import { withBase } from "@/lib/basePath";
import type { Pieza } from "./plantillas";

/**
 * La pieza tal cual se exporta: 1080x1350 px reales.
 *
 * La vista previa la encoge con `escala` (transform), no cambiando medidas:
 * así lo que se ve en pantalla y lo que sale en el PNG son el mismo nodo, y no
 * hay forma de que se desincronicen.
 */

const LOGO = withBase("/logoblanco.png");

/** Solo permitimos <b> en la bajada: el resto se escapa. */
function bajadaHtml(texto: string): string {
  const escapado = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

function Esquinas() {
  return (
    <>
      <div className="flag" />
      <div className="wedge" />
      <div className="wedge-line" />
    </>
  );
}

function Titular({ pieza }: { pieza: Pieza }) {
  return (
    <h1>
      {pieza.l1 ? <span className="l1">{pieza.l1}</span> : null}
      {pieza.lm ? <span className="lm">{pieza.lm}</span> : null}
      {pieza.l2 ? (
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
  /** 1 = tamaño real. La vista previa usa ~0.36. */
  escala?: number;
};

export const PiezaCanvas = forwardRef<HTMLDivElement, Props>(function PiezaCanvas(
  { pieza, escala = 1 },
  ref,
) {
  const fondo = pieza.foto
    ? { backgroundImage: `url("${pieza.foto}")`, backgroundPosition: `center ${pieza.fotoPosicion}%` }
    : { background: "#0d1b38" };

  const logo = (top: number, width: number) => (
    <img className="logo" src={LOGO} alt="ASLI" style={{ top: `${top}px`, width: `${width}px` }} />
  );

  let cuerpo: React.ReactNode = null;

  if (pieza.plantilla === "hero") {
    cuerpo = (
      <>
        <div className="photo" style={fondo} />
        <div className="veil-full" />
        <div className="veil-bottom" style={{ height: "760px" }} />
        <Esquinas />
        {logo(64, 340)}
        <div className="block" style={{ bottom: "118px" }}>
          {pieza.eyebrow ? <div className="eyebrow">{pieza.eyebrow}</div> : null}
          <Titular pieza={pieza} />
          {pieza.ribbon ? <div className="ribbon">{pieza.ribbon}</div> : null}
          <Bajada texto={pieza.support} />
        </div>
      </>
    );
  } else if (pieza.plantilla === "panel-inferior") {
    cuerpo = (
      <>
        <div className="photo top" style={fondo} />
        <div className="veil-top" />
        <div className="panel" style={{ top: "560px" }} />
        <div
          className="stripes"
          style={{ top: "560px", clipPath: "polygon(0 16%, 100% 0, 100% 100%, 0 100%)" }}
        />
        <Esquinas />
        {logo(378, 402)}
        <div className="block" style={{ top: "672px" }}>
          {pieza.eyebrow ? <div className="eyebrow">{pieza.eyebrow}</div> : null}
          <Titular pieza={pieza} />
          {pieza.ribbon ? <div className="ribbon">{pieza.ribbon}</div> : null}
          <Bajada texto={pieza.support} />
        </div>
      </>
    );
  } else if (pieza.plantilla === "panel-superior") {
    cuerpo = (
      <>
        <div className="photo bottom" style={fondo} />
        <div className="veil-bottom" />
        <div className="panel up" style={{ top: 0, height: "706px", bottom: "auto" }} />
        <div
          className="stripes"
          style={{
            top: 0,
            height: "706px",
            bottom: "auto",
            clipPath: "polygon(0 0, 100% 0, 100% 86%, 0 100%)",
          }}
        />
        <Esquinas />
        {logo(58, 340)}
        <div className="block" style={{ top: "250px" }}>
          {pieza.eyebrow ? <div className="eyebrow">{pieza.eyebrow}</div> : null}
          <Titular pieza={pieza} />
          {pieza.chips.filter(Boolean).length > 0 ? (
            <div className="chips">
              {pieza.chips.filter(Boolean).map((c, i) => (
                <div className="chip" key={`${c}-${i}`}>
                  {c}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="support-low">
          <Bajada texto={pieza.support} />
        </div>
      </>
    );
  } else {
    cuerpo = (
      <>
        <div className="photo band" style={fondo} />
        <div className="veil-top" />
        <div className="panel" style={{ top: "330px" }} />
        <div
          className="stripes"
          style={{ top: "330px", clipPath: "polygon(0 16%, 100% 0, 100% 100%, 0 100%)" }}
        />
        <Esquinas />
        {logo(168, 380)}
        <div className="block" style={{ top: "462px" }}>
          {pieza.eyebrow ? <div className="eyebrow">{pieza.eyebrow}</div> : null}
          <Titular pieza={pieza} />
          {pieza.lista.filter(Boolean).length > 0 ? (
            <ul className="list">
              {pieza.lista.filter(Boolean).map((item, i) => (
                <li key={`${item}-${i}`}>{item}</li>
              ))}
            </ul>
          ) : null}
          {pieza.ribbon ? <div className="ribbon">{pieza.ribbon}</div> : null}
        </div>
      </>
    );
  }

  return (
    <div ref={ref} className="pieza" style={{ transform: `scale(${escala})` }}>
      {cuerpo}
      <Pie />
    </div>
  );
});
