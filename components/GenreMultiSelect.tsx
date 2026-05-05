"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  options: string[];
  selected: string[];
};

export function GenreMultiSelect({ options, selected }: Props) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(selected);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleGenre(value: string) {
    setPicked((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function clearAll() {
    setPicked([]);
    setQuery("");
  }

  return (
    <div className="genre-select" ref={rootRef}>
      {picked.map((value) => (
        <input key={value} type="hidden" name="genre" value={value} />
      ))}

      <button
        type="button"
        className={`genre-select__trigger ${open ? "genre-select__trigger--open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="genre-select__trigger-label">
          {picked.length > 0 ? `${picked.length} genre${picked.length === 1 ? "" : "s"} selected` : "All genres"}
        </span>
        <span className="genre-select__trigger-caret">{open ? "−" : "+"}</span>
      </button>

      {picked.length > 0 ? (
        <div className="genre-select__chips">
          {picked.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleGenre(value)}
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
            placeholder="Search genres..."
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
                    onChange={() => toggleGenre(value)}
                    className="genre-select__checkbox"
                  />
                  <span className="checkbox-mark" />
                  <span className="genre-select__option-label">{value.toUpperCase()}</span>
                </label>
              );
            })}
            {filtered.length === 0 ? (
              <div className="genre-select__empty">No matching genres</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
