import { Icon } from "@iconify/react";
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
  STUDIO_DOCUMENT_TEMPLATES,
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
import { DATA_ROW_ICON_OPTIONS, dataRowIconSrc } from "@/lib/email/assets";

/** Tokens UI — studio tipo Canva (claros, compactos). */
const input =
  "w-full rounded-lg border border-[#d5dde8] bg-white px-2.5 py-1.5 text-[12px] text-[#1a2744] placeholder:text-[#1a2744]/40 shadow-sm focus:border-[#11224E]/35 focus:outline-none focus:ring-2 focus:ring-[#11224E]/12";
const label =
  "mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5a6b85]";
const btn =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-[#d5dde8] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1a2744]/85 shadow-sm hover:bg-[#f3f6fb] disabled:opacity-40";
const btnPrimary =
  "inline-flex items-center justify-center gap-1 rounded-lg bg-[#11224E] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#0d1a3d] disabled:opacity-40";
const btnGhost =
  "inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#1a2744]/70 hover:bg-black/5 disabled:opacity-40";
const panelTab =
  "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors";
const boardBg =
  "bg-[#d8e0ea] [background-image:radial-gradient(circle,_#b8c4d4_1px,_transparent_1px)] [background-size:16px_16px]";

const PRESET_ICONS: Record<BlockKind, string> = {
  headerAsli: "lucide:panel-top",
  greeting: "lucide:hand",
  heading: "lucide:heading",
  text: "lucide:type",
  button: "lucide:rectangle-horizontal",
  divider: "lucide:minus",
  image: "lucide:image",
  dataRow: "lucide:rows-3",
  footerAsli: "lucide:panel-bottom",
  html: "lucide:code-2",
};

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
              className={`group flex flex-col items-center gap-1 rounded-xl border px-1 py-1.5 text-center transition ${
                active
                  ? "border-[#11224E]/40 bg-[#eef2f8] ring-1 ring-[#11224E]/25"
                  : "border-[#e2e8f0] bg-white hover:border-[#11224E]/20 hover:bg-[#f8fafc]"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0f4f9]">
                {src ? (
                  <img src={src} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                ) : (
                  <span className="text-[10px] font-semibold text-[#5a6b85]/50">—</span>
                )}
              </span>
              <span className="text-[9px] font-semibold leading-tight text-[#1a2744]/75">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
        <p className="border-b border-[#e8eef5] bg-[#f8fafc] px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#5a6b85]">
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
          <div className="w-[88px] shrink-0 px-2 py-1.5 font-bold text-[#002d69]">
            {previewLabel}:
          </div>
          <div className="min-w-0 flex-1 truncate px-2 py-1.5 text-[#1a2744]/90">
            {previewValue}
          </div>
        </div>
      </div>
    </div>
  );
}

const ALIGN_FIELD: {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  control: "align";
} = {
  key: "align",
  label: "Alineación",
  options: [
    { value: "left", label: "Izquierda" },
    { value: "center", label: "Centro" },
    { value: "right", label: "Derecha" },
  ],
  control: "align",
};

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
        ALIGN_FIELD,
      ];
    case "heading":
      return [
        { key: "text", label: "Texto del título", multiline: true },
        { key: "as", label: "Nivel (h1 | h2 | h3)" },
        ALIGN_FIELD,
      ];
    case "text":
      return [
        {
          key: "text",
          label: "Texto del párrafo",
          multiline: true,
          hint: "**negrita**, {{nombre}}, {{saludo}}. Saltos de línea OK.",
        },
        ALIGN_FIELD,
      ];
    case "button":
      return [
        { key: "label", label: "Texto del botón" },
        { key: "href", label: "URL del enlace" },
        ALIGN_FIELD,
      ];
    case "image":
      return [
        { key: "src", label: "URL de la imagen" },
        { key: "alt", label: "Texto alternativo" },
        { key: "width", label: "Ancho (px)" },
        ALIGN_FIELD,
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
        ALIGN_FIELD,
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
    <div className="flex gap-1 rounded-xl bg-[#eef2f8] p-1">
      {opts.map((o) => {
        const active = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.title}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
              active
                ? "bg-[#11224E] text-white shadow-sm"
                : "text-[#1a2744]/75 hover:bg-white/80"
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
      <main className={`flex flex-1 ${boardBg} p-3 text-[12px] text-[#5a6b85]`}>
        Cargando estudio…
      </main>
    );
  }

  const inspectorBody = multiSelected ? (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <p className="text-[12px] font-bold text-[#11224E]">
          {selectedIds.length} seleccionados
        </p>
        <button
          type="button"
          className={btnGhost + " ml-auto"}
          onClick={() => selectOnly(selectedId)}
        >
          Solo 1
        </button>
        <button type="button" className={btnGhost} onClick={() => setSelectedIds([])}>
          Limpiar
        </button>
        <button
          type="button"
          className={btnGhost}
          onClick={removeSelected}
          title="Eliminar seleccionados"
        >
          <Icon icon="lucide:trash-2" width={14} />
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
                (b) =>
                  (b.props.align || "left") ===
                  (alignableSelected[0].props.align || "left"),
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
          <p className="mt-1 text-[10px] leading-4 text-[#5a6b85]">
            Aplica a saludo, título, párrafo, botón, imagen y fila dato.
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-[#5a6b85]">
          Ningún bloque seleccionado admite alineación.
        </p>
      )}
      <ul className="max-h-40 space-y-0.5 overflow-auto rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2 text-[10px] text-[#5a6b85]">
        {doc.blocks
          .filter((b) => selectedSet.has(b.id))
          .map((b) => (
            <li key={b.id} className="flex items-center gap-1.5">
              <Icon
                icon={PRESET_ICONS[b.kind] ?? "lucide:box"}
                width={12}
                className="shrink-0 opacity-60"
              />
              {STUDIO_PRESETS.find((x) => x.kind === b.kind)?.label ?? b.kind}
              {!ALIGNABLE_KINDS.has(b.kind) ? (
                <span className="opacity-50">· sin alinear</span>
              ) : null}
            </li>
          ))}
      </ul>
    </div>
  ) : !selected ? (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2f8] text-[#11224E]/50">
        <Icon icon="lucide:mouse-pointer-click" width={22} />
      </div>
      <p className="max-w-[200px] text-[12px] leading-5 text-[#5a6b85]">
        Elige un bloque en Capas o en el lienzo. Marca varios para alinearlos juntos.
      </p>
    </div>
  ) : (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eef2f8] text-[#11224E]">
            <Icon icon={PRESET_ICONS[selected.kind] ?? "lucide:box"} width={14} />
          </span>
          <p className="truncate text-[12px] font-bold text-[#11224E]">
            {STUDIO_PRESETS.find((x) => x.kind === selected.kind)?.label}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 gap-0.5">
          <button
            type="button"
            className={btnGhost}
            title="Duplicar"
            onClick={() => duplicateBlock(selected.id)}
          >
            <Icon icon="lucide:copy" width={14} />
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => move(selected.id, -1)}
            title="Subir"
          >
            <Icon icon="lucide:arrow-up" width={14} />
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => move(selected.id, 1)}
            title="Bajar"
          >
            <Icon icon="lucide:arrow-down" width={14} />
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => remove(selected.id)}
            title="Eliminar"
          >
            <Icon icon="lucide:x" width={14} />
          </button>
        </div>
      </div>
      <p className="text-[10px] leading-4 text-[#5a6b85]">
        {STUDIO_PRESETS.find((x) => x.kind === selected.kind)?.description}
      </p>
      {propFields(selected).length === 0 ? (
        <p className="text-[11px] text-[#5a6b85]">
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
              <p className="mt-1 text-[10px] leading-4 text-[#5a6b85]">{f.hint}</p>
            ) : null}
          </div>
        ))
      )}
    </div>
  );

  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col bg-[#cfd8e6]">
      {/* Top bar */}
      <header className="z-10 flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-[#c5d0e0] bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#11224E] text-white shadow-sm">
            <Icon icon="lucide:mail" width={16} />
          </span>
          <div>
            <h1 className="text-[13px] font-bold leading-tight text-[#11224E]">
              Informativos
            </h1>
            <p className="hidden text-[10px] text-[#5a6b85] sm:block">
              Estudio de diseño · ASLI
            </p>
          </div>
        </div>

        <div className="mx-auto flex rounded-xl bg-[#eef2f8] p-0.5">
          {(
            [
              ["compose", "Componer", "lucide:pen-tool"],
              ["agenda", "Agenda", "lucide:book-user"],
              ["send", "Enviar", "lucide:send"],
            ] as const
          ).map(([id, text, icon]) => (
            <button
              key={id}
              type="button"
              className={`${panelTab} flex items-center gap-1 ${
                panel === id
                  ? "bg-white text-[#11224E] shadow-sm"
                  : "text-[#5a6b85] hover:text-[#11224E]"
              }`}
              onClick={() => setPanel(id)}
            >
              <Icon icon={icon} width={13} />
              {text}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <select
            className={input + " !w-[min(100%,200px)] cursor-pointer sm:!w-[220px]"}
            defaultValue=""
            title="Cargar plantilla de prueba"
            aria-label="Cargar plantilla"
            onChange={(e) => {
              const id = e.target.value;
              e.target.value = "";
              const tpl = STUDIO_DOCUMENT_TEMPLATES.find((t) => t.id === id);
              if (!tpl) return;
              const next = tpl.create();
              setDoc(next);
              selectOnly(next.blocks[0]?.id ?? null);
              setPanel("compose");
              sileo.success({ title: `Plantilla: ${tpl.label}` });
            }}
          >
            <option value="" disabled>
              Plantillas…
            </option>
            {STUDIO_DOCUMENT_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={btn}
            title="Vaciar asunto, preview y bloques"
            onClick={() => {
              if (
                doc.blocks.length > 0 &&
                !window.confirm(
                  "¿Dejar la plantilla en blanco? Se perderán los bloques actuales.",
                )
              ) {
                return;
              }
              const next = createBlankStudioDocument();
              setDoc(next);
              selectOnly(null);
              setPanel("compose");
            }}
          >
            <Icon icon="lucide:file-plus" width={13} />
            <span className="hidden sm:inline">En blanco</span>
          </button>
        </div>
      </header>

      {/* Studio body: left | canvas | right */}
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-auto lg:flex-row lg:overflow-hidden ${
          panel !== "compose" ? "pointer-events-none opacity-40" : ""
        }`}
      >
        {/* Left rail */}
        <aside className="flex w-full flex-col border-b border-[#c5d0e0] bg-white lg:w-[248px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="border-b border-[#e8eef5] px-3 py-2.5">
            <p className={label + " mb-2"}>Agregar</p>
            <div className="grid grid-cols-3 gap-1.5">
              {STUDIO_PRESETS.map((p) => (
                <button
                  key={p.kind}
                  type="button"
                  title={p.description}
                  className="group flex flex-col items-center gap-1 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-1 py-2 transition hover:border-[#11224E]/25 hover:bg-white hover:shadow-sm"
                  onClick={() => addPreset(p.kind)}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#11224E] shadow-sm ring-1 ring-[#e2e8f0] group-hover:ring-[#11224E]/20">
                    <Icon icon={PRESET_ICONS[p.kind] ?? "lucide:plus"} width={15} />
                  </span>
                  <span className="max-w-full truncate text-[9px] font-semibold leading-tight text-[#1a2744]/75">
                    {p.label.replace(" {{saludo}}", "").replace("ASLI", "").trim() ||
                      p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-2 py-2">
            <div className="mb-1.5 flex items-center gap-1 px-1">
              <p className={`${label} mb-0`}>Capas</p>
              <span className="rounded-full bg-[#eef2f8] px-1.5 py-0.5 text-[9px] font-bold text-[#5a6b85]">
                {doc.blocks.length}
              </span>
              <button
                type="button"
                className={btnGhost + " ml-auto !py-0.5 !text-[10px]"}
                title="Seleccionar todos"
                disabled={doc.blocks.length === 0}
                onClick={() => setSelectedIds(doc.blocks.map((b) => b.id))}
              >
                Todos
              </button>
              <button
                type="button"
                className={btnGhost + " !py-0.5 !text-[10px]"}
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
            <p className="mb-1.5 px-1 text-[9px] leading-3 text-[#5a6b85]/80">
              Clic · Ctrl/Cmd sumar · Shift rango
            </p>
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-auto pr-0.5">
              {doc.blocks.map((b, idx) => {
                const meta = STUDIO_PRESETS.find((x) => x.kind === b.kind);
                const active = selectedSet.has(b.id);
                const isFocus = b.id === selectedId;
                const summary =
                  b.props.label ||
                  b.props.text?.slice(0, 24) ||
                  b.props.template?.slice(0, 24) ||
                  "";
                return (
                  <li key={b.id} id={`studio-block-nav-${b.id}`}>
                    <div
                      className={`flex items-stretch gap-0.5 rounded-lg transition ${
                        active
                          ? isFocus
                            ? "bg-[#11224E] text-white shadow-sm"
                            : "bg-[#11224E]/80 text-white"
                          : "text-[#1a2744]/80 hover:bg-[#eef2f8]"
                      }`}
                    >
                      <label
                        className="flex cursor-pointer items-center pl-1.5"
                        title="Marcar"
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
                        className="flex min-w-0 flex-1 items-start gap-1.5 px-1.5 py-1.5 text-left"
                        onClick={(e) => onBlockNavClick(b.id, e)}
                      >
                        <Icon
                          icon={PRESET_ICONS[b.kind] ?? "lucide:box"}
                          width={13}
                          className={`mt-0.5 shrink-0 ${active ? "opacity-80" : "opacity-50"}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-semibold">
                            <span className="opacity-50">{idx + 1}. </span>
                            {meta?.label ?? b.kind}
                          </span>
                          {summary ? (
                            <span
                              className={`mt-0.5 block truncate text-[9px] font-normal ${
                                active ? "text-white/65" : "text-[#5a6b85]"
                              }`}
                            >
                              {summary}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </div>
                  </li>
                );
              })}
              {doc.blocks.length === 0 ? (
                <li className="px-2 py-6 text-center text-[11px] text-[#5a6b85]">
                  Sin capas. Agrega un componente.
                </li>
              ) : null}
            </ul>
          </div>
        </aside>

        {/* Center canvas */}
        <section className={`relative flex min-h-[420px] min-w-0 flex-1 flex-col lg:min-h-0 ${boardBg}`}>
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[1] flex justify-center">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-1.5 shadow-md backdrop-blur">
              <Icon icon="lucide:user" width={13} className="text-[#5a6b85]" />
              <input
                className="w-[110px] border-0 bg-transparent text-[11px] font-semibold text-[#11224E] outline-none"
                value={previewNombre}
                onChange={(e) => setPreviewNombre(e.target.value)}
                aria-label="Nombre preview"
                title="Nombre para personalizar el preview"
              />
              <span className="hidden text-[9px] text-[#5a6b85] sm:inline">
                · clic en el correo para editar
              </span>
              {previewError ? (
                <span className="max-w-[160px] truncate text-[10px] text-red-600">
                  {previewError}
                </span>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 pb-8 pt-14">
            <div className="mx-auto w-full max-w-[680px]">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5a6b85]/80">
                  Artboard · email
                </span>
                <span className="text-[10px] text-[#5a6b85]/70">650px</span>
              </div>
              <div className="overflow-hidden rounded-xl bg-white shadow-[0_12px_40px_-12px_rgba(17,34,78,0.35)] ring-1 ring-black/5">
                {previewHtml ? (
                  <iframe
                    ref={previewIframeRef}
                    title="preview"
                    className="block h-[min(72vh,900px)] min-h-[480px] w-full border-0 bg-white"
                    srcDoc={previewHtml}
                    onLoad={syncPreviewSelection}
                  />
                ) : (
                  <p className="p-10 text-center text-[12px] text-[#5a6b85]">
                    Generando preview…
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right inspector */}
        <aside className="flex w-full flex-col border-t border-[#c5d0e0] bg-white lg:w-[300px] lg:shrink-0 lg:border-l lg:border-t-0">
          <div className="border-b border-[#e8eef5] px-3 py-2.5">
            <p className={label}>Documento</p>
            <div className="space-y-2">
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-[#5a6b85]">
                  Asunto
                </label>
                <input
                  className={input}
                  value={doc.asunto}
                  onChange={(e) => setDoc({ ...doc, asunto: e.target.value })}
                  placeholder="Asunto del correo"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-[#5a6b85]">
                  Preview inbox
                </label>
                <input
                  className={input}
                  value={doc.previewText}
                  onChange={(e) => setDoc({ ...doc, previewText: e.target.value })}
                  placeholder="Texto corto en bandeja"
                />
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
            <p className={label}>Propiedades</p>
            {inspectorBody}
          </div>
        </aside>
      </div>

      {panel === "send" ? (
        <div className="absolute inset-0 z-20 flex justify-end bg-[#11224E]/25 backdrop-blur-[2px]">
          <div
            className="flex h-full w-full max-w-md flex-col border-l border-[#c5d0e0] bg-white shadow-2xl"
            role="dialog"
            aria-label="Enviar informativo"
          >
            <div className="flex items-center gap-2 border-b border-[#e8eef5] px-3 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eef2f8] text-[#11224E]">
                <Icon icon="lucide:send" width={14} />
              </span>
              <p className="text-[13px] font-bold text-[#11224E]">Enviar</p>
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
        <div className="absolute inset-0 z-20 flex justify-end bg-[#11224E]/25 backdrop-blur-[2px]">
          <div
            className="flex h-full w-full max-w-lg flex-col border-l border-[#c5d0e0] bg-white shadow-2xl"
            role="dialog"
            aria-label="Agenda de informaciones"
          >
            <div className="flex items-center gap-2 border-b border-[#e8eef5] px-3 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eef2f8] text-[#11224E]">
                <Icon icon="lucide:book-user" width={14} />
              </span>
              <div>
                <p className="text-[13px] font-bold text-[#11224E]">Agenda</p>
                <p className="text-[10px] text-[#5a6b85]">
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
