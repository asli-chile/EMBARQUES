import * as React from "react";
import parse from "html-react-parser";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  pixelBasedPreset,
  Row,
  Section,
  Tailwind,
  Text,
} from "react-email";
import {
  dataRowIconSrc,
  emailAssetUrls,
  resolveEmailAssetTokens,
} from "@/lib/email/assets";
import {
  mergePlantilla,
  resolveSaludo,
} from "@/lib/email/informativos/saludo";
import { ASLI_TAILWIND, type StudioBlock, type StudioDocument } from "./types";
import { resolveStudioColor, softTintFromColor } from "./colors";

function boldParts(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={i}>{m[1]}</strong>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function merge(
  text: string,
  nombre: string,
  preferPublic = false,
  saludoMode?: string,
): string {
  return resolveEmailAssetTokens(
    mergePlantilla(text, {
      nombre,
      saludo: resolveSaludo(saludoMode, nombre),
    }),
    preferPublic,
  );
}

function resolveTextAlign(
  raw: string | undefined,
): "left" | "center" | "right" {
  const v = (raw || "left").trim().toLowerCase();
  if (v === "center" || v === "centro") return "center";
  if (v === "right" || v === "derecha") return "right";
  return "left";
}

function BlockView({
  block,
  nombre,
  preferPublic,
}: {
  block: StudioBlock;
  nombre: string;
  preferPublic: boolean;
}) {
  const p = block.props;
  const assets = emailAssetUrls(preferPublic);
  const align = resolveTextAlign(p.align);
  const accent = resolveStudioColor(p.color, "#11224E");

  switch (block.kind) {
    case "headerAsli": {
      const stripe = resolveStudioColor(p.color, "#C8102E");
      const navy = "#002d69";
      const logo = p.logoUrl || assets.logoWhite;
      const logoDark = p.logoUrl || assets.logo;
      const variant = (p.variant || "barra").toLowerCase();
      const kicker = (p.kicker || "Informativo").trim();

      if (variant === "filete") {
        return (
          <Section style={{ backgroundColor: "#ffffff" }}>
            <Row>
              <Column style={{ padding: "22px 24px 10px 24px", verticalAlign: "middle" }}>
                <Img
                  src={logoDark}
                  width="110"
                  alt="ASLI"
                  style={{
                    display: "block",
                    border: 0,
                    outline: "none",
                    width: "110px",
                    maxWidth: "42%",
                    height: "auto",
                  }}
                />
                {kicker ? (
                  <Text
                    style={{
                      margin: "10px 0 0 0",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: navy,
                    }}
                  >
                    {kicker}
                  </Text>
                ) : null}
              </Column>
            </Row>
            <Section style={{ backgroundColor: stripe, height: "8px", lineHeight: "8px" }}>
              <Text style={{ margin: 0, fontSize: "1px", lineHeight: "8px", color: stripe }}>
                &nbsp;
              </Text>
            </Section>
            <Section style={{ backgroundColor: navy, height: "2px", lineHeight: "2px" }}>
              <Text style={{ margin: 0, fontSize: "1px", lineHeight: "2px", color: navy }}>
                &nbsp;
              </Text>
            </Section>
          </Section>
        );
      }

      if (variant === "masthead") {
        return (
          <Section style={{ backgroundColor: "#ffffff" }}>
            <Section style={{ backgroundColor: navy, height: "6px", lineHeight: "6px" }}>
              <Text style={{ margin: 0, fontSize: "1px", lineHeight: "6px", color: navy }}>
                &nbsp;
              </Text>
            </Section>
            <Row>
              <Column
                style={{
                  padding: "20px 24px 8px 24px",
                  verticalAlign: "bottom",
                  width: "58%",
                }}
              >
                <Img
                  src={logoDark}
                  width="100"
                  alt="ASLI"
                  style={{
                    display: "block",
                    border: 0,
                    outline: "none",
                    width: "100px",
                    maxWidth: "100%",
                    height: "auto",
                  }}
                />
              </Column>
              <Column
                style={{
                  padding: "20px 24px 12px 12px",
                  verticalAlign: "bottom",
                  width: "42%",
                  textAlign: "right",
                }}
              >
                <Text
                  style={{
                    margin: 0,
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: navy,
                    textAlign: "right",
                  }}
                >
                  {kicker || "ASLI"}
                </Text>
                <Text
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "9px",
                    letterSpacing: "0.06em",
                    color: "#64748b",
                    textAlign: "right",
                  }}
                >
                  Logística · Comercio exterior
                </Text>
              </Column>
            </Row>
            <Section
              style={{
                margin: "0 24px",
                backgroundColor: stripe,
                height: "8px",
                lineHeight: "8px",
              }}
            >
              <Text style={{ margin: 0, fontSize: "1px", lineHeight: "8px", color: stripe }}>
                &nbsp;
              </Text>
            </Section>
            <Section style={{ height: "14px", lineHeight: "14px" }}>
              <Text style={{ margin: 0, fontSize: "1px", lineHeight: "14px", color: "transparent" }}>
                &nbsp;
              </Text>
            </Section>
          </Section>
        );
      }

      // variante "barra" (default) — bloque navy + franja roja editorial
      return (
        <Section style={{ backgroundColor: navy }}>
          <Row>
            <Column style={{ padding: "20px 22px 16px 22px", verticalAlign: "middle" }}>
              <Img
                src={logo}
                width="96"
                alt="ASLI"
                style={{
                  display: "block",
                  border: 0,
                  outline: "none",
                  width: "96px",
                  maxWidth: "40%",
                  height: "auto",
                }}
              />
              {kicker ? (
                <Text
                  style={{
                    margin: "8px 0 0 0",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.72)",
                  }}
                >
                  {kicker}
                </Text>
              ) : null}
            </Column>
          </Row>
          <Section style={{ backgroundColor: stripe, height: "8px", lineHeight: "8px" }}>
            <Text style={{ margin: 0, fontSize: "1px", lineHeight: "8px", color: stripe }}>
              &nbsp;
            </Text>
          </Section>
        </Section>
      );
    }
    case "greeting": {
      const text = merge(
        p.template || "{{saludo}} {{nombre}},",
        nombre,
        preferPublic,
        p.saludoMode,
      );
      return (
        <Text
          style={{
            margin: "0 0 12px 0",
            fontSize: "14px",
            lineHeight: "22px",
            color: resolveStudioColor(p.color, "#18181b"),
            textAlign: align,
          }}
        >
          {text}
        </Text>
      );
    }
    case "heading":
      return (
        <Heading
          as={(p.as as "h1" | "h2" | "h3") || "h2"}
          style={{
            margin: "0 0 12px 0",
            fontSize: "20px",
            fontWeight: 700,
            lineHeight: "28px",
            color: accent,
            textAlign: align,
          }}
        >
          {merge(p.text || "", nombre, preferPublic)}
        </Heading>
      );
    case "text": {
      const merged = merge(p.text || "", nombre, preferPublic);
      const lines = merged.split(/\n/);
      return (
        <Text
          style={{
            margin: "16px 0 0 0",
            fontSize: "14px",
            lineHeight: "22px",
            color: resolveStudioColor(p.color, "#18181b"),
            textAlign: align,
          }}
        >
          {lines.map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <br /> : null}
              {boldParts(line)}
            </React.Fragment>
          ))}
        </Text>
      );
    }
    case "listNumbered":
    case "listBullet":
    case "listDash":
    case "listCheck": {
      const items = (p.items || "")
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const markerColor = p.color
        ? accent
        : block.kind === "listCheck"
          ? "#007A7B"
          : "#11224E";
      const markerFor = (i: number) => {
        if (block.kind === "listNumbered") return `${i + 1}.`;
        if (block.kind === "listDash") return "–";
        if (block.kind === "listCheck") return "✓";
        return "•";
      };
      return (
        <Section style={{ margin: "12px 0 4px 0", textAlign: align }}>
          {items.length === 0 ? (
            <Text
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: "22px",
                color: "#94a3b8",
                textAlign: align,
              }}
            >
              (Lista vacía)
            </Text>
          ) : (
            items.map((item, i) => (
              <Text
                key={i}
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "14px",
                  lineHeight: "22px",
                  color: "#18181b",
                  textAlign: align,
                }}
              >
                <span
                  style={{
                    color: markerColor,
                    fontWeight: 600,
                    marginRight: "8px",
                  }}
                >
                  {markerFor(i)}
                </span>
                {boldParts(merge(item, nombre, preferPublic))}
              </Text>
            ))
          )}
        </Section>
      );
    }
    case "listSteps": {
      const heading = (p.heading || "").trim();
      const steps = (p.items || "")
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line) => {
          const sep = line.indexOf("|");
          if (sep >= 0) {
            return {
              title: line.slice(0, sep).trim(),
              description: line.slice(sep + 1).trim(),
            };
          }
          return { title: line, description: "" };
        });
      return (
        <Section style={{ margin: "16px 0 8px 0" }}>
          {heading ? (
            <Heading
              as="h2"
              style={{
                margin: "0 0 28px 0",
                fontSize: "22px",
                lineHeight: "30px",
                fontWeight: 700,
                color: accent,
                textAlign: align === "center" || align === "right" ? align : "center",
              }}
            >
              {boldParts(merge(heading, nombre, preferPublic))}
            </Heading>
          ) : null}
          {steps.length === 0 ? (
            <Text style={{ margin: 0, fontSize: "14px", color: "#94a3b8" }}>
              (Lista vacía)
            </Text>
          ) : (
            steps.map((step, i) => (
              <Section key={i} style={{ marginBottom: i === steps.length - 1 ? 8 : 28 }}>
                <Row>
                  <Column
                    width={42}
                    style={{
                      width: 42,
                      verticalAlign: "top",
                      paddingRight: 14,
                    }}
                  >
                    <table
                      role="presentation"
                      cellPadding={0}
                      cellSpacing={0}
                      border={0}
                      style={{ borderCollapse: "collapse" }}
                    >
                      <tbody>
                        <tr>
                          <td
                            width={28}
                            height={28}
                            align="center"
                            valign="middle"
                            bgcolor={accent}
                            style={{
                              width: 28,
                              height: 28,
                              backgroundColor: accent,
                              borderRadius: "9999px",
                              color: "#ffffff",
                              fontSize: "12px",
                              fontWeight: 700,
                              lineHeight: "28px",
                              textAlign: "center",
                            }}
                          >
                            {i + 1}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </Column>
                  <Column style={{ verticalAlign: "top" }}>
                    <Heading
                      as="h3"
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: "16px",
                        lineHeight: "24px",
                        fontWeight: 700,
                        color: accent,
                      }}
                    >
                      {boldParts(merge(step.title, nombre, preferPublic))}
                    </Heading>
                    {step.description ? (
                      <Text
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          lineHeight: "22px",
                          color: "#6b7280",
                        }}
                      >
                        {boldParts(merge(step.description, nombre, preferPublic))}
                      </Text>
                    ) : null}
                  </Column>
                </Row>
              </Section>
            ))
          )}
        </Section>
      );
    }
    case "callout": {
      const variant = (p.variant || "info").toLowerCase();
      const palette = p.color
        ? {
            bg: softTintFromColor(accent),
            border: accent,
            text: accent,
          }
        : variant === "warning"
          ? { bg: "#FFF8E8", border: "#E8B84A", text: "#7A5A10" }
          : variant === "success"
            ? { bg: "#E8F6F2", border: "#007A7B", text: "#0B4F50" }
            : { bg: "#EEF3FA", border: "#11224E", text: "#11224E" };
      return (
        <Section style={{ margin: "14px 0" }}>
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            style={{
              borderCollapse: "collapse",
              width: "100%",
              backgroundColor: palette.bg,
              borderLeft: `4px solid ${palette.border}`,
            }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: "13px",
                    lineHeight: "20px",
                    color: palette.text,
                    textAlign: align,
                  }}
                >
                  {boldParts(merge(p.text || "", nombre, preferPublic))}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
      );
    }
    case "quote": {
      const quoteAccent = resolveStudioColor(p.color, "#C8102E");
      const qVariant = (p.variant || "bar").toLowerCase();
      if (qVariant === "card") {
        return (
          <Section style={{ margin: "14px 0" }}>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{
                borderCollapse: "collapse",
                width: "100%",
                backgroundColor: softTintFromColor(quoteAccent),
                border: `1px solid ${quoteAccent}`,
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: "14px 16px", textAlign: align }}>
                    <Text
                      style={{
                        margin: 0,
                        fontSize: "15px",
                        lineHeight: "24px",
                        fontStyle: "italic",
                        color: "#334155",
                        textAlign: align,
                      }}
                    >
                      {boldParts(merge(p.text || "", nombre, preferPublic))}
                    </Text>
                    {p.cite ? (
                      <Text
                        style={{
                          margin: "8px 0 0 0",
                          fontSize: "12px",
                          lineHeight: "18px",
                          color: quoteAccent,
                          fontWeight: 600,
                          textAlign: align,
                        }}
                      >
                        {merge(p.cite, nombre, preferPublic)}
                      </Text>
                    ) : null}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
        );
      }
      return (
        <Section style={{ margin: "14px 0" }}>
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            style={{
              borderCollapse: "collapse",
              width: "100%",
              borderLeft: `3px solid ${quoteAccent}`,
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: "4px 0 4px 14px", textAlign: align }}>
                  <Text
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      lineHeight: "24px",
                      fontStyle: "italic",
                      color: "#334155",
                      textAlign: align,
                    }}
                  >
                    {boldParts(merge(p.text || "", nombre, preferPublic))}
                  </Text>
                  {p.cite ? (
                    <Text
                      style={{
                        margin: "8px 0 0 0",
                        fontSize: "12px",
                        lineHeight: "18px",
                        color: "#64748b",
                        textAlign: align,
                      }}
                    >
                      {merge(p.cite, nombre, preferPublic)}
                    </Text>
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
      );
    }
    case "spacer": {
      const size = (p.size || "md").toLowerCase();
      const h = size === "sm" ? 12 : size === "lg" ? 40 : 24;
      return (
        <Section style={{ margin: 0, height: h, lineHeight: `${h}px`, fontSize: "1px" }}>
          <Text style={{ margin: 0, fontSize: "1px", lineHeight: `${h}px`, color: "transparent" }}>
            &nbsp;
          </Text>
        </Section>
      );
    }
    case "button": {
      const bVariant = (p.variant || "solid").toLowerCase();
      const btnStyle =
        bVariant === "outline"
          ? {
              backgroundColor: "#ffffff",
              borderRadius: "4px",
              border: `2px solid ${accent}`,
              color: accent,
              display: "inline-block" as const,
              fontSize: "13px",
              fontWeight: 600,
              padding: "9px 18px",
              textDecoration: "none",
            }
          : bVariant === "pill"
            ? {
                backgroundColor: accent,
                borderRadius: "9999px",
                color: "#ffffff",
                display: "inline-block" as const,
                fontSize: "13px",
                fontWeight: 600,
                padding: "10px 22px",
                textDecoration: "none",
              }
            : bVariant === "soft"
              ? {
                  backgroundColor: softTintFromColor(accent),
                  borderRadius: "6px",
                  color: accent,
                  display: "inline-block" as const,
                  fontSize: "13px",
                  fontWeight: 700,
                  padding: "10px 18px",
                  textDecoration: "none",
                }
              : {
                  backgroundColor: accent,
                  borderRadius: "4px",
                  color: "#ffffff",
                  display: "inline-block" as const,
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "10px 18px",
                  textDecoration: "none",
                };
      return (
        <Section style={{ margin: "20px 0", textAlign: align }}>
          <Button href={p.href || "https://asli.cl"} style={btnStyle}>
            {p.label || "Ver más"}
          </Button>
        </Section>
      );
    }
    case "divider": {
      const line = resolveStudioColor(p.color, "#E5E7EB");
      const dVariant = (p.variant || "solid").toLowerCase();
      const thickness = dVariant === "thick" ? "3px" : "1px";
      const style =
        dVariant === "dashed"
          ? {
              borderColor: line,
              borderTop: `${thickness} dashed ${line}`,
              margin: "16px 0",
            }
          : {
              borderColor: line,
              borderTop: `${thickness} solid ${line}`,
              margin: "16px 0",
            };
      return <Hr style={style} />;
    }
    case "image":
      return (
        <Section style={{ margin: "0 0 16px 0", textAlign: align }}>
          <Img
            src={p.src || assets.logo}
            alt={p.alt || ""}
            width={Number(p.width) || 160}
            style={{
              display: "inline-block",
              border: 0,
              maxWidth: "100%",
              height: "auto",
            }}
          />
        </Section>
      );
    case "dataRow": {
      const iconSrc = dataRowIconSrc(p.icon, preferPublic);
      const labelText = `${(p.label || "DATO").replace(/:$/, "")}:`;
      const valueText = merge(p.value || "", nombre, preferPublic);
      const labelColor = resolveStudioColor(
        p.labelColor || p.color,
        "#11224E",
      );
      const valueColor = resolveStudioColor(p.valueColor, "#18181B");
      const borderColor = resolveStudioColor(p.borderColor, "#E2E8F0");
      const iconBg = resolveStudioColor(p.iconBg, "#11224E");
      const cellPad = iconSrc ? "8px 8px 8px 12px" : "8px 8px 8px 0";

      const iconCell = iconSrc ? (
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ borderCollapse: "collapse" }}
        >
          <tbody>
            <tr>
              <td
                width={36}
                height={36}
                align="center"
                valign="middle"
                bgcolor={iconBg}
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: iconBg,
                  borderRadius: "9999px",
                  textAlign: "center",
                }}
              >
                <Img
                  src={iconSrc}
                  width={20}
                  height={20}
                  alt=""
                  style={{
                    display: "block",
                    border: 0,
                    width: "20px",
                    height: "20px",
                    margin: "0 auto",
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      ) : null;

      if (align !== "left") {
        return (
          <Section style={{ margin: "8px 0" }}>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{
                borderCollapse: "collapse",
                width: "100%",
                border: `1px solid ${borderColor}`,
                borderRadius: "8px",
              }}
            >
              <tbody>
                <tr>
                  <td
                    valign="middle"
                    style={{
                      padding: "10px 12px",
                      verticalAlign: "middle",
                      textAlign: align,
                      fontSize: "13px",
                      lineHeight: "18px",
                      color: valueColor,
                    }}
                  >
                    {iconSrc ? (
                      <span style={{ display: "inline-block", verticalAlign: "middle", marginRight: "10px" }}>
                        {iconCell}
                      </span>
                    ) : null}
                    <Text
                      style={{
                        display: "inline",
                        margin: 0,
                        fontSize: "13px",
                        lineHeight: "18px",
                        fontWeight: 700,
                        color: labelColor,
                      }}
                    >
                      {labelText}{" "}
                    </Text>
                    <Text
                      style={{
                        display: "inline",
                        margin: 0,
                        fontSize: "13px",
                        lineHeight: "18px",
                        color: valueColor,
                      }}
                    >
                      {valueText}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
        );
      }

      return (
        <Section style={{ margin: "8px 0" }}>
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            style={{
              borderCollapse: "collapse",
              width: "100%",
              border: `1px solid ${borderColor}`,
              borderRadius: "8px",
            }}
          >
            <tbody>
              <tr>
                {iconSrc ? (
                  <td
                    width={56}
                    valign="middle"
                    style={{
                      width: "56px",
                      padding: "10px 12px",
                      borderRight: `1px solid ${borderColor}`,
                      verticalAlign: "middle",
                    }}
                  >
                    {iconCell}
                  </td>
                ) : null}
                <td
                  width={118}
                  valign="middle"
                  style={{
                    width: "118px",
                    padding: cellPad,
                    verticalAlign: "middle",
                    fontSize: "13px",
                    lineHeight: "18px",
                    fontWeight: 700,
                    color: labelColor,
                    textAlign: "left",
                  }}
                >
                  {labelText}
                </td>
                <td
                  valign="middle"
                  style={{
                    padding: "10px 12px 10px 0",
                    verticalAlign: "middle",
                    fontSize: "13px",
                    lineHeight: "18px",
                    color: valueColor,
                    textAlign: "left",
                  }}
                >
                  {valueText}
                </td>
              </tr>
            </tbody>
          </table>
        </Section>
      );
    }
    case "footerAsli": {
      const accentBar = resolveStudioColor(p.color, "#C8102E");
      const fVariant = (p.variant || "split").toLowerCase();
      const logo = p.logoUrl || assets.logoWhite;
      const tagline = p.tagline || "Logística y Comercio Exterior";
      const addr1 = p.address1 || "Dirección de ejemplo 123,";
      const addr2 = p.address2 || "Ciudad, País";

      if (fVariant === "compact") {
        return (
          <Section style={{ backgroundColor: "#0B1A3D", padding: "14px 18px" }}>
            <Text
              style={{
                margin: 0,
                fontSize: "11px",
                lineHeight: "18px",
                color: "#ffffff",
                textAlign: "center",
              }}
            >
              <strong>ASLI</strong> · {tagline}
            </Text>
            <Text
              style={{
                margin: "6px 0 0 0",
                fontSize: "10px",
                lineHeight: "15px",
                color: "rgba(255,255,255,0.7)",
                textAlign: "center",
              }}
            >
              {addr1} {addr2}
            </Text>
            <Section
              style={{
                margin: "12px auto 0 auto",
                width: "48px",
                backgroundColor: accentBar,
                height: "3px",
                lineHeight: "3px",
              }}
            >
              <Text style={{ margin: 0, fontSize: "1px", lineHeight: "3px", color: accentBar }}>
                &nbsp;
              </Text>
            </Section>
          </Section>
        );
      }

      if (fVariant === "centered") {
        return (
          <Section style={{ backgroundColor: "#0B1A3D", padding: "20px 18px", textAlign: "center" }}>
            <Img
              src={logo}
              width="88"
              alt="ASLI"
              style={{
                display: "block",
                border: 0,
                margin: "0 auto",
                maxWidth: "40%",
                height: "auto",
              }}
            />
            <Text
              style={{
                margin: "10px 0 0 0",
                fontSize: "9px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#ffffff",
                textAlign: "center",
              }}
            >
              {tagline}
            </Text>
            <Text
              style={{
                margin: "8px 0 0 0",
                fontSize: "10px",
                lineHeight: "15px",
                color: "rgba(255,255,255,0.75)",
                textAlign: "center",
              }}
            >
              {addr1}
              <br />
              {addr2}
            </Text>
            <Section style={{ backgroundColor: accentBar, height: "4px", lineHeight: "4px", marginTop: "14px" }}>
              <Text style={{ margin: 0, fontSize: "1px", lineHeight: "4px", color: accentBar }}>
                &nbsp;
              </Text>
            </Section>
          </Section>
        );
      }

      return (
        <Section style={{ backgroundColor: "#0B1A3D", padding: "16px 18px" }}>
          <Row>
            <Column style={{ width: "48%", verticalAlign: "middle", paddingRight: "10px" }}>
              <Img
                src={logo}
                width="96"
                alt="ASLI"
                style={{ display: "block", border: 0, maxWidth: "100%", height: "auto" }}
              />
              <Text
                style={{
                  margin: "6px 0 0 0",
                  fontSize: "8px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#ffffff",
                }}
              >
                {tagline}
              </Text>
            </Column>
            <Column style={{ width: "3px", verticalAlign: "middle" }}>
              <div
                style={{
                  width: "3px",
                  height: "40px",
                  backgroundColor: accentBar,
                }}
              />
            </Column>
            <Column style={{ width: "48%", verticalAlign: "middle", paddingLeft: "10px" }}>
              <Text
                style={{
                  margin: 0,
                  fontSize: "10px",
                  lineHeight: "15px",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#ffffff",
                }}
              >
                {addr1}
                <br />
                {addr2}
              </Text>
            </Column>
          </Row>
        </Section>
      );
    }
    case "html": {
      const html = merge(p.html || "", nombre, preferPublic);
      return <Section style={{ margin: 0 }}>{parse(html)}</Section>;
    }
    default:
      return null;
  }
}

