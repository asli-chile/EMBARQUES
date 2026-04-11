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
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-coords-title"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-mac-modal border border-neutral-200 p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="manual-coords-title" className="text-base font-bold text-brand-blue">
              {tr.manualModalTitle}
            </h2>
            <p className="text-xs text-neutral-500 mt-1">{tr.manualModalHint}</p>
            <p className="text-xs font-medium text-neutral-700 mt-2 truncate" title={vesselLabel}>
              {vesselLabel}
            </p>
            {groupHint ? (
              <p className="text-[11px] text-violet-700/90 mt-2 leading-snug">{groupHint}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label={tr.manualCancel}
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="manual-lat" className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1">
              {tr.manualLatLabel}
            </label>
            <input
              id="manual-lat"
              type="text"
              inputMode="decimal"
              value={latStr}
              onChange={(e) => setLatStr(e.target.value)}
              placeholder="-33.0472"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              disabled={busy}
            />
          </div>
          <div>
            <label htmlFor="manual-lng" className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1">
              {tr.manualLngLabel}
            </label>
            <input
              id="manual-lng"
              type="text"
              inputMode="decimal"
              value={lngStr}
              onChange={(e) => setLngStr(e.target.value)}
              placeholder="-71.6297"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              disabled={busy}
            />
          </div>

          {err && (
            <p className="text-sm text-red-600" role="alert">
              {err}
            </p>
          )}
          {msg && (
            <p className="text-sm text-emerald-600" role="status">
              {msg}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 disabled:opacity-50"
            >
              {busy ? <Icon icon="lucide:loader-2" width={18} height={18} className="animate-spin" /> : null}
              {tr.manualSave}
            </button>
            <button
              type="button"
              disabled={busy || (initialLat == null && initialLng == null)}
              onClick={() => void handleClear()}
              className="px-4 py-2.5 rounded-lg border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
            >
              {tr.manualClear}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-neutral-500 hover:text-neutral-800"
            >
              {tr.manualCancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
