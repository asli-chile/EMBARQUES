"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

type TrackingPageTr = {
  manualModalTitle: string;
  manualModalHint: string;
  manualLatLabel: string;
  manualLngLabel: string;
  manualSave: string;
  manualClear: string;
  manualCancel: string;
  manualInvalid: string;
  manualSaved: string;
  manualCleared: string;
  manualSaveError: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialLat: number | null;
  initialLng: number | null;
  vesselLabel: string;
  /** Sincronización por nave/víaje vs solo operación actual */
  groupHint?: string | null;
  tr: TrackingPageTr;
  onSave: (lat: number, lng: number) => Promise<{ ok: boolean; message?: string }>;
  onClear: () => Promise<{ ok: boolean; message?: string }>;
};

function parseCoord(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function ManualTrackingCoordsModal({
  open,
  onClose,
  initialLat,
  initialLng,
  vesselLabel,
  groupHint,
  tr,
  onSave,
  onClear,
}: Props) {
  const [latStr, setLatStr] = useState("");
  const [lngStr, setLngStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLatStr(initialLat != null ? String(initialLat) : "");
    setLngStr(initialLng != null ? String(initialLng) : "");
    setMsg(null);
    setErr(null);
  }, [open, initialLat, initialLng]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const lat = parseCoord(latStr);
    const lng = parseCoord(lngStr);
    if (lat == null || lng == null) {
      setErr(tr.manualInvalid);
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setErr(tr.manualInvalid);
      return;
    }
    setBusy(true);
    try {
      const r = await onSave(lat, lng);
      if (!r.ok) {
        setErr(r.message ?? tr.manualSaveError);
        return;
      }
      setMsg(tr.manualSaved);
      window.setTimeout(() => onClose(), 600);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const r = await onClear();
      if (!r.ok) {
        setErr(r.message ?? tr.manualSaveError);
        return;
      }
      setLatStr("");
      setLngStr("");
      setMsg(tr.manualCleared);
      window.setTimeout(() => onClose(), 600);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-coords-title"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        className="dash-card w-full max-w-md rounded-2xl border border-dash-border p-5 sm:p-6 shadow-[0_0_40px_-12px_color-mix(in_srgb,var(--dash-neon)_45%,transparent)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 h-[3px] rounded-full bg-gradient-to-r from-dash-neon to-dash-neon-hot" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="manual-coords-title" className="text-base font-bold text-dash-fg">
              {tr.manualModalTitle}
            </h2>
            <p className="mt-1 text-xs text-dash-muted">{tr.manualModalHint}</p>
            <p className="mt-2 truncate text-xs font-medium text-dash-fg" title={vesselLabel}>
              {vesselLabel}
            </p>
            {groupHint ? (
              <p className="mt-2 text-[11px] leading-snug text-violet-300/90">{groupHint}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="rounded-lg p-1.5 text-dash-muted transition-colors hover:bg-dash-control hover:text-dash-fg"
            aria-label={tr.manualCancel}
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="manual-lat"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted"
            >
              {tr.manualLatLabel}
            </label>
            <input
              id="manual-lat"
              type="text"
              inputMode="decimal"
              value={latStr}
              onChange={(e) => setLatStr(e.target.value)}
              placeholder="-33.0472"
              className="dash-control w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
              disabled={busy}
            />
          </div>
          <div>
            <label
              htmlFor="manual-lng"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-muted"
            >
              {tr.manualLngLabel}
            </label>
            <input
              id="manual-lng"
              type="text"
              inputMode="decimal"
              value={lngStr}
              onChange={(e) => setLngStr(e.target.value)}
              placeholder="-71.6297"
              className="dash-control w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dash-neon/40"
              disabled={busy}
            />
          </div>

          {err && (
            <p className="text-sm text-red-300" role="alert">
              {err}
            </p>
          )}
          {msg && (
            <p className="text-sm text-emerald-300" role="status">
              {msg}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" disabled={busy} className="dash-cta inline-flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50">
              {busy ? <Icon icon="lucide:loader-2" width={18} height={18} className="animate-spin" /> : null}
              {tr.manualSave}
            </button>
            <button
              type="button"
              disabled={busy || (initialLat == null && initialLng == null)}
              onClick={() => void handleClear()}
              className="dash-control px-4 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {tr.manualClear}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-dash-muted hover:text-dash-fg"
            >
              {tr.manualCancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
