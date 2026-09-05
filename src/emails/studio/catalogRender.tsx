import * as React from "react";
import {
  Button,
  Column,
  Hr,
  Img,
  Link,
  Row,
  Section,
  Text,
} from "react-email";
import type { StudioBlock } from "./types";
import { resolveStudioColor } from "./colors";

export type CatalogRenderCtx = {
  nombre: string;
  preferPublic: boolean;
  merge: (text: string) => string;
  boldParts: (text: string) => React.ReactNode;
  align: "left" | "center" | "right";
  accent: string;
  assets: { logo: string; logoWhite: string };
};

const DEMO_IMG =
  "https://www.asli.cl/embarques/email/formas-header.png";
const DEMO_AVATAR =
  "https://www.asli.cl/embarques/logoasli.png";

function cellWidth(cols: number): string {
  if (cols === 3) return "33%";
  if (cols === 4) return "25%";
  return "50%";
}

function parseLines(raw: string | undefined, fallback: string[]): string[] {
  const lines = (raw || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : fallback;
}

function parsePipeRows(raw: string | undefined, fallback: string[]): string[][] {
  return parseLines(raw, fallback).map((l) =>
    l.split("|").map((c) => c.trim()),
  );
}

/** Render de bloques del catálogo React Email (https://react.email/components). */
export function renderCatalogBlock(
  block: StudioBlock,
  ctx: CatalogRenderCtx,
): React.ReactNode {
  const p = block.props;
  const { merge, boldParts, align, accent, assets } = ctx;

  switch (block.kind) {
    case "grid": {
      const cols = Math.min(4, Math.max(2, Number(p.cols || "2") || 2));
      const cells = [
        { title: p.title1 || "Columna 1", text: p.text1 || "Contenido de ejemplo." },
        { title: p.title2 || "Columna 2", text: p.text2 || "Contenido de ejemplo." },
        { title: p.title3 || "Columna 3", text: p.text3 || "Contenido de ejemplo." },
        { title: p.title4 || "Columna 4", text: p.text4 || "Contenido de ejemplo." },
      ].slice(0, cols);
      const w = cellWidth(cols);
      return (
        <Section style={{ margin: "8px 0" }}>
          <Row>
            {cells.map((c, i) => (
              <Column
                key={i}
                style={{
                  width: w,
                  verticalAlign: "top",
                  padding: "8px",
                }}
              >
                <Text
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: accent,
                    textAlign: align,
                  }}
                >
                  {merge(c.title)}
                </Text>
                <Text
                  style={{
                    margin: "6px 0 0 0",
                    fontSize: "13px",
                    lineHeight: "20px",
                    color: "#4a4a4a",
                    textAlign: align,
                  }}
                >
                  {boldParts(merge(c.text))}
                </Text>
              </Column>
            ))}
          </Row>
        </Section>
      );
    }

    case "link": {
      const href = p.href || "https://www.asli.cl";
      const label = merge(p.label || "Visitar enlace");
      const variant = (p.variant || "inline").toLowerCase();
      if (variant === "button") {
        return (
          <Section style={{ margin: "12px 0", textAlign: align }}>
            <Button
              href={href}
              style={{
                backgroundColor: accent,
                color: "#fff",
                padding: "10px 18px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {label}
            </Button>
          </Section>
        );
      }
      return (
        <Section style={{ margin: "8px 0", textAlign: align }}>
          <Link
            href={href}
            style={{
              color: accent,
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            {label}
          </Link>
        </Section>
      );
    }

    case "buttonsRow": {
      const variant = (p.variant || "two").toLowerCase();
      const b1 = merge(p.label1 || "Acción principal");
      const b2 = merge(p.label2 || "Acción secundaria");
      const h1 = p.href1 || "https://www.asli.cl";
      const h2 = p.href2 || "https://www.asli.cl";
      if (variant === "download") {
        return (
          <Section style={{ margin: "12px 0", textAlign: align }}>
            <Row>
              <Column style={{ padding: "4px" }}>
                <Button
                  href={h1}
                  style={{
                    backgroundColor: "#11224E",
                    color: "#fff",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  {b1}
                </Button>
              </Column>
              <Column style={{ padding: "4px" }}>
                <Button
                  href={h2}
                  style={{
                    backgroundColor: "#007A7B",
                    color: "#fff",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  {b2}
                </Button>
              </Column>
            </Row>
          </Section>
        );
      }
      return (
        <Section style={{ margin: "12px 0", textAlign: align }}>
          <Row>
            <Column align="center" style={{ padding: "4px" }}>
              <Button
                href={h1}
                style={{
                  backgroundColor: accent,
                  color: "#fff",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {b1}
              </Button>
            </Column>
            <Column align="center" style={{ padding: "4px" }}>
              <Button
                href={h2}
                style={{
                  backgroundColor: "transparent",
                  color: accent,
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: `1px solid ${accent}`,
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {b2}
              </Button>
            </Column>
          </Row>
        </Section>
      );
    }

    case "avatar": {
      const variant = (p.variant || "circular").toLowerCase();
      const names = parseLines(p.names, ["Ana Pérez", "Luis Soto", "María Díaz"]);
      const urls = parseLines(p.urls, [DEMO_AVATAR, DEMO_AVATAR, DEMO_AVATAR]);
      const size = variant === "large" ? 56 : 36;
      const radius = variant === "rounded" ? "8px" : "999px";

      if (variant === "stacked") {
        return (
          <Section style={{ margin: "10px 0", textAlign: align }}>
            <Row>
              {urls.slice(0, 4).map((src, i) => (
                <Column key={i} style={{ width: `${size * 0.7}px`, padding: 0 }}>
                  <Img
                    src={src}
                    width={size}
                    height={size}
                    alt={names[i] || "Avatar"}
                    style={{
                      borderRadius: radius,
                      border: "2px solid #fff",
                      display: "block",
                      marginLeft: i === 0 ? 0 : -10,
                      objectFit: "cover",
                      backgroundColor: "#eef2f8",
                    }}
                  />
                </Column>
              ))}
            </Row>
          </Section>
        );
      }

      if (variant === "withText") {
        return (
          <Section style={{ margin: "10px 0" }}>
            <Row>
              <Column style={{ width: `${size + 12}px`, verticalAlign: "middle" }}>
                <Img
                  src={urls[0] || DEMO_AVATAR}
                  width={size}
                  height={size}
                  alt=""
                  style={{
                    borderRadius: radius,
                    display: "block",
                    objectFit: "cover",
                    backgroundColor: "#eef2f8",
                  }}
                />
              </Column>
              <Column style={{ verticalAlign: "middle" }}>
                <Text style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#11224E" }}>
                  {merge(names[0] || "Nombre")}
                </Text>
                <Text style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#5a6b85" }}>
                  {merge(p.role || "Cargo de ejemplo")}
                </Text>
              </Column>
            </Row>
          </Section>
        );
      }

      return (
        <Section style={{ margin: "10px 0", textAlign: align }}>
          <Row>
            {urls.slice(0, 3).map((src, i) => (
              <Column key={i} style={{ width: `${size + 16}px`, padding: "4px", textAlign: "center" }}>
                <Img
                  src={src}
                  width={size}
                  height={size}
                  alt={names[i] || ""}
                  style={{
                    borderRadius: radius,
                    display: "block",
                    margin: "0 auto",
                    objectFit: "cover",
                    backgroundColor: "#eef2f8",
                  }}
                />
                <Text style={{ margin: "6px 0 0 0", fontSize: "11px", color: "#5a6b85", textAlign: "center" }}>
                  {merge(names[i] || "")}
                </Text>
              </Column>
            ))}
          </Row>
        </Section>
      );
    }

    case "gallery": {
      const variant = (p.variant || "four").toLowerCase();
      const urls = parseLines(p.urls, [DEMO_IMG, DEMO_IMG, DEMO_IMG, DEMO_IMG]);
      if (variant === "horizontal" || variant === "three") {
        const n = variant === "three" ? 3 : Math.min(4, urls.length);
        const w = cellWidth(n);
        return (
          <Section style={{ margin: "10px 0" }}>
            <Row>
              {urls.slice(0, n).map((src, i) => (
                <Column key={i} style={{ width: w, padding: "4px" }}>
                  <Img
                    src={src}
                    width="100%"
                    alt={`Imagen ${i + 1}`}
                    style={{
                      display: "block",
                      width: "100%",
                      borderRadius: "8px",
                      objectFit: "cover",
                    }}
                  />
                </Column>
              ))}
            </Row>
          </Section>
        );
      }
      if (variant === "vertical") {
        return (
          <Section style={{ margin: "10px 0" }}>
            {urls.slice(0, 3).map((src, i) => (
              <Img
                key={i}
                src={src}
                width="100%"
                alt={`Imagen ${i + 1}`}
                style={{
                  display: "block",
                  width: "100%",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  objectFit: "cover",
                }}
              />
            ))}
          </Section>
        );
      }
      // four grid 2x2
      return (
        <Section style={{ margin: "10px 0" }}>
          <Row>
            {urls.slice(0, 2).map((src, i) => (
              <Column key={i} style={{ width: "50%", padding: "4px" }}>
                <Img src={src} width="100%" alt="" style={{ display: "block", width: "100%", borderRadius: "8px" }} />
              </Column>
            ))}
          </Row>
          <Row>
            {urls.slice(2, 4).map((src, i) => (
              <Column key={i} style={{ width: "50%", padding: "4px" }}>
                <Img src={src} width="100%" alt="" style={{ display: "block", width: "100%", borderRadius: "8px" }} />
              </Column>
            ))}
          </Row>
        </Section>
      );
    }

    case "codeInline": {
      const code = merge(p.code || "npm install react-email");
      return (
        <Section style={{ margin: "8px 0", textAlign: align }}>
          <Text style={{ margin: 0, fontSize: "13px", color: "#4a4a4a" }}>
            {merge(p.prefix || "Ejecuta")}{" "}
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                backgroundColor: "#f1f5f9",
                color: "#C8102E",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              {code}
            </span>
          </Text>
        </Section>
      );
    }

    case "codeBlock": {
      const code = merge(
        p.code ||
          `import { Html } from 'react-email';\n\nexport default function Email() {\n  return <Html>Hola</Html>;\n}`,
      );
      const showLines = (p.lineNumbers || "0") === "1";
      const lines = code.split("\n");
      const bg = p.theme === "dark" ? "#0B1A3D" : "#0f172a";
      const fg = p.theme === "light" ? "#11224E" : "#e2e8f0";
      const blockBg = p.theme === "light" ? "#f8fafc" : bg;
      return (
        <Section
          style={{
            margin: "12px 0",
            backgroundColor: blockBg,
            borderRadius: "10px",
            padding: "14px 16px",
            border: p.theme === "light" ? "1px solid #e2e8f0" : "none",
          }}
        >
          {p.title ? (
            <Text style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {merge(p.title)}
            </Text>
          ) : null}
          {lines.map((line, i) => (
            <Text
              key={i}
              style={{
                margin: 0,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "12px",
                lineHeight: "18px",
                color: fg,
                whiteSpace: "pre-wrap",
              }}
            >
              {showLines ? (
                <span style={{ color: "#64748b", marginRight: "10px" }}>
                  {String(i + 1).padStart(2, " ")}
                </span>
              ) : null}
              {line || " "}
            </Text>
          ))}
        </Section>
      );
    }

    case "markdown": {
      // Simple markdown subset: headings, bold, lists, paragraphs
      const raw = merge(
        p.content ||
          "## Título de ejemplo\n\nPárrafo con **negrita** y un listado:\n\n- Punto uno\n- Punto dos\n- Punto tres",
      );
      const variant = (p.variant || "simple").toLowerCase();
      const boxStyle: React.CSSProperties =
        variant === "container"
          ? {
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px 16px",
            }
          : variant === "custom"
            ? {
                backgroundColor: softBg(accent),
                borderLeft: `4px solid ${accent}`,
                padding: "12px 14px",
              }
            : { padding: "4px 0" };

      const nodes: React.ReactNode[] = [];
      for (const [i, line] of raw.split(/\r?\n/).entries()) {
        if (/^###\s+/.test(line)) {
          nodes.push(
            <Text key={i} style={{ margin: "10px 0 4px", fontSize: "15px", fontWeight: 700, color: "#11224E" }}>
              {line.replace(/^###\s+/, "")}
            </Text>,
          );
        } else if (/^##\s+/.test(line)) {
          nodes.push(
            <Text key={i} style={{ margin: "12px 0 6px", fontSize: "18px", fontWeight: 700, color: "#11224E" }}>
              {line.replace(/^##\s+/, "")}
            </Text>,
          );
        } else if (/^#\s+/.test(line)) {
          nodes.push(
            <Text key={i} style={{ margin: "12px 0 6px", fontSize: "22px", fontWeight: 700, color: "#11224E" }}>
              {line.replace(/^#\s+/, "")}
            </Text>,
          );
        } else if (/^[-*]\s+/.test(line)) {
          nodes.push(
            <Text key={i} style={{ margin: "2px 0", fontSize: "13px", color: "#4a4a4a" }}>
              • {boldParts(line.replace(/^[-*]\s+/, ""))}
            </Text>,
          );
        } else if (line.trim()) {
          nodes.push(
            <Text key={i} style={{ margin: "6px 0", fontSize: "14px", lineHeight: "22px", color: "#4a4a4a" }}>
              {boldParts(line)}
            </Text>,
          );
        }
      }
      return <Section style={{ margin: "8px 0", ...boxStyle }}>{nodes}</Section>;
    }

    case "article": {
      const variant = (p.variant || "imageLeft").toLowerCase();
      const title = merge(p.title || "Título del artículo");
      const body = merge(p.body || "Resumen representativo del artículo para el informativo.");
      const img = p.imageUrl || DEMO_IMG;
      const author = merge(p.author || "Equipo ASLI");

      if (variant === "cards") {
        return (
          <Section style={{ margin: "12px 0" }}>
            <Row>
              {[0, 1].map((i) => (
                <Column key={i} style={{ width: "50%", padding: "6px", verticalAlign: "top" }}>
                  <Img src={img} width="100%" alt="" style={{ display: "block", borderRadius: "8px" }} />
                  <Text style={{ margin: "8px 0 0", fontSize: "14px", fontWeight: 700, color: "#11224E" }}>
                    {merge(i === 0 ? p.title || "Card 1" : p.title2 || "Card 2")}
                  </Text>
                  <Text style={{ margin: "4px 0 0", fontSize: "12px", color: "#5a6b85", lineHeight: "18px" }}>
                    {boldParts(merge(i === 0 ? p.body || body : p.body2 || "Texto de ejemplo."))}
                  </Text>
                </Column>
              ))}
            </Row>
          </Section>
        );
      }

      if (variant === "authors" || variant === "author") {
        return (
          <Section style={{ margin: "12px 0" }}>
            <Text style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#11224E" }}>{title}</Text>
            <Text style={{ margin: "0 0 12px", fontSize: "14px", color: "#4a4a4a", lineHeight: "22px" }}>
              {boldParts(body)}
            </Text>
            <Row>
              <Column style={{ width: "44px" }}>
                <Img
                  src={p.avatarUrl || DEMO_AVATAR}
                  width={36}
                  height={36}
                  alt=""
                  style={{ borderRadius: "999px", display: "block", objectFit: "cover" }}
                />
              </Column>
              <Column>
                <Text style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#11224E" }}>{author}</Text>
                <Text style={{ margin: "2px 0 0", fontSize: "11px", color: "#5a6b85" }}>
                  {merge(p.role || "Autor")}
                </Text>
              </Column>
            </Row>
          </Section>
        );
      }

      if (variant === "background") {
        return (
          <Section
            style={{
              margin: "12px 0",
              backgroundColor: "#11224E",
              borderRadius: "12px",
              padding: "20px 18px",
              textAlign: "center",
            }}
          >
            <Text style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#fff" }}>{title}</Text>
            <Text style={{ margin: "8px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.85)", lineHeight: "20px" }}>
              {boldParts(body)}
            </Text>
          </Section>
        );
      }

      const imageRight = variant === "imageRight";
      const imgCol = (
        <Column style={{ width: "42%", padding: imageRight ? "0 0 0 12px" : "0 12px 0 0", verticalAlign: "top" }}>
          <Img src={img} width="100%" alt="" style={{ display: "block", borderRadius: "8px" }} />
        </Column>
      );
      const textCol = (
        <Column style={{ width: "58%", verticalAlign: "top" }}>
          <Text style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#11224E" }}>{title}</Text>
          <Text style={{ margin: "8px 0 0", fontSize: "13px", color: "#4a4a4a", lineHeight: "20px" }}>
            {boldParts(body)}
          </Text>
        </Column>
      );
      return (
        <Section style={{ margin: "12px 0" }}>
          <Row>
            {imageRight ? textCol : imgCol}
            {imageRight ? imgCol : textCol}
          </Row>
        </Section>
      );
    }

    case "feature": {
      const variant = (p.variant || "list").toLowerCase();
      const heading = merge(p.heading || "Beneficios");
      const items = parsePipeRows(p.items, [
        "Rápido|Respuesta operativa en horas",
        "Claro|Información sin ruido",
        "Cercano|Equipo en Curicó",
        "Seguro|Procesos documentados",
      ]);

      return (
        <Section style={{ margin: "12px 0" }}>
          <Text style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 700, color: "#11224E", textAlign: align }}>
            {heading}
          </Text>
          {variant === "numbered" ? (
            items.map((row, i) => (
              <Row key={i} style={{ marginBottom: "10px" }}>
                <Column style={{ width: "28px", verticalAlign: "top" }}>
                  <Text
                    style={{
                      margin: 0,
                      width: "24px",
                      height: "24px",
                      lineHeight: "24px",
                      textAlign: "center",
                      borderRadius: "999px",
                      backgroundColor: accent,
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </Text>
                </Column>
                <Column>
                  <Text style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#11224E" }}>
                    {merge(row[0] || "")}
                  </Text>
                  <Text style={{ margin: "2px 0 0", fontSize: "12px", color: "#5a6b85" }}>
                    {merge(row[1] || "")}
                  </Text>
                </Column>
              </Row>
            ))
          ) : variant === "four" || variant === "fourCols" || variant === "centered" ? (
            <Row>
              {items.slice(0, 4).map((row, i) => (
                <Column
                  key={i}
                  style={{
                    width: "25%",
                    padding: "6px",
                    verticalAlign: "top",
                    textAlign: variant === "centered" ? "center" : "left",
                  }}
                >
                  <Text style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: accent }}>
                    {merge(row[0] || "")}
                  </Text>
                  <Text style={{ margin: "4px 0 0", fontSize: "11px", color: "#5a6b85", lineHeight: "16px" }}>
                    {merge(row[1] || "")}
                  </Text>
                </Column>
              ))}
            </Row>
          ) : variant === "twoCols" ? (
            <>
              <Row>
                {items.slice(0, 2).map((row, i) => (
                  <Column key={i} style={{ width: "50%", padding: "6px", verticalAlign: "top" }}>
                    <Text style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#11224E" }}>
                      {merge(row[0] || "")}
                    </Text>
                    <Text style={{ margin: "4px 0 0", fontSize: "12px", color: "#5a6b85" }}>
                      {merge(row[1] || "")}
                    </Text>
                  </Column>
                ))}
              </Row>
              <Row>
                {items.slice(2, 4).map((row, i) => (
                  <Column key={i} style={{ width: "50%", padding: "6px", verticalAlign: "top" }}>
                    <Text style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#11224E" }}>
                      {merge(row[0] || "")}
                    </Text>
                    <Text style={{ margin: "4px 0 0", fontSize: "12px", color: "#5a6b85" }}>
                      {merge(row[1] || "")}
                    </Text>
                  </Column>
                ))}
              </Row>
            </>
          ) : (
            items.map((row, i) => (
              <Text key={i} style={{ margin: "0 0 8px", fontSize: "13px", color: "#4a4a4a" }}>
                <strong style={{ color: accent }}>• {merge(row[0] || "")}</strong>
                {row[1] ? ` — ${merge(row[1])}` : ""}
              </Text>
            ))
          )}
        </Section>
      );
    }

    case "stats": {
      const variant = (p.variant || "simple").toLowerCase();
      const items = parsePipeRows(p.items, [
        "98%|Satisfacción",
        "24h|Respuesta",
        "150+|Clientes",
      ]);
      if (variant === "stepped") {
        return (
          <Section style={{ margin: "12px 0" }}>
            {items.map((row, i) => (
              <Row key={i} style={{ marginBottom: "8px" }}>
                <Column style={{ width: "30%" }}>
                  <Text style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: accent }}>
                    {merge(row[0] || "")}
                  </Text>
                </Column>
                <Column>
                  <Text style={{ margin: 0, fontSize: "13px", color: "#4a4a4a", paddingTop: "6px" }}>
                    {merge(row[1] || "")}
                  </Text>
                  <Hr style={{ borderColor: "#e2e8f0", margin: "8px 0 0" }} />
                </Column>
              </Row>
            ))}
          </Section>
        );
      }
      return (
        <Section style={{ margin: "12px 0", backgroundColor: "#f8fafc", borderRadius: "10px", padding: "14px 8px" }}>
          <Row>
            {items.slice(0, 3).map((row, i) => (
              <Column key={i} style={{ width: "33%", textAlign: "center", padding: "4px" }}>
                <Text style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: accent, textAlign: "center" }}>
                  {merge(row[0] || "")}
                </Text>
                <Text style={{ margin: "4px 0 0", fontSize: "11px", color: "#5a6b85", textAlign: "center" }}>
                  {merge(row[1] || "")}
                </Text>
              </Column>
            ))}
          </Row>
        </Section>
      );
    }

    case "testimonial": {
      const variant = (p.variant || "centered").toLowerCase();
      const quote = merge(p.quote || "“Excelente coordinación y seguimiento en cada embarque.”");
      const name = merge(p.name || "Cliente ejemplo");
      const role = merge(p.role || "Exportador · Curicó");
      const avatar = p.avatarUrl || DEMO_AVATAR;
      if (variant === "large") {
        return (
          <Section style={{ margin: "14px 0", textAlign: "center" }}>
            <Img
              src={avatar}
              width={72}
              height={72}
              alt=""
              style={{ borderRadius: "999px", display: "block", margin: "0 auto 12px", objectFit: "cover" }}
            />
            <Text style={{ margin: 0, fontSize: "15px", lineHeight: "24px", color: "#11224E", fontStyle: "italic" }}>
              {quote}
            </Text>
            <Text style={{ margin: "12px 0 0", fontSize: "13px", fontWeight: 700, color: accent }}>{name}</Text>
            <Text style={{ margin: "2px 0 0", fontSize: "11px", color: "#5a6b85" }}>{role}</Text>
          </Section>
        );
      }
      return (
        <Section style={{ margin: "12px 0", textAlign: "center", padding: "8px 12px" }}>
          <Text style={{ margin: 0, fontSize: "14px", lineHeight: "22px", color: "#4a4a4a", fontStyle: "italic" }}>
            {quote}
          </Text>
          <Text style={{ margin: "10px 0 0", fontSize: "12px", fontWeight: 700, color: "#11224E" }}>
            {name} · <span style={{ fontWeight: 500, color: "#5a6b85" }}>{role}</span>
          </Text>
        </Section>
      );
    }

    case "feedback": {
      const variant = (p.variant || "rating").toLowerCase();
      if (variant === "survey") {
        const q = merge(p.question || "¿Cómo calificarías este servicio?");
        return (
          <Section style={{ margin: "12px 0", backgroundColor: "#f8fafc", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
            <Text style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#11224E" }}>{q}</Text>
            <Row>
              {["1", "2", "3", "4", "5"].map((n) => (
                <Column key={n} style={{ padding: "4px" }}>
                  <Button
                    href={p.href || "https://www.asli.cl"}
                    style={{
                      backgroundColor: "#fff",
                      border: `1px solid ${accent}`,
                      color: accent,
                      borderRadius: "8px",
                      padding: "8px 0",
                      width: "100%",
                      fontWeight: 700,
                      fontSize: "13px",
                      textDecoration: "none",
                    }}
                  >
                    {n}
                  </Button>
                </Column>
              ))}
            </Row>
          </Section>
        );
      }
      if (variant === "reviews") {
        const reviews = parsePipeRows(p.items, [
          "Ana|Muy bueno|5",
          "Luis|Rápidos y claros|5",
        ]);
        return (
          <Section style={{ margin: "12px 0" }}>
            <Text style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: 700, color: "#11224E" }}>
              {merge(p.heading || "Reseñas")}
            </Text>
            {reviews.map((r, i) => (
              <Section key={i} style={{ marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid #eef2f8" }}>
                <Text style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#11224E" }}>
                  {merge(r[0] || "")}{" "}
                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>{"★".repeat(Number(r[2] || 5) || 5)}</span>
                </Text>
                <Text style={{ margin: "4px 0 0", fontSize: "12px", color: "#5a6b85" }}>{merge(r[1] || "")}</Text>
              </Section>
            ))}
          </Section>
        );
      }
      // simple rating
      return (
        <Section style={{ margin: "12px 0", textAlign: "center" }}>
          <Text style={{ margin: "0 0 8px", fontSize: "14px", color: "#4a4a4a" }}>
            {merge(p.question || "¿Te fue útil este informativo?")}
          </Text>
          <Row>
            <Column align="center" style={{ padding: "4px" }}>
              <Button href={p.hrefYes || "https://www.asli.cl"} style={chipBtn("#007A7B")}>
                {merge(p.yesLabel || "Sí")}
              </Button>
            </Column>
            <Column align="center" style={{ padding: "4px" }}>
              <Button href={p.hrefNo || "https://www.asli.cl"} style={chipBtn("#C8102E")}>
                {merge(p.noLabel || "No")}
              </Button>
            </Column>
          </Row>
        </Section>
      );
    }

    case "pricing": {
      const variant = (p.variant || "simple").toLowerCase();
      const tiers = parsePipeRows(p.items, [
        "Básico|$0|Ideal para pruebas",
        "Pro|$49|Para equipos en crecimiento",
        "Enterprise|A medida|Operación completa",
      ]);
      if (variant === "emphasized") {
        const a = tiers[0] || ["Starter", "$29", "Incluye soporte"];
        const b = tiers[1] || ["Business", "$79", "Prioritario"];
        return (
          <Section style={{ margin: "12px 0" }}>
            <Row>
              <Column style={{ width: "48%", padding: "8px", verticalAlign: "top" }}>
                <Section style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
                  <Text style={{ margin: 0, fontSize: "13px", color: "#5a6b85" }}>{merge(a[0] || "")}</Text>
                  <Text style={{ margin: "6px 0", fontSize: "24px", fontWeight: 800, color: "#11224E" }}>{merge(a[1] || "")}</Text>
                  <Text style={{ margin: 0, fontSize: "12px", color: "#5a6b85" }}>{merge(a[2] || "")}</Text>
                </Section>
              </Column>
              <Column style={{ width: "52%", padding: "8px", verticalAlign: "top" }}>
                <Section style={{ backgroundColor: accent, borderRadius: "10px", padding: "14px" }}>
                  <Text style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.85)" }}>{merge(b[0] || "")}</Text>
                  <Text style={{ margin: "6px 0", fontSize: "24px", fontWeight: 800, color: "#fff" }}>{merge(b[1] || "")}</Text>
                  <Text style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.85)" }}>{merge(b[2] || "")}</Text>
                </Section>
              </Column>
            </Row>
          </Section>
        );
      }
      return (
        <Section style={{ margin: "12px 0" }}>
          <Row>
            {tiers.slice(0, 3).map((t, i) => (
              <Column key={i} style={{ width: "33%", padding: "6px", verticalAlign: "top" }}>
                <Section style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                  <Text style={{ margin: 0, fontSize: "12px", color: "#5a6b85", textAlign: "center" }}>{merge(t[0] || "")}</Text>
                  <Text style={{ margin: "6px 0", fontSize: "20px", fontWeight: 800, color: accent, textAlign: "center" }}>
                    {merge(t[1] || "")}
                  </Text>
                  <Text style={{ margin: 0, fontSize: "11px", color: "#5a6b85", textAlign: "center" }}>{merge(t[2] || "")}</Text>
                </Section>
              </Column>
            ))}
          </Row>
        </Section>
      );
    }

    case "product": {
      const variant = (p.variant || "stacked").toLowerCase();
      const title = merge(p.title || "Producto de ejemplo");
      const price = merge(p.price || "USD 120");
      const desc = merge(p.description || "Descripción corta del producto o servicio.");
      const img = p.imageUrl || DEMO_IMG;
      if (variant === "imageLeft") {
        return (
          <Section style={{ margin: "12px 0" }}>
            <Row>
              <Column style={{ width: "40%", paddingRight: "12px" }}>
                <Img src={img} width="100%" alt="" style={{ display: "block", borderRadius: "8px" }} />
              </Column>
              <Column style={{ width: "60%", verticalAlign: "middle" }}>
                <Text style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#11224E" }}>{title}</Text>
                <Text style={{ margin: "6px 0", fontSize: "18px", fontWeight: 800, color: accent }}>{price}</Text>
                <Text style={{ margin: 0, fontSize: "13px", color: "#5a6b85", lineHeight: "20px" }}>{boldParts(desc)}</Text>
              </Column>
            </Row>
          </Section>
        );
      }
      if (variant === "cards3" || variant === "cards4") {
        const n = variant === "cards4" ? 4 : 3;
        const cards = parsePipeRows(p.items, [
          "Servicio A|$40|Detalle",
          "Servicio B|$60|Detalle",
          "Servicio C|$80|Detalle",
          "Servicio D|$100|Detalle",
        ]).slice(0, n);
        return (
          <Section style={{ margin: "12px 0" }}>
            {p.heading ? (
              <Text style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: 700, color: "#11224E", textAlign: "center" }}>
                {merge(p.heading)}
              </Text>
            ) : null}
            <Row>
              {cards.map((c, i) => (
                <Column key={i} style={{ width: cellWidth(n), padding: "6px", verticalAlign: "top" }}>
                  <Img src={img} width="100%" alt="" style={{ display: "block", borderRadius: "8px", marginBottom: "8px" }} />
                  <Text style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#11224E" }}>{merge(c[0] || "")}</Text>
                  <Text style={{ margin: "4px 0", fontSize: "14px", fontWeight: 800, color: accent }}>{merge(c[1] || "")}</Text>
                  <Text style={{ margin: 0, fontSize: "11px", color: "#5a6b85" }}>{merge(c[2] || "")}</Text>
                </Column>
              ))}
            </Row>
          </Section>
        );
      }
      return (
        <Section style={{ margin: "12px 0", textAlign: "center" }}>
          <Img src={img} width="100%" alt="" style={{ display: "block", borderRadius: "10px", marginBottom: "10px" }} />
          <Text style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#11224E" }}>{title}</Text>
          <Text style={{ margin: "6px 0", fontSize: "18px", fontWeight: 800, color: accent }}>{price}</Text>
          <Text style={{ margin: 0, fontSize: "13px", color: "#5a6b85", lineHeight: "20px" }}>{boldParts(desc)}</Text>
        </Section>
      );
    }

    case "checkout": {
      const rows = parsePipeRows(p.items, [
        "Servicio base|USD 100",
        "Documentación|USD 25",
        "Total|USD 125",
      ]);
      return (
        <Section style={{ margin: "12px 0", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
          <Text style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: 700, color: "#11224E" }}>
            {merge(p.heading || "Resumen de compra")}
          </Text>
          {rows.map((r, i) => {
            const isTotal = i === rows.length - 1;
            return (
              <Row key={i} style={{ marginBottom: "6px" }}>
                <Column>
                  <Text
                    style={{
                      margin: 0,
                      fontSize: isTotal ? "14px" : "13px",
                      fontWeight: isTotal ? 700 : 500,
                      color: "#11224E",
                    }}
                  >
                    {merge(r[0] || "")}
                  </Text>
                </Column>
                <Column align="right">
                  <Text
                    style={{
                      margin: 0,
                      fontSize: isTotal ? "14px" : "13px",
                      fontWeight: isTotal ? 800 : 600,
                      color: isTotal ? accent : "#4a4a4a",
                      textAlign: "right",
                    }}
                  >
                    {merge(r[1] || "")}
                  </Text>
                </Column>
              </Row>
            );
          })}
          <Section style={{ marginTop: "12px", textAlign: "center" }}>
            <Button
              href={p.href || "https://www.asli.cl"}
              style={{
                backgroundColor: accent,
                color: "#fff",
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              {merge(p.cta || "Confirmar")}
            </Button>
          </Section>
        </Section>
      );
    }

    case "containerBand": {
      return (
        <Section
          style={{
            margin: "10px 0",
            backgroundColor: resolveStudioColor(p.bg, "#F6EEE8"),
            borderRadius: "10px",
            padding: "16px 18px",
            textAlign: align,
          }}
        >
          <Text style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: accent, textAlign: align }}>
            {merge(p.title || "Contenedor")}
          </Text>
          <Text style={{ margin: "6px 0 0", fontSize: "13px", color: "#4a4a4a", lineHeight: "20px", textAlign: align }}>
            {boldParts(merge(p.text || "Bloque contenedor centrado para destacar un mensaje."))}
          </Text>
        </Section>
      );
    }

    case "sectionLayout": {
      const variant = (p.variant || "simple").toLowerCase();
      if (variant === "rows") {
        return (
          <Section style={{ margin: "10px 0", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
            <Row>
              <Column style={{ width: "50%", padding: "6px" }}>
                <Text style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#11224E" }}>
                  {merge(p.title1 || "Fila 1 · Col A")}
                </Text>
                <Text style={{ margin: "4px 0 0", fontSize: "12px", color: "#5a6b85" }}>
                  {merge(p.text1 || "Contenido")}
                </Text>
              </Column>
              <Column style={{ width: "50%", padding: "6px" }}>
                <Text style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#11224E" }}>
                  {merge(p.title2 || "Fila 1 · Col B")}
                </Text>
                <Text style={{ margin: "4px 0 0", fontSize: "12px", color: "#5a6b85" }}>
                  {merge(p.text2 || "Contenido")}
                </Text>
              </Column>
            </Row>
            <Hr style={{ borderColor: "#eef2f8", margin: "8px 0" }} />
            <Row>
              <Column style={{ width: "50%", padding: "6px" }}>
                <Text style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#11224E" }}>
                  {merge(p.title3 || "Fila 2 · Col A")}
                </Text>
              </Column>
              <Column style={{ width: "50%", padding: "6px" }}>
                <Text style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#11224E" }}>
                  {merge(p.title4 || "Fila 2 · Col B")}
                </Text>
              </Column>
            </Row>
          </Section>
        );
      }
      return (
        <Section style={{ margin: "10px 0", padding: "8px 0" }}>
          <Text style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#11224E", textAlign: align }}>
            {merge(p.title || "Sección")}
          </Text>
          <Text style={{ margin: "8px 0 0", fontSize: "14px", color: "#4a4a4a", lineHeight: "22px", textAlign: align }}>
            {boldParts(merge(p.text || "Sección simple con título y cuerpo."))}
          </Text>
        </Section>
      );
    }

    default:
      return null;
  }
}

function softBg(hex: string): string {
  return `${hex}14`;
}

function chipBtn(bg: string): React.CSSProperties {
  return {
    backgroundColor: bg,
    color: "#fff",
    padding: "8px 18px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    textDecoration: "none",
  };
}

/** Kinds handled by catalog renderer. */
export const CATALOG_KINDS = new Set([
  "grid",
  "link",
  "buttonsRow",
  "avatar",
  "gallery",
  "codeInline",
  "codeBlock",
  "markdown",
  "article",
  "feature",
  "stats",
  "testimonial",
  "feedback",
  "pricing",
  "product",
  "checkout",
  "containerBand",
  "sectionLayout",
]);
