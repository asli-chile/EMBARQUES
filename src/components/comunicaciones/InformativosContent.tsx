import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { sendEmail } from "@/lib/email/sendEmail";
import {
  INFORMATIVO_ICON_IDS,
  INFORMATIVO_ICON_LABELS,
  createDefaultInformativoDraft,
  newFilaId,
  parseDestinatarios,
  renderInformativoHtml,
  type InformativoFila,
  type InformativoIconId,
  type InformativoPayload,
  type InformativoPlantillaDraft,
  type InformativoPlantillaRow,
} from "@/lib/email/informativos";
import {
  moduleBtnPrimary,
  moduleBtnSecondary,
  moduleCard,
  moduleCardAccent,
  moduleHeroRounded,
  moduleInput,
  moduleLabel,
  modulePageBg,
} from "@/lib/ui/moduleStyles";

type SendProgress = {
  total: number;
  done: number;
  ok: number;
  fail: number;
  lastError?: string;
};

function updatePayload(
  draft: InformativoPlantillaDraft,
  patch: Partial<InformativoPayload>,
): InformativoPlantillaDraft {
  return { ...draft, payload: { ...draft.payload, ...patch } };
}

export function InformativosContent() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [draft, setDraft] = useState<InformativoPlantillaDraft>(() =>
    createDefaultInformativoDraft(),
  );
  const [previewNombre, setPreviewNombre] = useState("Carmen");
  const [destinatariosRaw, setDestinatariosRaw] = useState(
    "carmen@ejemplo.com,Carmen\nnina@ejemplo.com,Nina Scotti",
  );
  const [savedList, setSavedList] = useState<InformativoPlantillaRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<SendProgress | null>(null);

  const previewHtml = useMemo(
    () => renderInformativoHtml(draft.payload, { nombre: previewNombre }),
    [draft.payload, previewNombre],
  );

  const parsed = useMemo(
    () => parseDestinatarios(destinatariosRaw),
    [destinatariosRaw],
  );

  const loadPlantillas = useCallback(async () => {
    setLoadingList(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("informativos_plantillas")
        .select("id, nombre, asunto, payload, created_by, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setSavedList((data ?? []) as InformativoPlantillaRow[]);
    } catch (e) {
      console.error(e);
      sileo.error({
        title: "No se pudieron cargar las plantillas",
        description:
          e instanceof Error ? e.message : "Revisa que la migración esté aplicada.",
      });
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadPlantillas();
  }, [loadPlantillas]);

  const setParrafo = (index: number, value: string) => {
    const parrafos = [...draft.payload.parrafos];
    parrafos[index] = value;
    setDraft(updatePayload(draft, { parrafos }));
  };

  const addParrafo = () => {
    setDraft(updatePayload(draft, { parrafos: [...draft.payload.parrafos, ""] }));
  };

  const removeParrafo = (index: number) => {
    setDraft(
      updatePayload(draft, {
        parrafos: draft.payload.parrafos.filter((_, i) => i !== index),
      }),
    );
  };

  const setFila = (id: string, patch: Partial<InformativoFila>) => {
    setDraft(
      updatePayload(draft, {
        filas: draft.payload.filas.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      }),
    );
  };

  const addFila = () => {
    setDraft(
      updatePayload(draft, {
        filas: [
          ...draft.payload.filas,
          { id: newFilaId(), icon: "document", label: "NUEVO", value: "" },
        ],
      }),
    );
  };

  const removeFila = (id: string) => {
    setDraft(
      updatePayload(draft, {
        filas: draft.payload.filas.filter((f) => f.id !== id),
      }),
    );
  };

  const resetBase = () => {
    setDraft(createDefaultInformativoDraft());
    setSelectedId(null);
  };

  const loadSaved = (row: InformativoPlantillaRow) => {
    setSelectedId(row.id);
    setDraft({
      nombre: row.nombre,
      asunto: row.asunto,
      payload: row.payload,
    });
  };

  const savePlantilla = async () => {
    if (!draft.nombre.trim()) {
      sileo.error({ title: "Pon un nombre a la plantilla" });
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const row = {
        nombre: draft.nombre.trim(),
        asunto: draft.asunto.trim(),
        payload: draft.payload,
        created_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      if (selectedId) {
        const { error } = await supabase
          .from("informativos_plantillas")
          .update(row)
          .eq("id", selectedId);
        if (error) throw error;
        sileo.success({ title: "Plantilla actualizada" });
      } else {
        const { data, error } = await supabase
          .from("informativos_plantillas")
          .insert(row)
          .select("id")
          .single();
        if (error) throw error;
        setSelectedId(data.id);
        sileo.success({ title: "Plantilla guardada" });
      }
      await loadPlantillas();
    } catch (e) {
      sileo.error({
        title: "Error al guardar",
        description: e instanceof Error ? e.message : "Error desconocido",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAsNew = async () => {
    setSelectedId(null);
    setDraft({ ...draft, nombre: `${draft.nombre.trim() || "Informativo"} (copia)` });
    // next tick save would need selectedId null — user clicks Guardar
    sileo.info({ title: "Lista como nueva", description: "Pulsa Guardar para crear una copia." });
  };

  const deleteSelected = async () => {
    if (!selectedId) return;
    if (!confirm("¿Eliminar esta plantilla guardada?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("informativos_plantillas")
        .delete()
        .eq("id", selectedId);
      if (error) throw error;
      setSelectedId(null);
      sileo.success({ title: "Plantilla eliminada" });
      await loadPlantillas();
    } catch (e) {
      sileo.error({
        title: "No se pudo eliminar",
        description: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  };

  const sendToList = async (list: { email: string; nombre: string }[]) => {
    if (!draft.asunto.trim()) {
      sileo.error({ title: "Falta el asunto del correo" });
      return;
    }
    if (list.length === 0) {
      sileo.error({ title: "No hay destinatarios válidos" });
      return;
    }
    setSending(true);
    const prog: SendProgress = { total: list.length, done: 0, ok: 0, fail: 0 };
    setProgress({ ...prog });

    for (const dest of list) {
      const html = renderInformativoHtml(draft.payload, {
        nombre: dest.nombre,
        preferPublicAssets: true,
      });
      const result = await sendEmail({
        to: dest.email,
        subject: draft.asunto,
        body: html,
        sendFrom: "informaciones",
        skipSignature: true,
      });
      prog.done += 1;
      if (result.success) prog.ok += 1;
      else {
        prog.fail += 1;
        prog.lastError = result.error;
      }
      setProgress({ ...prog });
      // pequeña pausa para no saturar Gmail API
      await new Promise((r) => setTimeout(r, 350));
    }

    setSending(false);
    if (prog.fail === 0) {
      sileo.success({
        title: `Enviado a ${prog.ok} destinatario${prog.ok === 1 ? "" : "s"}`,
        description: "Desde informaciones@asli.cl",
      });
    } else {
      sileo.error({
        title: `Completado con errores (${prog.ok} ok, ${prog.fail} fallos)`,
        description: prog.lastError,
      });
    }
  };

  const sendTest = async () => {
    const email = (profile?.email ?? user?.email ?? "").trim();
    if (!email) {
      sileo.error({ title: "No hay email de sesión para prueba" });
      return;
    }
    const nombre =
      previewNombre.trim() ||
      profile?.nombre?.split(" ")[0] ||
      email.split("@")[0];
    await sendToList([{ email, nombre }]);
  };

  const sendAll = async () => {
    if (parsed.errores.length) {
      sileo.error({
        title: "Hay filas inválidas en la lista",
        description: parsed.errores.slice(0, 3).join(" · "),
      });
      return;
    }
    if (
      !confirm(
        `¿Enviar ${parsed.destinatarios.length} correo(s) desde informaciones@asli.cl?`,
      )
    ) {
      return;
    }
    await sendToList(parsed.destinatarios);
  };

  if (authLoading) {
    return (
      <main className={`flex-1 ${modulePageBg} min-h-0 overflow-auto p-4`}>
        <p className="text-brand-blue/70">Cargando…</p>
      </main>
    );
  }

  return (
    <main className={`flex-1 ${modulePageBg} min-h-0 overflow-auto p-3 sm:p-4 lg:p-5`}>
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className={`${moduleHeroRounded} p-5 sm:p-6`}>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Informativos</h1>
          <p className="mt-1 text-white/80 text-sm sm:text-base max-w-2xl">
            Edita la plantilla ASLI, personaliza el nombre con{" "}
            <code className="text-white/95 bg-white/10 px-1 rounded">{"{{nombre}}"}</code> y
            envía desde <strong>informaciones@asli.cl</strong>.
          </p>
        </div>

        <div className={`${moduleCard}`}>
          <div className={moduleCardAccent} />
          <div className="p-4 sm:p-5 flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1 min-w-0">
              <label className={moduleLabel}>Plantillas guardadas</label>
              <select
                className={moduleInput}
                value={selectedId ?? ""}
                disabled={loadingList}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    resetBase();
                    return;
                  }
                  const row = savedList.find((r) => r.id === id);
                  if (row) loadSaved(row);
                }}
              >
                <option value="">— Nueva / base —</option>
                {savedList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={moduleBtnSecondary} onClick={resetBase}>
                Plantilla base
              </button>
              <button
                type="button"
                className={moduleBtnSecondary}
                onClick={() => void saveAsNew()}
                disabled={!selectedId}
              >
                Guardar como nueva
              </button>
              <button
                type="button"
                className={moduleBtnPrimary}
                onClick={() => void savePlantilla()}
                disabled={saving}
              >
                {saving ? "Guardando…" : selectedId ? "Actualizar" : "Guardar"}
              </button>
              {selectedId ? (
                <button
                  type="button"
                  className={moduleBtnSecondary}
                  onClick={() => void deleteSelected()}
                >
                  Eliminar
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Editor */}
          <div className={`${moduleCard}`}>
            <div className={moduleCardAccent} />
            <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-auto">
              <div>
                <label className={moduleLabel}>Nombre de plantilla</label>
                <input
                  className={moduleInput}
                  value={draft.nombre}
                  onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className={moduleLabel}>Asunto</label>
                <input
                  className={moduleInput}
                  value={draft.asunto}
                  onChange={(e) => setDraft({ ...draft, asunto: e.target.value })}
                />
              </div>
              <div>
                <label className={moduleLabel}>
                  Saludo (usa {"{{nombre}}"})
                </label>
                <input
                  className={moduleInput}
                  value={draft.payload.saludo}
                  onChange={(e) =>
                    setDraft(updatePayload(draft, { saludo: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className={moduleLabel + " mb-0"}>Párrafos</label>
                  <button type="button" className={moduleBtnSecondary} onClick={addParrafo}>
                    + Párrafo
                  </button>
                </div>
                <p className="text-xs text-neutral-500">
                  Negrita con <code>**texto**</code>
                </p>
                {draft.payload.parrafos.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <textarea
                      className={moduleInput + " min-h-[4.5rem]"}
                      value={p}
                      onChange={(e) => setParrafo(i, e.target.value)}
                    />
                    <button
                      type="button"
                      className="shrink-0 text-red-600 hover:text-red-800 px-1"
                      title="Quitar"
                      onClick={() => removeParrafo(i)}
                    >
                      <Icon icon="typcn:times" width={20} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className={moduleLabel + " mb-0"}>Filas de datos</label>
                  <button type="button" className={moduleBtnSecondary} onClick={addFila}>
                    + Fila
                  </button>
                </div>
                {draft.payload.filas.map((fila) => (
                  <div
                    key={fila.id}
                    className="rounded-xl border border-brand-blue/15 bg-[#F4F8FC] p-3 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-brand-blue/70">
                          Ícono
                        </label>
                        <select
                          className={moduleInput}
                          value={fila.icon}
                          onChange={(e) =>
                            setFila(fila.id, {
                              icon: e.target.value as InformativoIconId,
                            })
                          }
                        >
                          {INFORMATIVO_ICON_IDS.map((id) => (
                            <option key={id} value={id}>
                              {INFORMATIVO_ICON_LABELS[id]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-brand-blue/70">
                          Etiqueta
                        </label>
                        <input
                          className={moduleInput}
                          value={fila.label}
                          onChange={(e) => setFila(fila.id, { label: e.target.value })}
                        />
                      </div>
                    </div>
                    {fila.icon === "custom" ? (
                      <div>
                        <label className="text-xs font-semibold text-brand-blue/70">
                          URL del ícono
                        </label>
                        <input
                          className={moduleInput}
                          value={fila.iconUrl ?? ""}
                          onChange={(e) => setFila(fila.id, { iconUrl: e.target.value })}
                          placeholder="https://…"
                        />
                      </div>
                    ) : null}
                    <div>
                      <label className="text-xs font-semibold text-brand-blue/70">
                        Valor
                      </label>
                      <textarea
                        className={moduleInput + " min-h-[3.2rem]"}
                        value={fila.value}
                        onChange={(e) => setFila(fila.id, { value: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      className="text-sm text-red-600 font-semibold"
                      onClick={() => removeFila(fila.id)}
                    >
                      Quitar fila
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className={moduleLabel}>Cierre</label>
                <textarea
                  className={moduleInput + " min-h-[4.5rem]"}
                  value={draft.payload.cierre}
                  onChange={(e) =>
                    setDraft(updatePayload(draft, { cierre: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={moduleLabel}>Firma (nombre)</label>
                  <input
                    className={moduleInput}
                    value={draft.payload.firmaNombre}
                    onChange={(e) =>
                      setDraft(updatePayload(draft, { firmaNombre: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={moduleLabel}>Firma (cargo)</label>
                  <input
                    className={moduleInput}
                    value={draft.payload.firmaCargo}
                    onChange={(e) =>
                      setDraft(updatePayload(draft, { firmaCargo: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className={moduleLabel}>Imagen hero (URL opcional)</label>
                <input
                  className={moduleInput}
                  value={draft.payload.imagenHero ?? ""}
                  onChange={(e) =>
                    setDraft(
                      updatePayload(draft, {
                        imagenHero: e.target.value || undefined,
                      }),
                    )
                  }
                  placeholder="https://…"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className={`${moduleCard} flex flex-col min-h-[480px]`}>
            <div className={moduleCardAccent} />
            <div className="p-4 border-b border-brand-blue/10 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[140px]">
                <label className={moduleLabel}>Vista previa — nombre</label>
                <input
                  className={moduleInput}
                  value={previewNombre}
                  onChange={(e) => setPreviewNombre(e.target.value)}
                />
              </div>
              <span className="text-xs text-neutral-500 pb-2">
                Así se verá con {"{{nombre}}"} reemplazado
              </span>
            </div>
            <div className="flex-1 bg-[#f1f1f1] overflow-auto p-2 sm:p-4">
              <iframe
                title="Vista previa informativo"
                className="w-full min-h-[560px] bg-white rounded shadow-sm border-0"
                srcDoc={previewHtml}
              />
            </div>
          </div>
        </div>

        {/* Destinatarios + envío */}
        <div className={`${moduleCard}`}>
          <div className={moduleCardAccent} />
          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-brand-blue">Destinatarios</h2>
              <p className="text-sm text-neutral-600 mt-1">
                Una línea por persona: <code>email,nombre</code> o{" "}
                <code>nombre,email</code>. El saludo usará el nombre de cada fila.
              </p>
            </div>
            <textarea
              className={moduleInput + " min-h-[8rem] font-mono text-sm"}
              value={destinatariosRaw}
              onChange={(e) => setDestinatariosRaw(e.target.value)}
              placeholder={"carmen@cliente.cl,Carmen\nnina@cliente.cl,Nina"}
            />
            <div className="flex flex-wrap items-center gap-3 text-sm text-brand-blue/80">
              <span>
                Válidos: <strong>{parsed.destinatarios.length}</strong>
              </span>
              {parsed.errores.length > 0 ? (
                <span className="text-red-600">
                  Errores: {parsed.errores.length} (revisa el formato)
                </span>
              ) : null}
              {progress ? (
                <span>
                  Envío: {progress.done}/{progress.total} · ok {progress.ok} · fallos{" "}
                  {progress.fail}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={moduleBtnSecondary}
                disabled={sending}
                onClick={() => void sendTest()}
              >
                Enviar prueba a mí
              </button>
              <button
                type="button"
                className={moduleBtnPrimary}
                disabled={sending || parsed.destinatarios.length === 0}
                onClick={() => void sendAll()}
              >
                {sending
                  ? "Enviando…"
                  : `Enviar a ${parsed.destinatarios.length || "…"}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