export type ComposerEmailProps = {
  doc: StudioDocument;
  nombre: string;
  preferPublicAssets?: boolean;
  /** Envuelve bloques con data-studio-block-id para selección en preview. */
  interactive?: boolean;
};

function BlockShell({
  id,
  interactive,
  children,
}: {
  id: string;
  interactive?: boolean;
  children: React.ReactNode;
}) {
  if (!interactive) return <>{children}</>;
  return (
    <div data-studio-block-id={id} style={{ cursor: "pointer" }}>
      {children}
    </div>
  );
}

export function ComposerEmail({
  doc,
  nombre,
  preferPublicAssets = false,
  interactive = false,
}: ComposerEmailProps) {
  const headers = doc.blocks.filter((b) => b.kind === "headerAsli");
  const footers = doc.blocks.filter((b) => b.kind === "footerAsli");
  const bodyBlocks = doc.blocks.filter(
    (b) => b.kind !== "headerAsli" && b.kind !== "footerAsli",
  );

  return (
    <Html lang="es" dir="ltr">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: ASLI_TAILWIND.theme,
        }}
      >
        <Head />
        <Preview>{doc.previewText || "Informativo ASLI"}</Preview>
        <Body
          style={{
            margin: 0,
            padding: "16px 0",
            backgroundColor: "#f1f5f9",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
            color: "#18181b",
          }}
        >
          <Container
            style={{
              margin: "0 auto",
              width: "100%",
              maxWidth: "650px",
              backgroundColor: "#ffffff",
              overflow: "hidden",
            }}
          >
            {headers.map((block) => (
              <BlockShell key={block.id} id={block.id} interactive={interactive}>
                <BlockView
                  block={block}
                  nombre={nombre}
                  preferPublic={preferPublicAssets}
                />
              </BlockShell>
            ))}
            <Section style={{ padding: "20px 18px 24px 18px" }}>
              {bodyBlocks.map((block) => (
                <BlockShell key={block.id} id={block.id} interactive={interactive}>
                  <BlockView
                    block={block}
                    nombre={nombre}
                    preferPublic={preferPublicAssets}
                  />
                </BlockShell>
              ))}
            </Section>
            {footers.map((block) => (
              <BlockShell key={block.id} id={block.id} interactive={interactive}>
                <BlockView
                  block={block}
                  nombre={nombre}
                  preferPublic={preferPublicAssets}
                />
              </BlockShell>
            ))}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default ComposerEmail;
