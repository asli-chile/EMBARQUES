import { useEffect, useMemo, useState } from "react";
import { sileo } from "sileo";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { sendEmail } from "@/lib/email/sendEmail";
import {
  createBlock,
  createDefaultStudioDocument,
  createExportacionesVietnamDocument,
  STUDIO_PRESETS,
} from "@/emails/studio/presets";
import type { BlockKind, StudioBlock, StudioDocument } from "@/emails/studio/types";
import {
  nombreDesdeEmail,
  parseDestinatarios,
  primerNombre,
  renderStudioHtml,
  type Destinatario,
} from "@/lib/email/informativos/render";
import { modulePageBg } from "@/lib/ui/moduleStyles";

const input =
  "w-full rounded border border-brand-blue/20 bg-white px-2 py-1 text-[12px] text-brand-blue placeholder:text-brand-blue/35 focus:outline-none focus:ring-1 focus:ring-brand-blue/30";
const label =
  "mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-brand-blue/55";
const btn =
  "inline-flex items-center gap-1 rounded border border-brand-blue/20 bg-white px-2 py-1 text-[11px] font-semibold text-brand-blue/80 hover:bg-brand-blue/5 disabled:opacity-40";
const btnPrimary =
  "inline-flex items-center gap-1 rounded bg-brand-blue px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40";

function propFields(
  block: StudioBlock,
): { key: string; label: string; multiline?: boolean }[] {
  switch (block.kind) {
    case "greeting":
      return [{ key: "template", label: "Plantilla" }];
    case "heading":
      return [
        { key: "text", label: "Texto" },
        { key: "as", label: "Tag (h1|h2|h3)" },
      ];
    case "text":
      return [{ key: "text", label: "Texto (**negrita**)", multiline: true }];
    case "button":
      return [
        { key: "label", label: "Etiqueta" },
        { key: "href", label: "URL" },
      ];
    case "image":
      return [
        { key: "src", label: "URL imagen" },
        { key: "alt", label: "Alt" },
        { key: "width", label: "Ancho px" },
      ];
    case "dataRow":
      return [
        { key: "label", label: "Etiqueta" },
        { key: "value", label: "Valor", multiline: true },
      ];
    case "headerAsli":
      return [{ key: "logoUrl", label: "URL logo (vacío = ASLI)" }];
    case "footerAsli":
      return [{ key: "logoUrl", label: "URL logo (vacío = ASLI)" }];
    case "html":
      return [{ key: "html", label: "HTML + class Tailwind", multiline: true }];
    default:
      return [];
  }
}

