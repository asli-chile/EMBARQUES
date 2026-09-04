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
import { emailAssetUrls, resolveEmailAssetTokens } from "@/lib/email/assets";
import { mergePlantilla, saludoDesdeNombre } from "@/lib/email/informativos/saludo";
import { ASLI_TAILWIND, type StudioBlock, type StudioDocument } from "./types";

function boldParts(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={i}>{m[1]}</strong>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function merge(text: string, nombre: string, preferPublic = false): string {
  return resolveEmailAssetTokens(
    mergePlantilla(text, {
      nombre,
      saludo: saludoDesdeNombre(nombre),
    }),
    preferPublic,
  );
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
      const saludo = saludoDesdeNombre(nombre);
      const raw = merge(p.template || "{{saludo}} {{nombre}},", nombre, preferPublic);
      const text = raw.replace(/^(Estimad[oa])\b/i, saludo);
      return (
        <Text
          style={{
            margin: "0 0 12px 0",
            fontSize: "14px",
            lineHeight: "22px",
            color: "#18181b",
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
          }}
        >
          {merge(p.text || "", nombre, preferPublic)}
        </Heading>
      );
    case "text":
      return (
        <Text
          style={{
            margin: "16px 0 0 0",
            fontSize: "14px",
            lineHeight: "22px",
            color: "#18181b",
          }}
        >
          {boldParts(merge(p.text || "", nombre, preferPublic))}
        </Text>
      );
    case "button":
      return (
        <Section style={{ margin: "20px 0", textAlign: "center" }}>
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
        <Section style={{ margin: "0 0 16px 0" }}>
          <Img
            src={p.src || assets.logo}
            alt={p.alt || ""}
            width={Number(p.width) || 160}
            style={{
              display: "block",
              margin: "0 auto",
              border: 0,
              maxWidth: "100%",
              height: "auto",
            }}
          />
        </Section>
      );
    case "dataRow":
      return (
        <Section
          style={{
            borderBottom: "1px solid #E2E8F0",
            margin: 0,
            padding: "10px 0",
          }}
        >
          <Text style={{ margin: 0, fontSize: "15px", lineHeight: "22px", color: "#18181b" }}>
            <span style={{ fontWeight: 700, color: "#002d69", textTransform: "uppercase" }}>
              {(p.label || "DATO").replace(/:$/, "")}:
            </span>{" "}
            <span>{merge(p.value || "", nombre, preferPublic)}</span>
          </Text>
        </Section>
      );
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
                Logística y Comercio Exterior
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
                Longitudinal Sur Km 186,
                <br />
                Curicó, Chile
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
};

export function ComposerEmail({
  doc,
  nombre,
  preferPublicAssets = false,
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
              <BlockView
                key={block.id}
                block={block}
                nombre={nombre}
                preferPublic={preferPublicAssets}
              />
            ))}
            <Section style={{ padding: "20px 18px 24px 18px" }}>
              {bodyBlocks.map((block) => (
                <BlockView
                  key={block.id}
                  block={block}
                  nombre={nombre}
                  preferPublic={preferPublicAssets}
                />
              ))}
            </Section>
            {footers.map((block) => (
              <BlockView
                key={block.id}
                block={block}
                nombre={nombre}
                preferPublic={preferPublicAssets}
              />
            ))}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default ComposerEmail;
