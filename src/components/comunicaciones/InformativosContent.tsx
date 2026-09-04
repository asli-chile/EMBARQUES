import { useCallback, useEffect, useMemo, useState } from "react";
import { sileo } from "sileo";
import { useAuth } from "@/lib/auth/AuthContext";
import { sendEmail } from "@/lib/email/sendEmail";
import {
  contactosToDestinatarios,
  importContactosToGrupo,
  listAgendaCompleta,
  listContactosDeGrupos,
  listGrupos,
  lookupContactosByEmails,
  setContactoActivo,
  upsertContacto,
  type DestinatarioAgenda,
  type InformacionesContacto,
  type InformacionesGrupo,
} from "@/lib/email/informativos/agenda";
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

type Panel = "compose" | "send" | "agenda";

function propFields(
  block: StudioBlock,
): {
  key: string;
  label: string;
  multiline?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
}[] {
  switch (block.kind) {
    case "greeting":
      return [
        {
          key: "saludoMode",
          label: "Trato (Estimado / Estimada)",
          options: [
            { value: "auto", label: "Auto según el nombre del destinatario" },
            { value: "Estimado", label: "Forzar Estimado" },
            { value: "Estimada", label: "Forzar Estimada" },
          ],
          hint: "Con «Auto», {{saludo}} cambia por persona al enviar.",
        },
        {
          key: "template",
          label: "Plantilla del saludo",
          multiline: true,
          hint: "Ej: {{saludo}} {{nombre}},  —  o texto fijo: Estimados clientes,",
        },
      ];
    case "heading":
      return [
        { key: "text", label: "Texto del título", multiline: true },
        { key: "as", label: "Nivel (h1 | h2 | h3)" },
      ];
    case "text":
      return [
        {
          key: "text",
          label: "Texto del párrafo",
          multiline: true,
          hint: "**negrita**, {{nombre}}, {{saludo}}. Saltos de línea OK.",
        },
      ];
    case "button":
      return [
        { key: "label", label: "Texto del botón" },
        { key: "href", label: "URL del enlace" },
      ];
    case "image":
      return [
        { key: "src", label: "URL de la imagen" },
        { key: "alt", label: "Texto alternativo" },
        { key: "width", label: "Ancho (px)" },
      ];
    case "dataRow":
      return [
        {
          key: "icon",
          label: "Ícono (calendar | pin | product | document | cold | vacío)",
        },
        { key: "label", label: "Etiqueta (ej. DESTINO)" },
        { key: "value", label: "Valor", multiline: true },
      ];
    case "headerAsli":
      return [{ key: "logoUrl", label: "URL logo (vacío = logo ASLI)" }];
    case "footerAsli":
      return [
        { key: "logoUrl", label: "URL logo (vacío = logo ASLI)" },
        { key: "tagline", label: "Línea bajo el logo" },
        { key: "address1", label: "Dirección línea 1" },
        { key: "address2", label: "Dirección línea 2" },
      ];
    case "html":
      return [
        {
          key: "html",
          label: "HTML + class Tailwind",
          multiline: true,
          hint: "{{nombre}} y {{saludo}} disponibles",
        },
      ];
    case "divider":
      return [];
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
  const [panel, setPanel] = useState<Panel>("compose");

  const [destRaw, setDestRaw] = useState("");
  const [resolved, setResolved] = useState<DestinatarioAgenda[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [grupos, setGrupos] = useState<InformacionesGrupo[]>([]);
  const [gruposSeleccionados, setGruposSeleccionados] = useState<Set<string>>(
    new Set(),
  );
  const [grupoLoading, setGrupoLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [agenda, setAgenda] = useState<InformacionesContacto[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaFiltroGrupo, setAgendaFiltroGrupo] = useState<string>("");
  const [importRaw, setImportRaw] = useState("");
  const [importGrupo, setImportGrupo] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmpresa, setNewEmpresa] = useState("");
  const [newGrupo, setNewGrupo] = useState("");
  const [agendaBusy, setAgendaBusy] = useState(false);

  const selected = doc.blocks.find((b) => b.id === selectedId) ?? null;
  const parsed = useMemo(() => parseDestinatarios(destRaw), [destRaw]);
  const selectedList = resolved.filter((d) => picked.has(d.email));
  const agendaVisible = useMemo(() => {
    if (!agendaFiltroGrupo) return agenda;
    return agenda.filter((c) => c.grupos?.includes(agendaFiltroGrupo));
  }, [agenda, agendaFiltroGrupo]);

  const reloadGrupos = useCallback(async () => {
    try {
      const rows = await listGrupos();
      setGrupos(rows);
      setImportGrupo((cur) => cur || rows[0]?.nombre || "");
      setNewGrupo((cur) => cur || rows[0]?.nombre || "");
    } catch (e) {
      console.error(e);
    }
  }, []);

  const reloadAgenda = useCallback(async () => {
    setAgendaLoading(true);
    try {
      const rows = await listAgendaCompleta();
      setAgenda(rows);
    } catch (e) {
      console.error(e);
      sileo.error({
        title: "No se pudo cargar la agenda",
        description: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setAgendaLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadGrupos();
  }, [reloadGrupos]);

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
    if (panel === "agenda" || panel === "send") {
      void reloadGrupos();
      if (panel === "agenda") void reloadAgenda();
    }
  }, [panel, reloadAgenda, reloadGrupos]);

  /** Destinatarios: grupos marcados + pegado; nombres solo desde agenda. */
  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        const byEmail = new Map<string, DestinatarioAgenda>();
        const seleccion = [...gruposSeleccionados];

        if (seleccion.length) {
          setGrupoLoading(true);
          const contactos = await listContactosDeGrupos(seleccion);
          for (const d of contactosToDestinatarios(contactos)) {
            byEmail.set(d.email, d);
          }
        }

        if (parsed.destinatarios.length) {
          const map = await lookupContactosByEmails(
            parsed.destinatarios.map((d) => d.email),
          );
          for (const d of parsed.destinatarios) {
            const found = map.get(d.email);
            byEmail.set(d.email, {
              email: d.email,
              nombre: found
                ? primerNombre(found.nombre)
                : d.nombre || nombreDesdeEmail(d.email),
              empresa: found?.empresa ?? null,
              contactoId: found?.id,
            });
          }
        }

        if (dead) return;
        const next = [...byEmail.values()].sort((a, b) =>
          a.email.localeCompare(b.email),
        );
        setResolved(next);
        setPicked(new Set(next.map((d) => d.email)));
      } catch (e) {
        console.error(e);
        if (!dead) {
          const fallback = parsed.destinatarios.map((d) => ({
            email: d.email,
            nombre: d.nombre,
          }));
          setResolved(fallback);
          setPicked(new Set(fallback.map((d) => d.email)));
        }
      } finally {
        if (!dead) setGrupoLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [destRaw, gruposSeleccionados]);

  const addPreset = (kind: BlockKind) => {
    const block = createBlock(kind);
    setDoc((d) => {
      if (!selectedId) {
        return { ...d, blocks: [...d.blocks, block] };
      }
      const i = d.blocks.findIndex((b) => b.id === selectedId);
      if (i < 0) return { ...d, blocks: [...d.blocks, block] };
      const blocks = [...d.blocks];
      blocks.splice(i + 1, 0, block);
      return { ...d, blocks };
    });
    setSelectedId(block.id);
  };

  const duplicateBlock = (id: string) => {
    setDoc((d) => {
      const i = d.blocks.findIndex((b) => b.id === id);
      if (i < 0) return d;
      const copy = {
        ...d.blocks[i],
        id: `b_${Math.random().toString(36).slice(2, 10)}`,
        props: { ...d.blocks[i].props },
      };
      const blocks = [...d.blocks];
      blocks.splice(i + 1, 0, copy);
      setSelectedId(copy.id);
      return { ...d, blocks };
    });
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

  const sendList = async (list: DestinatarioAgenda[]) => {
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

  const onImport = async () => {
    if (!importRaw.trim()) {
      sileo.error({ title: "Pega la lista primero" });
      return;
    }
    const grupo = importGrupo.trim() || grupos[0]?.nombre;
    if (!grupo) {
      sileo.error({ title: "Elige un grupo" });
      return;
    }
    setAgendaBusy(true);
    try {
      const r = await importContactosToGrupo(importRaw, grupo);
      await reloadGrupos();
      await reloadAgenda();
      setImportRaw("");
      if (r.errores.length) {
        sileo.error({
          title: `Importados ${r.ok}`,
          description: r.errores.slice(0, 4).join(" · "),
        });
      } else {
        sileo.success({ title: `Importados ${r.ok} contactos` });
      }
    } catch (e) {
      sileo.error({
        title: "Error al importar",
        description: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setAgendaBusy(false);
    }
  };

  const onAddOne = async () => {
    const grupo = newGrupo.trim() || grupos[0]?.nombre;
    if (!grupo) {
      sileo.error({ title: "Elige un grupo" });
      return;
    }
    setAgendaBusy(true);
    try {
      await upsertContacto({
        nombre: newNombre,
        email: newEmail,
        empresa: newEmpresa || null,
        grupoNombre: grupo,
      });
      setNewNombre("");
      setNewEmail("");
      setNewEmpresa("");
      await reloadGrupos();
      await reloadAgenda();
      sileo.success({ title: "Contacto guardado" });
    } catch (e) {
      sileo.error({
        title: "No se pudo guardar",
        description: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setAgendaBusy(false);
    }
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
          bloques · agenda propia · React Email
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
              setPanel("compose");
            }}
          >
            Plantilla Vietnam
          </button>
          <button
            type="button"
            className={panel === "compose" ? btnPrimary : btn}
            onClick={() => setPanel("compose")}
          >
            Componer
          </button>
          <button
            type="button"
            className={panel === "agenda" ? btnPrimary : btn}
            onClick={() => setPanel("agenda")}
          >
            Agenda
          </button>
          <button
            type="button"
            className={panel === "send" ? btnPrimary : btn}
            onClick={() => setPanel("send")}
          >
            Enviar
          </button>
        </div>
      </header>

      <div
        className={`grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-[minmax(220px,260px)_minmax(260px,320px)_minmax(0,1fr)] lg:overflow-hidden ${
          panel !== "compose" ? "pointer-events-none opacity-40" : ""
        }`}
      >
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

          <p className={label}>Agregar componente</p>
          <div className="mb-3 grid grid-cols-2 gap-0.5">
            {STUDIO_PRESETS.map((p) => (
              <button
                key={p.kind}
                type="button"
                title={p.description}
                className="rounded border border-brand-blue/15 bg-white px-1.5 py-1 text-left text-[10px] font-semibold text-brand-blue/85 hover:bg-brand-blue/8"
                onClick={() => addPreset(p.kind)}
              >
                + {p.label}
              </button>
            ))}
          </div>

          <p className={label}>Bloques ({doc.blocks.length})</p>
          <ul className="space-y-0.5">
            {doc.blocks.map((b, idx) => {
              const meta = STUDIO_PRESETS.find((x) => x.kind === b.kind);
              const active = b.id === selectedId;
              const summary =
                b.props.label ||
                b.props.text?.slice(0, 28) ||
                b.props.template?.slice(0, 28) ||
                "";
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
                    <span className="opacity-50">{idx + 1}. </span>
                    {meta?.label ?? b.kind}
                    {summary ? (
                      <span
                        className={`mt-0.5 block truncate text-[10px] font-normal ${
                          active ? "text-white/70" : "text-brand-blue/45"
                        }`}
                      >
                        {summary}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="border-b border-brand-blue/10 bg-white p-2 lg:min-h-0 lg:overflow-auto lg:border-b-0 lg:border-r">
          {!selected ? (
            <p className="text-[11px] text-brand-blue/45">
              Elige un bloque o agrega un componente a la izquierda.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <p className="truncate text-[11px] font-bold text-brand-blue">
                  {STUDIO_PRESETS.find((x) => x.kind === selected.kind)?.label}
                </p>
                <div className="ml-auto flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    className={btn}
                    title="Duplicar"
                    onClick={() => duplicateBlock(selected.id)}
                  >
                    Dup
                  </button>
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
              <p className="text-[10px] text-brand-blue/45">
                {STUDIO_PRESETS.find((x) => x.kind === selected.kind)?.description}
              </p>
              {propFields(selected).length === 0 ? (
                <p className="text-[11px] text-brand-blue/50">
                  Este bloque no tiene campos (solo estructura visual).
                </p>
              ) : (
                propFields(selected).map((f) => (
                  <div key={f.key}>
                    <label className={label}>{f.label}</label>
                    {f.options ? (
                      <select
                        className={input}
                        value={selected.props[f.key] || f.options[0]?.value || ""}
                        onChange={(e) => updateProps(selected.id, f.key, e.target.value)}
                      >
                        {f.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : f.multiline ? (
                      <textarea
                        className={input + " min-h-[120px] font-mono text-[11px] leading-4"}
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
                    {f.hint ? (
                      <p className="mt-0.5 text-[10px] leading-4 text-brand-blue/45">{f.hint}</p>
                    ) : null}
                  </div>
                ))
              )}
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

      {panel === "send" ? (
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
                onClick={() => setPanel("compose")}
              >
                Volver
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
              <div className="space-y-1 rounded border border-brand-blue/15 bg-[#f7f9fc] p-2">
                <div className="flex items-center gap-2">
                  <p className={label + " mb-0"}>Grupos</p>
                  {grupoLoading ? (
                    <span className="text-[10px] text-brand-blue/50">…</span>
                  ) : null}
                </div>
                {grupos.length === 0 ? (
                  <p className="text-[11px] text-brand-blue/45">Sin grupos cargados.</p>
                ) : (
                  <ul className="space-y-1">
                    {grupos.map((g) => (
                      <li key={g.id}>
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-brand-blue">
                          <input
                            type="checkbox"
                            className="accent-[#11224E]"
                            checked={gruposSeleccionados.has(g.nombre)}
                            onChange={() => {
                              setGruposSeleccionados((prev) => {
                                const n = new Set(prev);
                                if (n.has(g.nombre)) n.delete(g.nombre);
                                else n.add(g.nombre);
                                return n;
                              });
                            }}
                          />
                          {g.nombre}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-[11px] text-brand-blue/60">
                Opcional: pega emails extra (uno por línea). Nombre desde la agenda o del correo —
                no usa Usuarios ERP.
              </p>
              <textarea
                className={input + " min-h-[80px] font-mono"}
                value={destRaw}
                onChange={(e) => setDestRaw(e.target.value)}
                placeholder="persona@empresa.cl"
              />
              {parsed.errores.length > 0 ? (
                <p className="text-[10px] text-red-600">{parsed.errores.join(" · ")}</p>
              ) : null}
              {resolved.length > 0 ? (
                <ul className="max-h-72 overflow-auto rounded border border-brand-blue/15 text-[11px]">
                  {resolved.map((d) => (
                    <li
                      key={d.email}
                      className="flex items-center gap-2 border-b border-brand-blue/8 px-2 py-1.5 last:border-0"
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
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-brand-blue/90">{d.email}</p>
                        {d.empresa ? (
                          <p className="truncate text-[10px] text-brand-blue/45">{d.empresa}</p>
                        ) : null}
                      </div>
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
              ) : (
                <p className="text-[11px] text-brand-blue/45">
                  Marca uno o más grupos, o pega emails.
                </p>
              )}
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

      {panel === "agenda" ? (
        <div className="absolute inset-0 z-20 flex justify-end bg-brand-blue/20 backdrop-blur-[1px]">
          <div
            className="flex h-full w-full max-w-lg flex-col border-l border-brand-blue/15 bg-white shadow-xl"
            role="dialog"
            aria-label="Agenda de informaciones"
          >
            <div className="flex items-center gap-2 border-b border-brand-blue/10 px-3 py-2">
              <div>
                <p className="text-[12px] font-bold text-brand-blue">Agenda</p>
                <p className="text-[10px] text-brand-blue/50">
                  {grupos.length} grupos · contactos separados
                </p>
              </div>
              <button
                type="button"
                className={btn + " ml-auto"}
                onClick={() => setPanel("compose")}
              >
                Volver
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
              <div className="space-y-1 rounded border border-brand-blue/12 p-2">
                <p className={label}>Alta rápida</p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <input
                    className={input}
                    placeholder="Nombre"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                  />
                  <input
                    className={input}
                    placeholder="email@empresa.cl"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <input
                    className={input}
                    placeholder="Empresa"
                    value={newEmpresa}
                    onChange={(e) => setNewEmpresa(e.target.value)}
                  />
                  <select
                    className={input}
                    value={newGrupo}
                    onChange={(e) => setNewGrupo(e.target.value)}
                  >
                    {grupos.map((g) => (
                      <option key={g.id} value={g.nombre}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={
                    agendaBusy || !newNombre.trim() || !newEmail.trim() || !newGrupo
                  }
                  onClick={() => void onAddOne()}
                >
                  Guardar en grupo
                </button>
              </div>

              <div className="space-y-1 rounded border border-brand-blue/12 p-2">
                <p className={label}>Pegar lista</p>
                <p className="text-[10px] text-brand-blue/50">
                  Una por línea: <code>nombre;email;empresa</code> o con 4to campo grupo
                </p>
                <select
                  className={input}
                  value={importGrupo}
                  onChange={(e) => setImportGrupo(e.target.value)}
                >
                  {grupos.map((g) => (
                    <option key={g.id} value={g.nombre}>
                      Importar a: {g.nombre}
                    </option>
                  ))}
                </select>
                <textarea
                  className={input + " min-h-[100px] font-mono text-[11px]"}
                  value={importRaw}
                  onChange={(e) => setImportRaw(e.target.value)}
                  placeholder={"Carmen Pérez;carmen@fruta.cl;Fruta Sur"}
                />
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={agendaBusy || !importRaw.trim() || !importGrupo}
                  onClick={() => void onImport()}
                >
                  Importar
                </button>
              </div>

              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className={label + " mb-0"}>
                    Contactos ({agendaVisible.length}
                    {agendaFiltroGrupo ? ` · ${agendaFiltroGrupo}` : ""})
                  </p>
                  <select
                    className={input + " w-auto max-w-[220px]"}
                    value={agendaFiltroGrupo}
                    onChange={(e) => setAgendaFiltroGrupo(e.target.value)}
                  >
                    <option value="">Todos los grupos</option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.nombre}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={btn}
                    disabled={agendaLoading}
                    onClick={() => void reloadAgenda()}
                  >
                    Recargar
                  </button>
                </div>
                {agendaLoading ? (
                  <p className="text-[11px] text-brand-blue/45">Cargando…</p>
                ) : agendaVisible.length === 0 ? (
                  <p className="text-[11px] text-brand-blue/45">Sin contactos en este filtro.</p>
                ) : (
                  <ul className="max-h-[50vh] overflow-auto rounded border border-brand-blue/15 text-[11px]">
                    {agendaVisible.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-start gap-2 border-b border-brand-blue/8 px-2 py-1.5 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-brand-blue">{c.nombre}</p>
                          <p className="truncate text-neutral-600">{c.email}</p>
                          {c.empresa ? (
                            <p className="truncate text-[10px] text-brand-blue/45">
                              {c.empresa}
                            </p>
                          ) : null}
                          {c.grupos?.length ? (
                            <p className="truncate text-[10px] text-brand-blue/55">
                              {c.grupos.join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className={btn}
                          title="Desactivar (no borra)"
                          onClick={() => {
                            void (async () => {
                              try {
                                await setContactoActivo(c.id, false);
                                await reloadAgenda();
                              } catch (e) {
                                sileo.error({
                                  title: "No se pudo desactivar",
                                  description:
                                    e instanceof Error ? e.message : "Error",
                                });
                              }
                            })();
                          }}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
