"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

export type VesselOcrMode = "ids" | "coords";

export type VesselOcrValues = { imo: string; mmsi: string; lat: string; lng: string };

type Tr = {
  imo: string;
  mmsi: string;
  lat: string;
  lng: string;
  dialogIdsTitle: string;
  dialogCoordsTitle: string;
  dialogIdsHint: string;
  dialogCoordsHint: string;
  dialogDropHere: string;
  dropBrowse: string;
  dropPaste: string;
  dropAnalyzing: string;
  dropError: string;
  ocrNoIds: string;
  ocrNoCoords: string;
  ocrPreview: string;
  dialogApply: string;
  dialogCancel: string;
};

type Props = {
  mode: VesselOcrMode;
  vesselName: string;
  initial: VesselOcrValues;
  tr: Tr;
  onClose: () => void;
  onApply: (values: Partial<VesselOcrValues>) => void;
};

const inputCls =
  "dash-control w-full px-2.5 py-2 border border-dash-border rounded-lg text-sm text-dash-fg placeholder:text-dash-muted focus:outline-none focus:ring-2 focus:ring-dash-neon/40 focus:border-dash-neon/50 tabular-nums";

export function VesselOcrDialog({ mode, vesselName, initial, tr, onClose, onApply }: Props) {
  const isIds = mode === "ids";
  const [imo, setImo] = useState(initial.imo);
  const [mmsi, setMmsi] = useState(initial.mmsi);
  const [lat, setLat] = useState(initial.lat);
  const [lng, setLng] = useState(initial.lng);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const runOcr = useCallback(
    async (files: Array<File | Blob>) => {
      const images = files.filter((f) => (f instanceof File ? f.type.startsWith("image/") : true));
      if (images.length === 0) return;
      setBusy(true);
      setPct(0);
      setErr(null);
      try {
        const { analyzeVesselTrackingImages } = await import("@/lib/vessel-tracking-ocr");
        const { fields, text } = await analyzeVesselTrackingImages(images, setPct);
        setOcrText(text);
        if (isIds) {
          if (!fields.imo && !fields.mmsi) {
            setErr(tr.ocrNoIds);
            return;
          }
          if (fields.imo) setImo(fields.imo);
          if (fields.mmsi) setMmsi(fields.mmsi);
        } else {
          if (fields.lat == null && fields.lng == null) {
            setErr(tr.ocrNoCoords);
            return;
          }
          if (fields.lat != null) setLat(String(fields.lat));
          if (fields.lng != null) setLng(String(fields.lng));
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : tr.dropError);
      } finally {
        setBusy(false);
        setPct(0);
      }
    },
    [isIds, tr.dropError, tr.ocrNoCoords, tr.ocrNoIds],
  );

  const pasteFromClipboard = useCallback(async () => {
    if (busy) return;
    try {
      if (!navigator.clipboard || !("read" in navigator.clipboard)) return;
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        files.push(new File([blob], "captura.png", { type }));
      }
      if (files.length > 0) await runOcr(files);
    } catch {
      /* sin permiso de portapapeles: quedan el botón de archivo y Ctrl+V */
    }
  }, [busy, runOcr]);

  const handleApply = () => {
    onApply(isIds ? { imo: imo.trim(), mmsi: mmsi.trim() } : { lat: lat.trim(), lng: lng.trim() });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vessel-ocr-title"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        ref={rootRef}
        tabIndex={-1}
        className="dash-card w-full max-w-lg rounded-2xl border border-dash-border p-5 outline-none sm:p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && !busy && onClose()}
        onPaste={(e) => {
          const files: File[] = [];
          for (const item of e.clipboardData?.items ?? []) {
            if (item.kind === "file" && item.type.startsWith("image/")) {
              const f = item.getAsFile();
              if (f) files.push(f);
            }
          }
          if (files.length === 0) return;
          e.preventDefault();
          void runOcr(files);
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="vessel-ocr-title" className="text-base font-bold text-dash-fg">
              {isIds ? tr.dialogIdsTitle : tr.dialogCoordsTitle}
            </h2>
            <p className="mt-1 truncate text-sm font-semibold text-dash-neon" title={vesselName}>
              {vesselName}
            </p>
            <p className="mt-1 text-xs text-dash-muted">{isIds ? tr.dialogIdsHint : tr.dialogCoordsHint}</p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-dash-control hover:text-dash-fg"
            aria-label={tr.dialogCancel}
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
        </div>

        <div
          className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
            drag ? "border-dash-neon bg-dash-neon/10" : "border-dash-border"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void runOcr([...e.dataTransfer.files]);
          }}
        >
          <Icon icon="lucide:image-plus" width={22} height={22} className="mx-auto text-dash-neon" aria-hidden />
          <p className="mt-1.5 text-xs text-dash-muted">{tr.dialogDropHere}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                void runOcr(files);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-2 text-sm font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15 disabled:opacity-50"
            >
              <Icon icon="lucide:upload" width={14} height={14} />
              {tr.dropBrowse}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void pasteFromClipboard()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-dash-control px-3 py-2 text-sm font-semibold text-dash-fg transition-colors hover:bg-dash-neon/15 disabled:opacity-50"
            >
              <Icon icon="lucide:clipboard-paste" width={14} height={14} />
              {tr.dropPaste}
            </button>
          </div>
          {busy && (
            <p className="mt-2 text-sm font-semibold text-dash-neon">
              {tr.dropAnalyzing} {pct > 0 ? `${pct}%` : ""}
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {isIds ? (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">
                  {tr.imo}
                </span>
                <input
                  value={imo}
                  onChange={(e) => setImo(e.target.value)}
                  inputMode="numeric"
                  maxLength={7}
                  placeholder="1234567"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">
                  {tr.mmsi}
                </span>
                <input
                  value={mmsi}
                  onChange={(e) => setMmsi(e.target.value)}
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="123456789"
                  className={inputCls}
                />
              </label>
            </>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">
                  {tr.lat}
                </span>
                <input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  inputMode="decimal"
                  placeholder="-33.04"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted">
                  {tr.lng}
                </span>
                <input
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  inputMode="decimal"
                  placeholder="-71.62"
                  className={inputCls}
                />
              </label>
            </>
          )}
        </div>

        {err && (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {err}
          </p>
        )}

        {ocrText.trim() && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-dash-muted">{tr.ocrPreview}</summary>
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-dash-border bg-dash-control p-2 text-[11px] text-dash-fg">
              {ocrText}
            </pre>
          </details>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dash-neon/40 bg-dash-neon/15 px-4 py-2.5 text-sm font-semibold text-dash-neon transition-colors hover:bg-dash-neon/25 disabled:opacity-50"
          >
            <Icon icon="lucide:check" width={14} height={14} />
            {tr.dialogApply}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-dash-muted hover:text-dash-fg"
          >
            {tr.dialogCancel}
          </button>
        </div>
      </div>
    </div>
  );
}
