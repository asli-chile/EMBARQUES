"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useNeonTheme } from "@/lib/ui/neonTheme";

const BUCKET = "marketing-graficas";

type PiezaRow = {
  id: string;
  titulo: string;
  pilar: string;
  imagen_path: string;
  caption_sugerido: string | null;
  revisado: boolean;
  revisado_por: string | null;
  revisado_at: string | null;
  creado_por: string | null;
  activo: boolean;
  created_at: string;
};

const neonInput =
  "dash-control w-full px-3.5 py-2.5 border border-dash-border rounded-lg text-base text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40 focus:border-dash-neon/50";
const neonLabel = "block text-sm font-semibold text-dash-muted mb-1.5";
const neonTextarea = `${neonInput} min-h-[96px] resize-y`;

type ModalMode = "create" | "edit" | null;

export function MarketingOfficeContent() {
  const { user, profile, isSuperadmin, isAdmin, isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const tr = t.marketingOficina;
  const canEdit = isSuperadmin || isAdmin;
  const [theme] = useNeonTheme();

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const [piezas, setPiezas] = useState<PiezaRow[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "revisado" | "pendiente">("all");

  const [modal, setModal] = useState<ModalMode>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formPilar, setFormPilar] = useState("");
  const [formCaption, setFormCaption] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PiezaRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPiezas = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from("marketing_graficas")
      .select("*")
      .eq("activo", true)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setPiezas((data ?? []) as PiezaRow[]);
  }, [supabase]);

  useEffect(() => {
    void fetchPiezas();
  }, [fetchPiezas]);

  // Bucket privado: cada imagen se descarga y se cachea como object URL local.
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const pending = piezas.filter((p) => !imageUrls[p.id]);
    if (pending.length === 0) return;

    void (async () => {
      for (const pieza of pending) {
        const { data, error: dlErr } = await supabase.storage.from(BUCKET).download(pieza.imagen_path);
        if (cancelled || dlErr || !data) continue;
        const url = URL.createObjectURL(data);
        setImageUrls((prev) => (prev[pieza.id] ? prev : { ...prev, [pieza.id]: url }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piezas, supabase]);

  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return piezas.filter((p) => {
      if (filter === "revisado" && !p.revisado) return false;
      if (filter === "pendiente" && p.revisado) return false;
      if (!q) return true;
      return p.titulo.toLowerCase().includes(q) || p.pilar.toLowerCase().includes(q);
    });
  }, [piezas, search, filter]);

  const resetForm = () => {
    setFormTitulo("");
    setFormPilar("");
    setFormCaption("");
    setFormFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openCreate = () => {
    setEditId(null);
    resetForm();
    setModal("create");
  };

  const openEdit = (p: PiezaRow) => {
    setEditId(p.id);
    setFormTitulo(p.titulo);
    setFormPilar(p.pilar);
    setFormCaption(p.caption_sugerido ?? "");
    setFormFile(null);
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditId(null);
    resetForm();
  };

  const handleSave = async () => {
    if (!supabase || !profile) return;
    if (!formTitulo.trim()) {
      sileo.error({ title: tr.errorTitulo });
      return;
    }
    if (!formPilar.trim()) {
      sileo.error({ title: tr.errorPilar });
      return;
    }
    if (modal === "create" && !formFile) {
      sileo.error({ title: tr.errorImagen });
      return;
    }

    setSaving(true);
    try {
      let imagenPath: string | null = editId
        ? piezas.find((p) => p.id === editId)?.imagen_path ?? null
        : null;

      if (formFile) {
        const ext = formFile.name.split(".").pop() || "png";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, formFile, { upsert: true, contentType: formFile.type || "image/png" });
        if (upErr) throw upErr;
        const previousPath = imagenPath;
        imagenPath = path;
        if (previousPath) {
          await supabase.storage.from(BUCKET).remove([previousPath]);
        }
      }

      if (modal === "create") {
        const { error: insErr } = await supabase.from("marketing_graficas").insert({
          titulo: formTitulo.trim(),
          pilar: formPilar.trim(),
          imagen_path: imagenPath,
          caption_sugerido: formCaption.trim() || null,
          creado_por: profile.id,
        });
        if (insErr) throw insErr;
        sileo.success({ title: tr.successCreated });
      } else if (editId) {
        const { error: updErr } = await supabase
          .from("marketing_graficas")
          .update({
            titulo: formTitulo.trim(),
            pilar: formPilar.trim(),
            imagen_path: imagenPath,
            caption_sugerido: formCaption.trim() || null,
          })
          .eq("id", editId);
        if (updErr) throw updErr;
        sileo.success({ title: tr.successUpdated });
        // Imagen reemplazada: se descarta el object URL viejo para que se recargue.
        if (formFile) {
          setImageUrls((prev) => {
            const next = { ...prev };
            delete next[editId];
            return next;
          });
        }
      }

      closeModal();
      await fetchPiezas();
    } catch {
      sileo.error({ title: tr.errorSave });
    } finally {
      setSaving(false);
    }
  };

  const toggleRevisado = async (p: PiezaRow) => {
    if (!supabase || !canEdit) return;
    const { error: updErr } = await supabase
      .from("marketing_graficas")
      .update({
        revisado: !p.revisado,
        revisado_por: !p.revisado ? profile?.id ?? null : null,
        revisado_at: !p.revisado ? new Date().toISOString() : null,
      })
      .eq("id", p.id);
    if (updErr) {
      sileo.error({ title: tr.errorSave });
      return;
    }
    setPiezas((prev) =>
      prev.map((row) => (row.id === p.id ? { ...row, revisado: !p.revisado } : row)),
    );
  };

  const handleDelete = async () => {
    if (!supabase || !confirmDelete) return;
    setDeleting(true);
    const { error: delErr } = await supabase
      .from("marketing_graficas")
      .update({ activo: false })
      .eq("id", confirmDelete.id);
    setDeleting(false);
    if (delErr) {
      sileo.error({ title: tr.errorDelete });
      return;
    }
    sileo.success({ title: tr.successDeleted });
    setConfirmDelete(null);
    await fetchPiezas();
  };

  if (authLoading) {
    return (
      <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
        <main className="dash-page flex min-h-0 flex-1 items-center justify-center" role="main">
          <Icon icon="typcn:refresh" className="h-5 w-5 animate-spin text-dash-neon" />
        </main>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
        <main className="dash-page flex min-h-0 flex-1 items-center justify-center p-6" role="main">
          <p className="text-sm text-dash-muted">{tr.loginRequired}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="dash-neon flex min-h-0 flex-1 flex-col" data-theme={theme}>
      <main className="dash-page relative flex min-h-0 flex-1 flex-col overflow-y-auto" role="main">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-dash-neon/20 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-dash-neon-hot/15 blur-3xl" />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--dash-neon)_55%,transparent)]">
                <Icon icon="lucide:image" width={22} height={22} className="text-dash-neon" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-dash-fg sm:text-xl">{tr.title}</h1>
                <p className="mt-0.5 line-clamp-1 text-xs text-dash-muted sm:text-sm">{tr.subtitle}</p>
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={openCreate}
                className="dash-cta inline-flex items-center gap-1.5 px-4 py-2 text-sm"
              >
                <Icon icon="lucide:plus" width={16} height={16} />
                <span className="hidden sm:inline">{tr.newPiece}</span>
                <span className="sm:hidden">{tr.newPieceShort}</span>
              </button>
            )}
          </div>

          <div className="dash-card flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Icon icon="lucide:search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dash-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr.searchPlaceholder}
                className={`${neonInput} pl-9`}
              />
            </div>
            <div className="flex gap-1.5">
              {(["all", "pendiente", "revisado"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    filter === f
                      ? "border-dash-neon/40 bg-dash-neon/15 text-dash-fg"
                      : "border-dash-border bg-dash-control text-dash-muted hover:text-dash-fg"
                  }`}
                >
                  {f === "all" ? tr.filterAll : f === "pendiente" ? tr.filterPendiente : tr.filterRevisado}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="dash-card flex items-center justify-center gap-3 rounded-xl px-5 py-16 text-sm text-dash-muted">
              <Icon icon="typcn:refresh" className="h-5 w-5 animate-spin text-dash-neon" />
              {tr.loading}
            </div>
          ) : error ? (
            <div className="dash-card flex items-center justify-center gap-3 rounded-xl px-5 py-16 text-sm text-dash-muted">
              {tr.errorLoad}
            </div>
          ) : filtered.length === 0 ? (
            <div className="dash-card flex flex-col items-center gap-3 rounded-xl px-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dash-border bg-dash-control">
                <Icon icon="lucide:image-off" width={26} height={26} className="text-dash-muted" />
              </div>
              <div>
                <p className="text-sm font-semibold text-dash-fg">{tr.empty}</p>
                <p className="mt-1 text-sm text-dash-muted">{canEdit ? tr.emptyHintAdmin : tr.emptyHintReadonly}</p>
              </div>
              {canEdit && (
                <button type="button" onClick={openCreate} className="dash-cta inline-flex items-center gap-2 px-5 py-2.5 text-sm">
                  <Icon icon="lucide:plus" width={16} height={16} />
                  {tr.newPiece}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <article
                  key={p.id}
                  className="dash-card flex flex-col overflow-hidden rounded-xl border border-dash-border transition-colors hover:border-dash-neon/35"
                >
                  <div className="aspect-[4/5] w-full overflow-hidden bg-dash-control">
                    {imageUrls[p.id] ? (
                      <img src={imageUrls[p.id]} alt={p.titulo} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Icon icon="typcn:refresh" className="h-5 w-5 animate-spin text-dash-muted" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-full border border-dash-border bg-dash-control px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-dash-muted">
                        {p.pilar}
                      </span>
                      {p.revisado ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-dash-neon/35 bg-dash-neon/15 px-2 py-0.5 text-[11px] font-bold text-dash-fg">
                          <Icon icon="lucide:check" width={10} height={10} />
                          {tr.revisado}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-dash-border bg-dash-control px-2 py-0.5 text-[11px] font-semibold text-dash-muted">
                          {tr.pendiente}
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-bold text-dash-fg">{p.titulo}</h2>
                    {p.caption_sugerido && (
                      <p className="line-clamp-3 text-xs text-dash-muted">{p.caption_sugerido}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-dash-border pt-3">
                      <button
                        type="button"
                        onClick={() => canEdit && toggleRevisado(p)}
                        disabled={!canEdit}
                        className="text-xs font-semibold text-dash-neon underline decoration-dotted disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                      >
                        {p.revisado ? tr.quitarRevisado : tr.marcarRevisado}
                      </button>
                      <div className="flex items-center gap-1">
                        {imageUrls[p.id] && (
                          <a
                            href={imageUrls[p.id]}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={tr.viewFull}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                          >
                            <Icon icon="lucide:expand" width={14} height={14} />
                          </a>
                        )}
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              aria-label={tr.editAria.replace("{{titulo}}", p.titulo)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg"
                            >
                              <Icon icon="lucide:pencil" width={14} height={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(p)}
                              aria-label={tr.deleteAria.replace("{{titulo}}", p.titulo)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-red-500/15 hover:text-red-400"
                            >
                              <Icon icon="lucide:trash-2" width={14} height={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {modal && (
        <div
          className="dash-neon fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          data-theme={theme}
          onClick={closeModal}
        >
          <div
            className="dash-card flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-3xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 sm:hidden"><div className="h-1 w-10 rounded-full bg-dash-border" /></div>
            <div className="flex shrink-0 items-center justify-between border-b border-dash-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-dash-neon/40 bg-dash-neon/15">
                  <Icon icon={modal === "create" ? "lucide:image-plus" : "lucide:image"} className="h-4 w-4 text-dash-neon" />
                </span>
                <h2 className="text-sm font-bold text-dash-fg">{modal === "create" ? tr.modalTitleNew : tr.modalTitleEdit}</h2>
              </div>
              <button type="button" onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-xl text-dash-muted transition-colors hover:bg-dash-neon/15 hover:text-dash-fg">
                <Icon icon="lucide:x" width={16} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
              <div>
                <label className={neonLabel}>{tr.fieldTitulo}</label>
                <input
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder={tr.fieldTituloPlaceholder}
                  className={neonInput}
                />
              </div>
              <div>
                <label className={neonLabel}>{tr.fieldPilar}</label>
                <input
                  value={formPilar}
                  onChange={(e) => setFormPilar(e.target.value)}
                  placeholder={tr.fieldPilarPlaceholder}
                  className={neonInput}
                />
              </div>
              <div>
                <label className={neonLabel}>{tr.fieldCaption}</label>
                <textarea
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  placeholder={tr.fieldCaptionPlaceholder}
                  className={neonTextarea}
                />
              </div>
              <div>
                <label className={neonLabel}>
                  {modal === "create" ? tr.fieldImagen : tr.fieldImagenReplace}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-dash-muted file:mr-3 file:rounded-lg file:border file:border-dash-border file:bg-dash-control file:px-3 file:py-2 file:text-sm file:font-semibold file:text-dash-fg"
                />
                <p className="mt-1.5 text-xs text-dash-muted">{tr.fieldImagenHint}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-dash-border px-5 py-4">
              <button type="button" onClick={closeModal} className="rounded-lg border border-dash-border bg-dash-control px-4 py-2 text-sm font-semibold text-dash-fg hover:bg-dash-neon/10">
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="dash-cta inline-flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-40"
              >
                {saving ? <Icon icon="typcn:refresh" className="h-4 w-4 animate-spin" /> : <Icon icon="lucide:check" width={16} height={16} />}
                {saving ? tr.saving : modal === "create" ? tr.create : tr.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="dash-neon fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          data-theme={theme}
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div className="dash-card w-full max-w-sm rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-dash-fg">{tr.confirmDeleteTitle}</p>
            <p className="mt-1 text-sm text-dash-muted">{tr.confirmDeleteBody}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="rounded-lg border border-dash-border bg-dash-control px-4 py-2 text-sm font-semibold text-dash-fg hover:bg-dash-neon/10"
              >
                {tr.confirmDeleteCancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
              >
                {deleting && <Icon icon="typcn:refresh" className="h-4 w-4 animate-spin" />}
                {tr.confirmDeleteConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
