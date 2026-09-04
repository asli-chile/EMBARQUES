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

  switch (block.kind) {
    case "headerAsli":
      return (
        <Section style={{ backgroundColor: "#002d69" }}>
          <Row>
            <Column style={{ padding: "18px 20px", verticalAlign: "middle" }}>
              <Img
                src={p.logoUrl || assets.logoWhite}
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
            </Column>
          </Row>
          <Section style={{ backgroundColor: "#C8102E", height: "3px", lineHeight: "3px" }}>
            <Text style={{ margin: 0, fontSize: "1px", lineHeight: "3px", color: "#C8102E" }}>
              &nbsp;
            </Text>
          </Section>
        </Section>
      );
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
            color: "#18181b",
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
            color: "#11224E",
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
            color: "#18181b",
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
    case "button":
      return (
        <Section style={{ margin: "20px 0", textAlign: align }}>
          <Button
            href={p.href || "https://asli.cl"}
            style={{
              backgroundColor: "#11224E",
              borderRadius: "4px",
              color: "#ffffff",
              display: "inline-block",
              fontSize: "13px",
              fontWeight: 600,
              padding: "10px 18px",
              textDecoration: "none",
            }}
          >
            {p.label || "Ver más"}
          </Button>
        </Section>
      );
    case "divider":
      return (
        <Hr
          style={{
            borderColor: "#E5E7EB",
            borderTop: "1px solid #E5E7EB",
            margin: "16px 0",
          }}
        />
      );
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
      const cellPad = iconSrc ? "8px 8px 8px 12px" : "8px 8px 8px 0";

      if (align !== "left") {
        return (
          <Section style={{ margin: 0 }}>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{
                borderCollapse: "collapse",
                width: "100%",
                borderTop: "1px solid #e2e8f0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <tbody>
                <tr>
                  <td
                    valign="middle"
                    style={{
                      padding: "8px 0",
                      verticalAlign: "middle",
                      textAlign: align,
                      fontSize: "13px",
                      lineHeight: "18px",
                      color: "#18181b",
                    }}
                  >
                    {iconSrc ? (
                      <Img
                        src={iconSrc}
                        width={28}
                        height={28}
                        alt=""
                        style={{
                          display: "inline-block",
                          border: 0,
                          width: "28px",
                          height: "28px",
                          verticalAlign: "middle",
                          marginRight: "8px",
                        }}
                      />
                    ) : null}
                    <Text
                      style={{
                        display: "inline",
                        margin: 0,
                        fontSize: "13px",
                        lineHeight: "18px",
                        fontWeight: 700,
                        color: "#002d69",
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
                        color: "#18181b",
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
        <Section style={{ margin: 0 }}>
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            style={{
              borderCollapse: "collapse",
              width: "100%",
              borderTop: "1px solid #e2e8f0",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <tbody>
              <tr>
                {iconSrc ? (
                  <td
                    width={40}
                    valign="middle"
                    style={{
                      width: "40px",
                      padding: "8px 10px 8px 0",
                      borderRight: "1px solid #e2e8f0",
                      verticalAlign: "middle",
                    }}
                  >
                    <Img
                      src={iconSrc}
                      width={32}
                      height={32}
                      alt=""
                      style={{
                        display: "block",
                        border: 0,
                        width: "32px",
                        height: "32px",
                        margin: "0 auto",
                      }}
                    />
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
                    color: "#002d69",
                    textAlign: "left",
                  }}
                >
                  {labelText}
                </td>
                <td
                  valign="middle"
                  style={{
                    padding: "8px 0",
                    verticalAlign: "middle",
                    fontSize: "13px",
                    lineHeight: "18px",
                    color: "#18181b",
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
    case "footerAsli":
      return (
        <Section style={{ backgroundColor: "#0B1A3D", padding: "16px 18px" }}>
          <Row>
            <Column style={{ width: "48%", verticalAlign: "middle", paddingRight: "10px" }}>
              <Img
                src={p.logoUrl || assets.logoWhite}
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
                {p.tagline || "Logística y Comercio Exterior"}
              </Text>
            </Column>
            <Column style={{ width: "3px", verticalAlign: "middle" }}>
              <div style={{ width: "3px", height: "40px", backgroundColor: "#C8102E" }} />
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
                {p.address1 || "Longitudinal Sur Km 186,"}
                <br />
                {p.address2 || "Curicó, Chile"}
              </Text>
            </Column>
          </Row>
        </Section>
      );
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
