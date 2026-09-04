import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
  createBlankStudioDocument,
  createDefaultStudioDocument,
  createExportacionesVietnamDocument,
  STUDIO_PRESETS,
} from "@/emails/studio/presets";
import type { BlockKind, StudioBlock, StudioDocument } from "@/emails/studio/types";
import {
  nombreDesdeEmail,
  parseDestinatarios,
  PREVIEW_SELECT_MSG,
  primerNombre,
  renderStudioHtml,
} from "@/lib/email/informativos/render";
import { modulePageBg } from "@/lib/ui/moduleStyles";
import { DATA_ROW_ICON_OPTIONS, dataRowIconSrc } from "@/lib/email/assets";

const input =
  "w-full rounded border border-brand-blue/20 bg-white px-2 py-1 text-[12px] text-brand-blue placeholder:text-brand-blue/35 focus:outline-none focus:ring-1 focus:ring-brand-blue/30";
const label =
  "mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-brand-blue/55";
const btn =
  "inline-flex items-center gap-1 rounded border border-brand-blue/20 bg-white px-2 py-1 text-[11px] font-semibold text-brand-blue/80 hover:bg-brand-blue/5 disabled:opacity-40";
const btnPrimary =
  "inline-flex items-center gap-1 rounded bg-brand-blue px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40";

type Panel = "compose" | "send" | "agenda";

