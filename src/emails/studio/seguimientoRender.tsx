/**
 * Bloques de seguimiento del studio de informativos.
 *
 * Nacieron para los avisos de NaviTrack (un buque que declara otro destino),
 * pero ninguno sabe de buques: sirven para cualquier informe que tenga que
 * decir **en qué estado está algo**, **qué cambió respecto de lo acordado**,
 * **cuáles son los datos** y **por dónde va el proceso**.
 *
 * Viven aparte de `ComposerEmail.tsx` porque ese archivo ya pasa las 1.500
 * líneas; `BlockView` delega aquí igual que delega en `catalogRender`.
 *
 * HTML de correo, con sus reglas: tablas en vez de flex, estilos en línea,
 * anchos en porcentaje. Outlook no entiende nada más moderno.
 */
import * as React from "react";
import { Section } from "react-email";
import { toneStyle } from "./tones";
import type { StudioBlock } from "./types";

export type SeguimientoCtx = {
  /** Sustituye {{nombre}} y demás tokens. */
  merge: (text: string) => string;
  /** Convierte **negrita** en <strong>. */
  boldParts: (text: string) => React.ReactNode;
};

const TEXTO = "#22303F";
const SUAVE = "#5D7385";
const NAVY = "#11224E";
const BORDE = "#E3E8EE";

/** Kinds que resuelve este módulo. */
export const SEGUIMIENTO_KINDS = new Set([
  "statusBanner",
  "compare",
  "factSheet",
  "timeline",
]);

/**
 * Filas escritas como "Etiqueta | Valor", una por línea.
 *
 * El editor del studio trabaja con props de texto plano, así que las listas se
 * escriben así en vez de con un editor de tabla. Es el mismo convenio que ya
 * usan los bloques de lista.
 */
function parsearFilas(raw: string): { etiqueta: string; valor: string }[] {
  return (raw || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linea) => {
      const i = linea.indexOf("|");
      if (i < 0) return { etiqueta: linea, valor: "" };
      return { etiqueta: linea.slice(0, i).trim(), valor: linea.slice(i + 1).trim() };
    });
}

/** Estado de un hito: el prefijo de la línea lo decide. */
function estadoDeHito(texto: string): {
  estado: "hecho" | "actual" | "pendiente";
  limpio: string;
} {
  const t = texto.trim();
  if (t.startsWith("*")) return { estado: "actual", limpio: t.slice(1).trim() };
  if (t.startsWith("+")) return { estado: "hecho", limpio: t.slice(1).trim() };
  return { estado: "pendiente", limpio: t };
}