export function InformativosContent() {
  const { user, profile, isLoading } = useAuth();
  const [doc, setDoc] = useState<StudioDocument>(() => createDefaultStudioDocument());
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const d = createDefaultStudioDocument();
    return d.blocks[0]?.id ?? null;
  });
  const [previewNombre, setPreviewNombre] = useState("Carmen");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [destRaw, setDestRaw] = useState("");
  const [resolved, setResolved] = useState<Destinatario[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const selected = doc.blocks.find((b) => b.id === selectedId) ?? null;
  const parsed = useMemo(() => parseDestinatarios(destRaw), [destRaw]);
  const selectedList = resolved.filter((d) => picked.has(d.email));

  useEffect(() => {
    let dead = false;
    setPreviewError(null);
    void renderStudioHtml(doc, previewNombre)
      .then((html) => {
        if (!dead) setPreviewHtml(html);
      })
      .catch((e) => {
        console.error(e);
        if (!dead) {
          setPreviewError(e instanceof Error ? e.message : "Error al renderizar");
        }
      });
    return () => {
      dead = true;
    };
  }, [doc, previewNombre]);

  useEffect(() => {
    let dead = false;
    void (async () => {
      if (!parsed.destinatarios.length) {
        setResolved([]);
        setPicked(new Set());
        return;
      }
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("usuarios")
          .select("email, nombre")
          .in(
            "email",
            parsed.destinatarios.map((d) => d.email),
          );
        const map = new Map(
          (data ?? []).map((r) => [
            String(r.email).toLowerCase(),
            primerNombre(String(r.nombre ?? "")),
          ]),
        );
        if (dead) return;
        const next = parsed.destinatarios.map((d) => ({
          email: d.email,
          nombre: map.get(d.email) || d.nombre,
        }));
        setResolved(next);
        setPicked(new Set(next.map((d) => d.email)));
      } catch {
        if (!dead) {
          setResolved(parsed.destinatarios);
          setPicked(new Set(parsed.destinatarios.map((d) => d.email)));
        }
      }
    })();
    return () => {
      dead = true;
    };
  }, [destRaw]);

  const addPreset = (kind: BlockKind) => {
    const block = createBlock(kind);
    setDoc((d) => ({ ...d, blocks: [...d.blocks, block] }));
    setSelectedId(block.id);
  };

  const updateProps = (id: string, key: string, value: string) => {
    setDoc((d) => ({
      ...d,
      blocks: d.blocks.map((b) =>
        b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b,
      ),
    }));
  };

  const move = (id: string, dir: -1 | 1) => {
    setDoc((d) => {
      const i = d.blocks.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.blocks.length) return d;
      const blocks = [...d.blocks];
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...d, blocks };
    });
  };

  const remove = (id: string) => {
    setDoc((d) => {
      const blocks = d.blocks.filter((b) => b.id !== id);
      return { ...d, blocks };
    });
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const sendList = async (list: Destinatario[]) => {
    if (!doc.asunto.trim()) {
      sileo.error({ title: "Falta asunto" });
      return;
    }
    if (!list.length) {
      sileo.error({ title: "Sin destinatarios" });
      return;
    }
    setSending(true);
    let ok = 0;
    let fail = 0;
    let lastError = "";
    for (const dest of list) {
      try {
        const html = await renderStudioHtml(doc, dest.nombre, {
          preferPublicAssets: true,
        });
        const r = await sendEmail({
          to: dest.email,
          subject: doc.asunto,
          body: html,
          sendFrom: "informaciones",
          skipSignature: true,
        });
        if (r.success) ok += 1;
        else {
          fail += 1;
          lastError = r.error ?? "";
        }
      } catch (e) {
        fail += 1;
        lastError = e instanceof Error ? e.message : "Error";
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    setSending(false);
    if (fail === 0) sileo.success({ title: `Enviado ×${ok}` });
    else sileo.error({ title: `Ok ${ok} / fallos ${fail}`, description: lastError });
  };

  if (isLoading) {
    return (
      <main className={`flex flex-1 ${modulePageBg} p-3 text-[12px] text-brand-blue/60`}>
        Cargando…
      </main>
    );
  }

  return (
    <main className={`relative flex h-full min-h-0 flex-1 flex-col ${modulePageBg}`}>
      <header className="z-10 flex flex-shrink-0 items-center gap-2 border-b border-brand-blue/10 bg-white px-3 py-1.5">
        <h1 className="text-[13px] font-bold text-brand-blue">Informativos</h1>
        <span className="hidden text-[10px] text-brand-blue/40 sm:inline">
          bloques · Tailwind · React Email
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className={btn}
            title="Cargar plantilla Vietnam / Systems Approach"
            onClick={() => {
              const next = createExportacionesVietnamDocument();
              setDoc(next);
              setSelectedId(next.blocks[0]?.id ?? null);
              setSendOpen(false);
            }}
          >
            Plantilla Vietnam
          </button>
          <button
            type="button"
            className={!sendOpen ? btnPrimary : btn}
            onClick={() => setSendOpen(false)}
          >
            Componer
          </button>
          <button
            type="button"
            className={sendOpen ? btnPrimary : btn}
            onClick={() => setSendOpen(true)}
          >
            Enviar
          </button>
        </div>
      </header>

      {/* Estudio siempre montado (no se destruye al abrir Enviar) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-[150px_200px_minmax(220px,280px)_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="border-b border-brand-blue/10 bg-white p-2 lg:min-h-0 lg:overflow-auto lg:border-b-0 lg:border-r">
          <p className={label}>Presets</p>
          <div className="flex flex-col gap-0.5">
            {STUDIO_PRESETS.map((p) => (
              <button
                key={p.kind}
                type="button"
                title={p.description}
                className="rounded px-1.5 py-1 text-left text-[11px] font-medium text-brand-blue/85 hover:bg-brand-blue/8"
                onClick={() => addPreset(p.kind)}
              >
                + {p.label}
              </button>
            ))}
          </div>
        </aside>

        <aside className="border-b border-brand-blue/10 bg-[#f7f9fc] p-2 lg:min-h-0 lg:overflow-auto lg:border-b-0 lg:border-r">
          <div className="mb-2 space-y-1">
            <label className={label}>Asunto</label>
            <input
              className={input}
              value={doc.asunto}
              onChange={(e) => setDoc({ ...doc, asunto: e.target.value })}
            />
            <label className={label}>Preview inbox</label>
            <input
              className={input}
              value={doc.previewText}
              onChange={(e) => setDoc({ ...doc, previewText: e.target.value })}
            />
          </div>
          <p className={label}>Bloques ({doc.blocks.length})</p>
          <ul className="space-y-0.5">
            {doc.blocks.map((b) => {
              const meta = STUDIO_PRESETS.find((x) => x.kind === b.kind);
              const active = b.id === selectedId;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    className={`w-full rounded px-1.5 py-1 text-left text-[11px] font-medium ${
                      active
                        ? "bg-brand-blue text-white"
                        : "text-brand-blue/80 hover:bg-brand-blue/8"
                    }`}
                    onClick={() => setSelectedId(b.id)}
                  >
                    {meta?.label ?? b.kind}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="border-b border-brand-blue/10 bg-white p-2 lg:min-h-0 lg:overflow-auto lg:border-b-0 lg:border-r">
          {!selected ? (
            <p className="text-[11px] text-brand-blue/45">
              Elige un bloque a la izquierda o agrega un preset.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <p className="truncate text-[11px] font-bold text-brand-blue">
                  {STUDIO_PRESETS.find((x) => x.kind === selected.kind)?.label}
                </p>
                <div className="ml-auto flex shrink-0 gap-0.5">
                  <button type="button" className={btn} onClick={() => move(selected.id, -1)}>
                    ↑
                  </button>
                  <button type="button" className={btn} onClick={() => move(selected.id, 1)}>
                    ↓
                  </button>
                  <button type="button" className={btn} onClick={() => remove(selected.id)}>
                    ✕
                  </button>
                </div>
              </div>
              {propFields(selected).map((f) => (
                <div key={f.key}>
                  <label className={label}>{f.label}</label>
                  {f.multiline ? (
                    <textarea
                      className={input + " min-h-[100px] font-mono text-[11px] leading-4"}
                      value={selected.props[f.key] ?? ""}
                      onChange={(e) => updateProps(selected.id, f.key, e.target.value)}
                      spellCheck={selected.kind !== "html"}
                    />
                  ) : (
                    <input
                      className={input}
                      value={selected.props[f.key] ?? ""}
                      onChange={(e) => updateProps(selected.id, f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
              {selected.kind === "html" ? (
                <p className="text-[10px] leading-4 text-brand-blue/50">
                  HTML con class Tailwind, <code className="text-[10px]">{"{{nombre}}"}</code> y{" "}
                  <code className="text-[10px]">{"{{saludo}}"}</code> (Estimado/Estimada).
                </p>
              ) : null}
            </div>
          )}
        </section>

        <section className="flex min-h-[360px] flex-col bg-[#e8eef5] lg:min-h-0">
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-brand-blue/10 bg-white px-2 py-1">
            <span className="text-[10px] font-semibold text-brand-blue/55">Preview</span>
            <input
              className={input + " max-w-[140px]"}
              value={previewNombre}
              onChange={(e) => setPreviewNombre(e.target.value)}
              aria-label="Nombre preview"
            />
            {previewError ? (
              <span className="truncate text-[10px] text-red-600">{previewError}</span>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {previewHtml ? (
              <iframe
                title="preview"
                className="h-full min-h-[400px] w-full rounded border-0 bg-white shadow-sm"
                srcDoc={previewHtml}
              />
            ) : (
              <p className="p-4 text-[11px] text-brand-blue/50">Generando preview…</p>
            )}
          </div>
        </section>
      </div>

      {/* Panel Enviar: overlay lateral, no reemplaza el estudio */}
      {sendOpen ? (
        <div className="absolute inset-0 z-20 flex justify-end bg-brand-blue/20 backdrop-blur-[1px]">
          <div
            className="flex h-full w-full max-w-md flex-col border-l border-brand-blue/15 bg-white shadow-xl"
            role="dialog"
            aria-label="Enviar informativo"
          >
            <div className="flex items-center gap-2 border-b border-brand-blue/10 px-3 py-2">
              <p className="text-[12px] font-bold text-brand-blue">Enviar</p>
              <button
                type="button"
                className={btn + " ml-auto"}
                onClick={() => setSendOpen(false)}
              >
                Volver a componer
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
              <p className="text-[11px] text-brand-blue/60">
                Pega emails (uno por línea). Nombre desde ERP o del correo.
              </p>
              <textarea
                className={input + " min-h-[100px] font-mono"}
                value={destRaw}
                onChange={(e) => setDestRaw(e.target.value)}
                placeholder="persona@empresa.cl"
              />
              {parsed.errores.length > 0 ? (
                <p className="text-[10px] text-red-600">{parsed.errores.join(" · ")}</p>
              ) : null}
              {resolved.length > 0 ? (
                <ul className="max-h-56 overflow-auto rounded border border-brand-blue/15 text-[11px]">
                  {resolved.map((d) => (
                    <li
                      key={d.email}
                      className="flex items-center gap-2 border-b border-brand-blue/8 px-2 py-1 last:border-0"
                    >
                      <input
                        type="checkbox"
                        className="accent-[#11224E]"
                        checked={picked.has(d.email)}
                        onChange={() => {
                          setPicked((prev) => {
                            const n = new Set(prev);
                            if (n.has(d.email)) n.delete(d.email);
                            else n.add(d.email);
                            return n;
                          });
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-neutral-600">
                        {d.email}
                      </span>
                      <input
                        className={input + " w-28"}
                        value={d.nombre}
                        onChange={(e) => {
                          const nombre = e.target.value;
                          setResolved((prev) =>
                            prev.map((x) =>
                              x.email === d.email ? { ...x, nombre } : x,
                            ),
                          );
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex flex-shrink-0 gap-2 border-t border-brand-blue/10 p-3">
              <button
                type="button"
                className={btn}
                disabled={sending}
                onClick={() => {
                  const email = (profile?.email ?? user?.email ?? "").trim();
                  if (!email) {
                    sileo.error({ title: "Sin email de sesión" });
                    return;
                  }
                  void sendList([
                    {
                      email,
                      nombre:
                        previewNombre ||
                        primerNombre(profile?.nombre ?? "") ||
                        nombreDesdeEmail(email),
                    },
                  ]);
                }}
              >
                Prueba a mí
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={sending || selectedList.length === 0}
                onClick={() => {
                  if (confirm(`¿Enviar ${selectedList.length}?`)) {
                    void sendList(selectedList);
                  }
                }}
              >
                {sending ? "…" : `Enviar (${selectedList.length})`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
