import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";

export type ComboboxOption = { id: string; nombre: string };

interface ComboboxInputProps {
  value: string;
  options: ComboboxOption[];
  onSelect: (opt: ComboboxOption) => void;
  onChange: (value: string) => void;
  onBlurExtra?: () => void;
  onAddNew?: (text: string) => Promise<void> | void;
  addNewLabel?: (text: string) => string;
  addingNew?: boolean;
  placeholder?: string;
  label?: string;
  labelExtra?: React.ReactNode;
  inputClass?: string;
  labelClass?: string;
  id?: string;
  disabled?: boolean;
  readOnly?: boolean;
  maxSuggestions?: number;
}

export function ComboboxInput({
  value,
  options,
  onSelect,
  onChange,
  onBlurExtra,
  onAddNew,
  addNewLabel,
  addingNew,
  placeholder,
  label,
  labelExtra,
  inputClass,
  labelClass,
  id,
  disabled,
  readOnly,
  maxSuggestions = 15,
}: ComboboxInputProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});

  const filtered = useMemo(() => {
    const q = value.trim().toUpperCase();
    if (!q) return options.slice(0, maxSuggestions);
    return options.filter((o) => o.nombre.toUpperCase().includes(q)).slice(0, maxSuggestions);
  }, [value, options, maxSuggestions]);

  const exactMatch = useMemo(
    () => options.some((o) => o.nombre.toUpperCase() === value.trim().toUpperCase()),
    [value, options]
  );

  const hasAdd = !!onAddNew && !!value.trim() && !exactMatch;
  const totalItems = filtered.length + (hasAdd ? 1 : 0);

  // Recalcular posición del portal cuando se abre
  useEffect(() => {
    if (!open) return;
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxH = Math.max(120, window.innerHeight - rect.bottom - 12);
    setPortalStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - rect.width - 8),
      width: rect.width,
      maxHeight: maxH,
      zIndex: 9999,
    });
  }, [open, value]); // recalcular también cuando cambia el texto (el input puede cambiar de alto)

  // Scroll automático al ítem resaltado
  useEffect(() => {
    if (highlight < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>("[data-idx]");
    const el = Array.from(items).find((el) => el.dataset.idx === String(highlight));
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const closeDropdown = () => {
    setOpen(false);
    setHighlight(-1);
  };

  const handleSelect = (opt: ComboboxOption) => {
    onSelect(opt);
    closeDropdown();
  };

  const handleAdd = async () => {
    if (!onAddNew || !value.trim()) return;
    await onAddNew(value.trim());
    closeDropdown();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
        setHighlight(0);
      }
      return;
    }
    if (totalItems === 0) {
      if (e.key === "Escape") closeDropdown();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % totalItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + totalItems) % totalItems);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0 && highlight < filtered.length) {
        handleSelect(filtered[highlight]);
      } else if (hasAdd) {
        void handleAdd();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.toUpperCase());
    setOpen(true);
    setHighlight(-1);
  };

  const handleBlur = () => {
    // Pequeño delay para que onMouseDown de los items se ejecute antes de cerrar
    setTimeout(() => {
      closeDropdown();
      onBlurExtra?.();
    }, 200);
  };

  const dropdown =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={listRef}
            className="bg-white border border-neutral-200 rounded-xl shadow-xl overflow-y-auto"
            style={portalStyle}
            onMouseDown={(e) => e.preventDefault()} // evita que el input pierda foco al hacer click
          >
            {filtered.length > 0 || hasAdd ? (
              <>
                {filtered.map((opt, idx) => (
                  <button
                    key={opt.id}
                    type="button"
                    data-idx={idx}
                    onMouseDown={() => handleSelect(opt)}
                    className={`w-full px-4 py-2.5 text-left font-medium transition-colors text-sm border-b border-neutral-50 last:border-b-0 ${
                      highlight === idx
                        ? "bg-brand-blue text-white"
                        : "text-neutral-800 hover:bg-brand-blue/5"
                    }`}
                  >
                    {opt.nombre}
                  </button>
                ))}
                {hasAdd && (
                  <button
                    type="button"
                    data-idx={filtered.length}
                    onMouseDown={() => void handleAdd()}
                    disabled={addingNew}
                    className={`w-full flex items-center gap-1.5 px-4 py-2.5 font-semibold text-xs border-t border-neutral-100 transition-colors disabled:opacity-50 ${
                      highlight === filtered.length
                        ? "bg-brand-blue text-white"
                        : "text-brand-blue hover:bg-brand-blue/5"
                    }`}
                  >
                    <Icon icon="typcn:plus" width={14} height={14} />
                    {addNewLabel ? addNewLabel(value.trim()) : `Agregar "${value.trim()}"`}
                  </button>
                )}
              </>
            ) : (
              <div className="px-4 py-3 text-sm text-neutral-400 text-center">
                Sin resultados
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className={labelClass}>
          {label}
          {options.length > 0 && (
            <span className="ml-2 text-neutral-400 font-normal">({options.length})</span>
          )}
          {labelExtra}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (!readOnly) setOpen(true); }}
        onClick={() => { if (!readOnly) setOpen(true); }}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
        disabled={disabled}
        readOnly={readOnly}
      />
      {dropdown}
    </div>
  );
}
