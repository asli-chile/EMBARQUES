import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";

type ComboboxOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type ComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  icon?: string;
};

export function Combobox({
  value,
  onChange,
  onBlur,
  options,
  placeholder = "Buscar...",
  disabled = false,
  className = "",
  icon,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(value.toLowerCase())
  );

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (open && focused) updatePosition();
  }, [open, focused, updatePosition]);

  useEffect(() => {
    if (!open || !focused) return;
    const onScroll = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, focused, updatePosition]);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
        setFocused(false);
        onBlur?.();
      }
    },
    [onBlur]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const handleSelect = (option: ComboboxOption) => {
    onChange(option.value);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (!open) setOpen(true);
  };

  const handleFocus = () => {
    setFocused(true);
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = open && focused && !disabled;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        {icon && (
          <Icon
            icon={icon}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5 pointer-events-none"
          />
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
          style={icon ? { paddingLeft: "2rem" } : undefined}
        />
        <Icon
          icon={open ? "lucide:chevron-up" : "lucide:chevron-down"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 w-3.5 h-3.5 pointer-events-none"
        />
      </div>

      {showDropdown &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="z-[9999] max-h-48 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-neutral-400 text-center">
                {value.trim() ? "Sin coincidencias" : "Sin opciones"}
              </div>
            ) : (
              filtered.map((option) => {
                const isActive = option.value.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={option.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                      isActive
                        ? "bg-brand-blue/5 text-brand-blue font-medium"
                        : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.sublabel && (
                        <span className="block text-[10px] text-neutral-400 truncate">
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <Icon
                        icon="lucide:check"
                        className="w-3.5 h-3.5 text-brand-blue shrink-0"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