export function renderSeguimientoBlock(
  block: StudioBlock,
  ctx: SeguimientoCtx,
): React.ReactElement | null {
  const p = block.props;
  const { merge, boldParts } = ctx;
  const tono = toneStyle(p.tone);

  switch (block.kind) {
    /* ── Estado: lo primero que el ojo encuentra ───────────────────────────── */
    case "statusBanner": {
      // Kicker vacío a propósito ≠ ausente: si el usuario lo borra, se respeta.
      const kicker = p.kicker === undefined ? tono.kicker : String(p.kicker).trim();
      const titulo = merge(p.title || "");
      const detalle = merge(p.detail || "");
      return (
        <Section style={{ margin: "16px 0" }}>
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            style={{
              borderCollapse: "collapse",
              width: "100%",
              backgroundColor: tono.bg,
              borderLeft: `4px solid ${tono.border}`,
              borderRadius: "0 10px 10px 0",
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: "16px 18px" }}>
                  {kicker ? (
                    <div
                      style={{
                        color: tono.text,
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "1.1px",
                        textTransform: "uppercase",
                        paddingBottom: "5px",
                      }}
                    >
                      {kicker}
                    </div>
                  ) : null}
                  {titulo ? (
                    <div
                      style={{
                        color: NAVY,
                        fontSize: "19px",
                        fontWeight: 700,
                        lineHeight: "26px",
                      }}
                    >
                      {boldParts(titulo)}
                    </div>
                  ) : null}
                  {detalle ? (
                    <div
                      style={{
                        color: TEXTO,
                        fontSize: "13px",
                        lineHeight: "20px",
                        paddingTop: "7px",
                      }}
                    >
                      {boldParts(detalle)}
                    </div>
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
      );
    }

    /* ── Contraste: lo acordado frente a lo que ocurre ─────────────────────── */
    case "compare": {
      const izqT = merge(p.leftLabel || "Antes");
      const izqV = merge(p.leftValue || "");
      const derT = merge(p.rightLabel || "Ahora");
      const derV = merge(p.rightValue || "");
      const flecha = (p.arrow || "→").trim();
      // El lado derecho es el que cambió: lleva el tono. El izquierdo queda
      // neutro para que el contraste se lea solo.
      const cajaIzq: React.CSSProperties = {
        padding: "14px 16px",
        backgroundColor: "#F4F7F9",
        borderRadius: "10px",
      };
      const cajaDer: React.CSSProperties = {
        padding: "14px 16px",
        backgroundColor: tono.bg,
        borderRadius: "10px",
      };
      const etiqueta: React.CSSProperties = {
        fontSize: "11px",
        letterSpacing: "0.9px",
        textTransform: "uppercase",
        paddingBottom: "6px",
      };
      const valor: React.CSSProperties = {
        color: NAVY,
        fontSize: "17px",
        fontWeight: 700,
        lineHeight: "23px",
      };
      return (
        <Section style={{ margin: "16px 0" }}>
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            style={{ borderCollapse: "separate", width: "100%" }}
          >
            <tbody>
              <tr>
                <td width="46%" valign="top" style={cajaIzq}>
                  <div style={{ ...etiqueta, color: SUAVE }}>{izqT}</div>
                  <div style={valor}>{izqV || "—"}</div>
                </td>
                <td
                  width="8%"
                  align="center"
                  valign="middle"
                  style={{ color: SUAVE, fontSize: "18px" }}
                >
                  {flecha}
                </td>
                <td width="46%" valign="top" style={cajaDer}>
                  <div style={{ ...etiqueta, color: tono.text }}>{derT}</div>
                  <div style={valor}>{derV || "—"}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
      );
    }

    /* ── Ficha: los datos duros, en una sola tabla ─────────────────────────── */
    case "factSheet": {
      const filas = parsearFilas(merge(p.rows || ""));
      if (!filas.length) return <Section style={{ margin: "8px 0" }} />;
      // Las primeras filas son las que identifican: van en negrita.
      const fuertes = Math.max(0, Number(p.strongRows ?? "2") || 0);
      return (
        <Section style={{ margin: "16px 0" }}>
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            style={{ borderCollapse: "collapse", width: "100%" }}
          >
            <tbody>
              {filas.map((f, i) => (
                <tr key={i}>
                  <td
                    style={{
                      padding: "9px 0",
                      borderBottom: `1px solid ${BORDE}`,
                      color: SUAVE,
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.etiqueta}
                  </td>
                  <td
                    style={{
                      padding: "9px 0 9px 16px",
                      borderBottom: `1px solid ${BORDE}`,
                      fontSize: "14px",
                      textAlign: "right",
                      color: i < fuertes ? NAVY : TEXTO,
                      fontWeight: i < fuertes ? 700 : 400,
                    }}
                  >
                    {f.valor || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      );
    }

    /* ── Línea de tiempo: por dónde va el proceso ──────────────────────────── */
    case "timeline": {
      const hitos = (merge(p.items || ""))
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((linea) => {
          const { estado, limpio } = estadoDeHito(linea);
          const i = limpio.indexOf("|");
          return {
            estado,
            titulo: i < 0 ? limpio : limpio.slice(0, i).trim(),
            detalle: i < 0 ? "" : limpio.slice(i + 1).trim(),
          };
        });
      if (!hitos.length) return <Section style={{ margin: "8px 0" }} />;

      return (
        <Section style={{ margin: "16px 0" }}>
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            style={{ borderCollapse: "collapse", width: "100%" }}
          >
            <tbody>
              {hitos.map((h, i) => {
                const ultimo = i === hitos.length - 1;
                // Cumplido: teal lleno. Actual: el tono del bloque, con halo.
                // Pendiente: hueco, para que se lea como "todavía no".
                const color =
                  h.estado === "hecho"
                    ? "#007A7B"
                    : h.estado === "actual"
                      ? tono.border
                      : "#C7D0DA";
                const relleno = h.estado === "pendiente" ? "#FFFFFF" : color;
                return (
                  <tr key={i}>
                    <td
                      width="26"
                      valign="top"
                      style={{ padding: "0 10px 0 0", textAlign: "center" }}
                    >
                      <table
                        role="presentation"
                        cellPadding={0}
                        cellSpacing={0}
                        style={{ margin: "0 auto" }}
                      >
                        <tbody>
                          <tr>
                            <td style={{ padding: "5px 0 0" }}>
                              <div
                                style={{
                                  width: "11px",
                                  height: "11px",
                                  borderRadius: "50%",
                                  backgroundColor: relleno,
                                  border: `2px solid ${color}`,
                                  lineHeight: "11px",
                                  fontSize: "1px",
                                }}
                              >
                                &nbsp;
                              </div>
                            </td>
                          </tr>
                          {!ultimo ? (
                            <tr>
                              <td align="center" style={{ padding: "2px 0" }}>
                                {/* El riel: una celda angosta, no un borde, para
                                    que Outlook no se lo coma. */}
                                <div
                                  style={{
                                    width: "2px",
                                    height: "26px",
                                    backgroundColor:
                                      h.estado === "hecho" ? "#007A7B" : "#DCE3EA",
                                    fontSize: "1px",
                                    lineHeight: "26px",
                                  }}
                                >
                                  &nbsp;
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </td>
                    <td valign="top" style={{ padding: "0 0 14px" }}>
                      <div
                        style={{
                          color: h.estado === "pendiente" ? SUAVE : NAVY,
                          fontSize: "14px",
                          fontWeight: h.estado === "actual" ? 700 : 600,
                          lineHeight: "20px",
                        }}
                      >
                        {h.titulo}
                      </div>
                      {h.detalle ? (
                        <div
                          style={{
                            color: SUAVE,
                            fontSize: "12.5px",
                            lineHeight: "18px",
                            paddingTop: "2px",
                          }}
                        >
                          {h.detalle}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      );
    }

    default:
      return null;
  }
}
