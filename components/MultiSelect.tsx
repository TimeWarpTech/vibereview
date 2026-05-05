"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  name: string;
  options: string[];
  selected: string[];
  onSelectionChange?: (next: string[]) => void;
  placeholderAll: string;
  formatSelected?: (count: number) => string;
  searchPlaceholder?: string;
};

export function MultiSelect({
  name,
  options,
  selected,
  onSelectionChange,
  placeholderAll,
  formatSelected = (c) => `${c} selected`,
  searchPlaceholder = "Search...",
}: Props) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(selected);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingNotify = useRef(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  // Sync internal picked state when the `selected` prop changes externally
  // (e.g. after Reset or URL-driven navigation). Skip notify on prop sync.
  const selectedKey = selected.join("|");
  useEffect(() => {
    setPicked((current) => {
      if (current.join("|") === selectedKey) return current;
      pendingNotify.current = false;
      return selected;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  // Fire onSelectionChange AFTER React commits the new picked state to the
  // DOM, so consumers reading FormData see fresh hidden inputs.
  useEffect(() => {
    if (!pendingNotify.current) return;
    pendingNotify.current = false;
    onSelectionChange?.(picked);
  }, [picked, onSelectionChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(value: string) {
    pendingNotify.current = true;
    setPicked((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function clearAll() {
    pendingNotify.current = true;
    setPicked([]);
    setQuery("");
  }

  return (
    <div className="genre-select" ref={rootRef}>
      {picked.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}

      <button
        type="button"
        className={`genre-select__trigger ${open ? "genre-select__trigger--open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="genre-select__trigger-label">
          {picked.length > 0 ? formatSelected(picked.length) : placeholderAll}
        </span>
        <span className="genre-select__trigger-caret">{open ? "−" : "+"}</span>
      </button>

      {picked.length > 0 ? (
        <div className="genre-select__chips">
          {picked.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className="genre-chip genre-chip--active"
            >
              {value.toUpperCase()}
            </button>
          ))}
          <button type="button" onClick={clearAll} className="genre-chip">
            Clear
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="genre-select__popover">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="retro-input genre-select__search"
          />

          <div className="genre-select__list">
            {filtered.map((value) => {
              const active = picked.includes(value);
              return (
                <label key={value} className="genre-select__option">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(value)}
                    className="genre-select__checkbox"
                  />
                  <span className="checkbox-mark" />
                  <span className="genre-select__option-label">{value.toUpperCase()}</span>
                </label>
              );
            })}
            {filtered.length === 0 ? (
              <div className="genre-select__empty">No matches</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
