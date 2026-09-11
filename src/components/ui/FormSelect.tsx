import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";

export type FormSelectOption = { value: string; label: string };

type FormSelectProps = {
  id?: string;
  name?: string;
  value: string;
  options: FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  /** Icono a la izquierda del campo. */
  icon?: string;
  /** Estilo neón (páginas dash-neon). El panel en portal respeta data-erp-neon. */
  variant?: "default" | "neon";
};

export function FormSelect({
  id,
  name: _name,
  value,
  options,
  placeholder = "Seleccionar...",
  disabled,
  onChange,
  icon,
  variant = "default",
}: FormSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const listId = `${id ?? uid}-list`;
  const selected = options.find((o) => o.value === value);
  const items = [{ value: "", label: placeholder }, ...options];
  const neon = variant === "neon";

  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxH = Math.max(140, window.innerHeight - rect.bottom - 12);
    setPortalStyle({
      position: "fixed",
      top: rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - Math.max(rect.width, 240) - 8),
      width: Math.max(rect.width, 240),
      maxHeight: maxH,
      zIndex: 9999,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      setHighlight(Math.max(0, items.findIndex((i) => i.value === value)));
      return;
    }
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[highlight] ?? items[0];
      if (item) choose(item.value);
    }
  };

  const btnClass = neon
    ? `relative flex w-full min-h-[3.25rem] items-center gap-3 rounded-lg border px-3.5 pr-10 text-left text-base font-semibold transition-all erp-neon-control ${
        open ? "ring-2 ring-[color-mix(in_srgb,var(--erp-neon)_40%,transparent)]" : ""
      } ${selected ? "" : "text-[color:var(--erp-muted)]"} disabled:cursor-not-allowed disabled:opacity-70`
    : `relative flex w-full min-h-[3.25rem] items-center gap-3 rounded-lg border px-3.5 pr-10 text-left text-base font-semibold transition-all ${
        open
          ? "border-brand-blue bg-white ring-2 ring-brand-blue/25 shadow-sm"
          : "border-brand-blue/20 bg-white hover:border-brand-blue/45 shadow-[0_1px_2px_rgba(17,34,78,0.06)]"
      } ${selected ? "text-brand-blue" : "text-brand-blue/45"} disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100`;

  return (
    <div className="relative min-w-0">
      <button
        ref={btnRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        onKeyDown={onKeyDown}
        className={btnClass}
      >
        {icon ? (
          <Icon
            icon={icon}
            width={22}
            height={22}
            className={`shrink-0 ${neon ? "text-[color:var(--erp-neon)]" : "text-brand-blue"}`}
          />
        ) : null}
        <span className="block min-w-0 flex-1 truncate">{selected?.label || placeholder}</span>
        <Icon
          icon="lucide:chevron-down"
          width={18}
          height={18}
          className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-transform ${
            neon ? "text-[color:var(--erp-muted)]" : "text-brand-blue/50"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              className={
                neon
                  ? "erp-neon-panel rounded-xl border overflow-y-auto py-1.5 shadow-lg"
                  : "rounded-xl border border-brand-blue/15 bg-white shadow-[0_16px_40px_rgba(17,34,78,0.18)] overflow-y-auto py-1.5"
              }
              style={portalStyle}
            >
              {items.map((item, idx) => {
                const active = item.value === value;
                const hi = idx === highlight;
                return (
                  <button
                    key={`${item.value}-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(item.value);
                    }}
                    className={
                      neon
                        ? `w-full px-4 py-2.5 text-left text-base font-medium truncate ${
                            hi || active ? "erp-neon-option-active" : "erp-neon-option"
                          }`
                        : `w-full px-4 py-2.5 text-left text-base font-medium truncate ${
                            hi || active
                              ? "bg-brand-blue text-white"
                              : "text-brand-blue hover:bg-[#EEF3FA]"
                          }`
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
