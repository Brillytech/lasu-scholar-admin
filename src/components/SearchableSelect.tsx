import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SearchableSelectOption = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
};

type SearchableSelectProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export default function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage = "No option found",
  disabled = false,
  clearable = true,
  className = "",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((item) => item.value === value) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return options;

    return options.filter((item) => {
      return (
        item.label.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      );
    });
  }, [options, query]);

  function closeMenu() {
    setOpen(false);
    setQuery("");
  }

  function updateMenuPosition() {
    if (!wrapRef.current) return;

    const rect = wrapRef.current.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 14;
    const belowSpace = window.innerHeight - rect.bottom - viewportPadding;
    const aboveSpace = rect.top - viewportPadding;
    const preferredHeight = 320;
    const openUp = belowSpace < 220 && aboveSpace > belowSpace;
    const maxHeight = Math.max(180, Math.min(preferredHeight, openUp ? aboveSpace - gap : belowSpace - gap));

    setMenuPosition({
      top: openUp ? Math.max(viewportPadding, rect.top - maxHeight - gap) : rect.bottom + gap,
      left: Math.max(viewportPadding, rect.left),
      width: rect.width,
      maxHeight,
    });
  }

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;

      closeMenu();
    }

    function handleReposition() {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  function selectValue(nextValue: string, optionDisabled?: boolean) {
    if (optionDisabled) return;
    onChange(nextValue);
    closeMenu();
  }

  const menu =
    open && !disabled && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
            className="fixed z-[99999] overflow-hidden rounded-3xl border border-orange/10 bg-white/95 shadow-2xl shadow-navy/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95"
          >
            <div className="flex h-12 items-center gap-2 border-b border-orange/10 px-4 dark:border-white/10">
              <Search size={16} className="text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder || "Search..."}
                className="w-full bg-transparent text-sm font-bold text-navy outline-none placeholder:text-slate-400 dark:text-white"
              />
            </div>

            <div
              style={{ maxHeight: Math.max(120, menuPosition.maxHeight - 48) }}
              className="overflow-y-auto p-2"
            >
              {filteredOptions.length === 0 ? (
                <div className="rounded-2xl px-4 py-5 text-center text-sm font-bold text-slate-400">
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((item) => {
                  const active = item.value === value;

                  return (
                    <button
                      key={`${item.value}-${item.label}`}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => selectValue(item.value, item.disabled)}
                      className={`flex w-full items-start justify-between gap-3 rounded-2xl px-4 py-3 text-left transition ${
                        active
                          ? "bg-orange text-white"
                          : "text-navy hover:bg-orange/10 hover:text-orange dark:text-white dark:hover:bg-white/10"
                      } ${item.disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{item.label}</span>
                        {item.description && (
                          <span
                            className={`mt-1 block truncate text-xs font-semibold ${
                              active ? "text-white/80" : "text-slate-400"
                            }`}
                          >
                            {item.description}
                          </span>
                        )}
                      </span>

                      {active && <Check size={17} className="mt-0.5 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`relative block ${className}`} ref={wrapRef}>
      {label && (
        <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
          {label}
        </span>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-orange/10 bg-soft px-4 text-left text-sm font-bold text-navy outline-none transition focus:border-orange dark:border-white/10 dark:bg-white/10 dark:text-white ${
          disabled ? "cursor-not-allowed opacity-60" : "hover:border-orange/40"
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-slate-400"}`}>
          {selected?.label || placeholder || "Select option"}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
                setQuery("");
              }}
              className="grid h-6 w-6 place-items-center rounded-full bg-white/70 text-slate-400 transition hover:bg-orange hover:text-white dark:bg-slate-950/40"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={17}
            className={`text-slate-400 transition ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {menu}
    </div>
  );
}