function DataRowIconPicker({
  value,
  onChange,
  labelText,
  valueText,
}: {
  value: string;
  onChange: (v: string) => void;
  labelText: string;
  valueText: string;
}) {
  const current = (value || "").trim().toLowerCase();
  const previewSrc = dataRowIconSrc(current, false);
  const previewLabel = (labelText || "DATO").replace(/:$/, "");
  const previewValue = valueText || "…";

  return (
    <div className="space-y-1.5">
      <div className="grid max-h-52 grid-cols-4 gap-1 overflow-y-auto pr-0.5">
        {DATA_ROW_ICON_OPTIONS.map((opt) => {
          const src = opt.value ? dataRowIconSrc(opt.value, false) : "";
          const active = current === opt.value;
          return (
            <button
              key={opt.value || "none"}
              type="button"
              title={opt.label}
              onClick={() => onChange(opt.value)}
              className={`flex flex-col items-center gap-1 rounded border px-1 py-1.5 text-center transition-colors ${
                active
                  ? "border-brand-blue bg-brand-blue/10 ring-1 ring-brand-blue/30"
                  : "border-brand-blue/15 bg-white hover:bg-brand-blue/5"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded bg-[#f0f4f9]">
                {src ? (
                  <img src={src} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                ) : (
                  <span className="text-[10px] font-semibold text-brand-blue/40">—</span>
                )}
              </span>
              <span className="text-[9px] font-semibold leading-tight text-brand-blue/75">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="overflow-hidden rounded border border-brand-blue/15 bg-white">
        <p className="border-b border-brand-blue/10 bg-[#f7f9fc] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-blue/45">
          Vista previa fila
        </p>
        <div className="flex items-stretch text-[11px]">
          {previewSrc ? (
            <div className="flex w-10 shrink-0 items-center justify-center border-r border-slate-200 px-1 py-1.5">
              <img
                src={previewSrc}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </div>
          ) : null}
          <div className="w-[88px] shrink-0 border-r border-transparent px-2 py-1.5 font-bold text-[#002d69]">
            {previewLabel}:
          </div>
          <div className="min-w-0 flex-1 truncate px-2 py-1.5 text-brand-blue/90">
            {previewValue}
          </div>
        </div>
      </div>
    </div>
  );
}

const ALIGN_FIELD = {
  key: "align",
  label: "Alineación",
  options: [
    { value: "left", label: "Izquierda" },
    { value: "center", label: "Centro" },
    { value: "right", label: "Derecha" },
  ],
} as const;

function propFields(
  block: StudioBlock,
): {
  key: string;
  label: string;
  multiline?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  control?: "iconPicker" | "align";
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
        { ...ALIGN_FIELD, control: "align" },
      ];
    case "heading":
      return [
        { key: "text", label: "Texto del título", multiline: true },
        { key: "as", label: "Nivel (h1 | h2 | h3)" },
        { ...ALIGN_FIELD, control: "align" },
      ];
    case "text":
      return [
        {
          key: "text",
          label: "Texto del párrafo",
          multiline: true,
          hint: "**negrita**, {{nombre}}, {{saludo}}. Saltos de línea OK.",
        },
        { ...ALIGN_FIELD, control: "align" },
      ];
    case "button":
      return [
        { key: "label", label: "Texto del botón" },
        { key: "href", label: "URL del enlace" },
        { ...ALIGN_FIELD, control: "align" },
      ];
    case "image":
      return [
        { key: "src", label: "URL de la imagen" },
        { key: "alt", label: "Texto alternativo" },
        { key: "width", label: "Ancho (px)" },
        { ...ALIGN_FIELD, control: "align" },
      ];
    case "dataRow":
      return [
        {
          key: "icon",
          label: "Ícono",
          control: "iconPicker",
          hint: "Elige el ícono; abajo ves cómo queda la fila.",
        },
        { key: "label", label: "Etiqueta (ej. DESTINO)" },
        { key: "value", label: "Valor", multiline: true },
        { ...ALIGN_FIELD, control: "align" },
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

function AlignPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const current = (value || "left").toLowerCase();
  const opts = [
    { value: "left", label: "Izq.", title: "Izquierda" },
    { value: "center", label: "Centro", title: "Centrar" },
    { value: "right", label: "Der.", title: "Derecha" },
  ] as const;
  return (
    <div className="flex gap-1">
      {opts.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.title}
            className={`flex-1 rounded border px-2 py-1.5 text-[11px] font-semibold ${
              active
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-brand-blue/20 bg-white text-brand-blue/80 hover:bg-brand-blue/5"
            }`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const ALIGNABLE_KINDS = new Set<BlockKind>([
  "greeting",
  "heading",
  "text",
  "button",
  "image",
  "dataRow",
]);

export function InformativosContent() {
  const { user, profile, isLoading, isSuperadmin } = useAuth();
  const canSendInformativos = isSuperadmin;
  const [doc, setDoc] = useState<StudioDocument>(() => createDefaultStudioDocument());
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const d = createDefaultStudioDocument();
    return d.blocks[0]?.id ? [d.blocks[0].id] : [];
  });
  const [previewNombre, setPreviewNombre] = useState("Carmen");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("compose");
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

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

  const selectedId = selectedIds[selectedIds.length - 1] ?? null;
  const selected = doc.blocks.find((b) => b.id === selectedId) ?? null;
  const multiSelected = selectedIds.length > 1;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const alignableSelected = useMemo(
    () => doc.blocks.filter((b) => selectedSet.has(b.id) && ALIGNABLE_KINDS.has(b.kind)),
    [doc.blocks, selectedSet],
  );

  const selectOnly = useCallback((id: string | null) => {
    setSelectedIds(id ? [id] : []);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next;
      }
      return [...prev, id];
    });
  }, []);

  const selectRangeTo = useCallback(
    (id: string) => {
      const ids = doc.blocks.map((b) => b.id);
      const to = ids.indexOf(id);
      if (to < 0) {
        selectOnly(id);
        return;
      }
      const fromId = selectedIds[selectedIds.length - 1];
      const from = fromId ? ids.indexOf(fromId) : to;
      if (from < 0) {
        selectOnly(id);
        return;
      }
      const [a, b] = from <= to ? [from, to] : [to, from];
      setSelectedIds(ids.slice(a, b + 1));
    },
    [doc.blocks, selectedIds, selectOnly],
  );

  const onBlockNavClick = useCallback(
    (id: string, e: MouseEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        selectRangeTo(id);
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        toggleSelect(id);
        return;
      }
      selectOnly(id);
    },
    [selectOnly, selectRangeTo, toggleSelect],
  );

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
    void renderStudioHtml(doc, previewNombre, { interactive: true })
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
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== PREVIEW_SELECT_MSG || typeof data.id !== "string") return;
      selectOnly(data.id);
      setPanel("compose");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [selectOnly]);

  useEffect(() => {
    if (!selectedId) return;
    document
      .getElementById(`studio-block-nav-${selectedId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const syncPreviewSelection = useCallback(() => {
    const root = previewIframeRef.current?.contentDocument;
    if (!root) return;
    root.querySelectorAll("[data-studio-block-id]").forEach((el) => {
      const id = el.getAttribute("data-studio-block-id");
      el.classList.toggle("is-selected", !!id && selectedSet.has(id));
    });
  }, [selectedSet]);

  useEffect(() => {
    syncPreviewSelection();
  }, [syncPreviewSelection, previewHtml]);

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
    selectOnly(block.id);
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
      selectOnly(copy.id);
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

  const updateAlignMany = (ids: string[], align: string) => {
    const idSet = new Set(ids);
    setDoc((d) => ({
      ...d,
      blocks: d.blocks.map((b) =>
        idSet.has(b.id) && ALIGNABLE_KINDS.has(b.kind)
          ? { ...b, props: { ...b.props, align } }
          : b,
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
    setSelectedIds((cur) => cur.filter((x) => x !== id));
  };

  const removeSelected = () => {
    if (selectedIds.length === 0) return;
    const idSet = new Set(selectedIds);
    setDoc((d) => ({ ...d, blocks: d.blocks.filter((b) => !idSet.has(b.id)) }));
    setSelectedIds([]);
  };

  const sendList = async (list: DestinatarioAgenda[]) => {
    if (!canSendInformativos) {
      sileo.error({
        title: "Envío en desarrollo",
        description:
          "Por seguridad, solo Rodrigo Cáceres puede enviar estos correos. Puedes componer plantillas y usar la agenda con normalidad.",
      });
      return;
    }
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
              selectOnly(next.blocks[0]?.id ?? null);
              setPanel("compose");
            }}
          >
            Plantilla Vietnam
          </button>
          <button
            type="button"
            className={btn}
            title="Vaciar asunto, preview y bloques"
            onClick={() => {
              if (
                doc.blocks.length > 0 &&
                !window.confirm("¿Dejar la plantilla en blanco? Se perderán los bloques actuales.")
              ) {
                return;
              }
              const next = createBlankStudioDocument();
              setDoc(next);
              selectOnly(null);
              setPanel("compose");
            }}
          >
            En blanco
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

          <div className="mb-1 flex items-center gap-1">
            <p className={`${label} mb-0`}>Bloques ({doc.blocks.length})</p>
            <button
              type="button"
              className={btn + " !py-0.5 !text-[10px]"}
              title="Seleccionar todos"
              disabled={doc.blocks.length === 0}
              onClick={() => setSelectedIds(doc.blocks.map((b) => b.id))}
            >
              Todos
            </button>
            <button
              type="button"
              className={btn + " ml-auto !py-0.5 !text-[10px]"}
              title="Vaciar plantilla"
              onClick={() => {
                if (
                  doc.blocks.length > 0 &&
                  !window.confirm("¿Dejar la plantilla en blanco?")
                ) {
                  return;
                }
                const next = createBlankStudioDocument();
                setDoc(next);
                selectOnly(null);
              }}
            >
              Vaciar
            </button>
          </div>
          <p className="mb-1 text-[9px] leading-3 text-brand-blue/40">
            Clic = uno · Ctrl/Cmd = sumar · Shift = rango
          </p>
          <ul className="space-y-0.5">
            {doc.blocks.map((b, idx) => {
              const meta = STUDIO_PRESETS.find((x) => x.kind === b.kind);
              const active = selectedSet.has(b.id);
              const isFocus = b.id === selectedId;
              const summary =
                b.props.label ||
                b.props.text?.slice(0, 28) ||
                b.props.template?.slice(0, 28) ||
                "";
              return (
                <li key={b.id} id={`studio-block-nav-${b.id}`}>
                  <div
                    className={`flex items-stretch gap-0.5 rounded ${
                      active
                        ? isFocus
                          ? "bg-brand-blue text-white"
                          : "bg-brand-blue/75 text-white"
                        : "text-brand-blue/80 hover:bg-brand-blue/8"
                    }`}
                  >
                    <label
                      className="flex cursor-pointer items-center px-1"
                      title="Marcar para selección múltiple"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="accent-[#11224E]"
                        checked={active}
                        onChange={() => toggleSelect(b.id)}
                      />
                    </label>
                    <button
                      type="button"
                      className="min-w-0 flex-1 px-1 py-1 text-left text-[11px] font-medium"
                      onClick={(e) => onBlockNavClick(b.id, e)}
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
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="border-b border-brand-blue/10 bg-white p-2 lg:min-h-0 lg:overflow-auto lg:border-b-0 lg:border-r">
          {multiSelected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <p className="text-[11px] font-bold text-brand-blue">
                  {selectedIds.length} bloques seleccionados
                </p>
                <button
                  type="button"
                  className={btn + " ml-auto"}
                  onClick={() => selectOnly(selectedId)}
                >
                  Solo 1
                </button>
                <button type="button" className={btn} onClick={() => setSelectedIds([])}>
                  Limpiar
                </button>
                <button type="button" className={btn} onClick={removeSelected} title="Eliminar seleccionados">
                  ✕
                </button>
              </div>
              {alignableSelected.length > 0 ? (
                <div>
                  <label className={label}>
                    Alinear {alignableSelected.length} bloque
                    {alignableSelected.length === 1 ? "" : "s"}
                  </label>
                  <AlignPicker
                    value={
                      alignableSelected.every(
                        (b) => (b.props.align || "left") === (alignableSelected[0].props.align || "left"),
                      )
                        ? alignableSelected[0].props.align || "left"
                        : ""
                    }
                    onChange={(v) =>
                      updateAlignMany(
                        alignableSelected.map((b) => b.id),
                        v,
                      )
                    }
                  />
                  <p className="mt-0.5 text-[10px] text-brand-blue/45">
                    Aplica a saludo, título, párrafo, botón, imagen y fila dato.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-brand-blue/50">
                  Ningún bloque seleccionado admite alineación.
                </p>
              )}
              <ul className="max-h-40 space-y-0.5 overflow-auto text-[10px] text-brand-blue/55">
                {doc.blocks
                  .filter((b) => selectedSet.has(b.id))
                  .map((b) => (
                    <li key={b.id}>
                      · {STUDIO_PRESETS.find((x) => x.kind === b.kind)?.label ?? b.kind}
                      {ALIGNABLE_KINDS.has(b.kind) ? "" : " (sin alinear)"}
                    </li>
                  ))}
              </ul>
            </div>
          ) : !selected ? (
            <p className="text-[11px] text-brand-blue/45">
              Elige un bloque o agrega un componente a la izquierda. Marca varios con
              checkbox o Ctrl/Cmd para alinearlos juntos.
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
                    {f.control === "iconPicker" ? (
                      <DataRowIconPicker
                        value={selected.props.icon ?? ""}
                        labelText={selected.props.label ?? ""}
                        valueText={selected.props.value ?? ""}
                        onChange={(v) => updateProps(selected.id, "icon", v)}
                      />
                    ) : f.control === "align" ? (
                      <AlignPicker
                        value={selected.props.align ?? "left"}
                        onChange={(v) => updateProps(selected.id, "align", v)}
                      />
                    ) : f.options ? (
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
            <span className="hidden text-[9px] text-brand-blue/40 sm:inline">
              clic en un bloque para editarlo
            </span>
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
                ref={previewIframeRef}
                title="preview"
                className="h-full min-h-[400px] w-full rounded border-0 bg-white shadow-sm"
                srcDoc={previewHtml}
                onLoad={syncPreviewSelection}
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
              {!canSendInformativos ? (
                <div
                  className="rounded border border-amber-300/80 bg-amber-50 px-3 py-2.5 text-[12px] leading-5 text-amber-950"
                  role="status"
                >
                  <p className="font-bold">Envío en desarrollo</p>
                  <p className="mt-1 text-amber-900/90">
                    Por seguridad, solo <strong>Rodrigo Cáceres</strong> puede enviar
                    correos informativos por ahora. Puedes armar plantillas, revisar el
                    preview, gestionar la agenda y conocer el sistema; el botón de envío
                    se habilitará más adelante.
                  </p>
                </div>
              ) : null}
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
                disabled={sending || !canSendInformativos}
                title={
                  canSendInformativos
                    ? undefined
                    : "Solo Rodrigo Cáceres puede enviar mientras está en desarrollo"
                }
                onClick={() => {
                  if (!canSendInformativos) {
                    sileo.error({
                      title: "Envío en desarrollo",
                      description:
                        "Por seguridad, solo Rodrigo Cáceres puede enviar estos correos.",
                    });
                    return;
                  }
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
                disabled={sending || selectedList.length === 0 || !canSendInformativos}
                title={
                  canSendInformativos
                    ? undefined
                    : "Solo Rodrigo Cáceres puede enviar mientras está en desarrollo"
                }
                onClick={() => {
                  if (!canSendInformativos) {
                    sileo.error({
                      title: "Envío en desarrollo",
                      description:
                        "Por seguridad, solo Rodrigo Cáceres puede enviar estos correos.",
                    });
                    return;
                  }
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
