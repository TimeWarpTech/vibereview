"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  MIN_RATING_OPTIONS,
  SORT_OPTIONS,
  type BrowseSearchParams,
} from "@/lib/gameBrowse";
import { MultiSelect } from "@/components/MultiSelect";

type Props = {
  action: string;
  resetHref: string;
  randomHref: string;
  sp: BrowseSearchParams;
  selectedGenres: string[];
  displayGenres: string[];
  selectedMadeWith: string[];
  madeWithOptions: string[];
  showMinRating?: boolean;
  defaultSort?: string;
};

export function BrowseControls({
  action,
  resetHref,
  randomHref,
  sp,
  selectedGenres,
  displayGenres,
  selectedMadeWith,
  madeWithOptions,
  showMinRating = false,
  defaultSort = "newest",
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Controlled state — kept in sync with sp props via the effects below so the
  // UI always reflects the URL (including after Reset / external navigation).
  const [searchValue, setSearchValue] = useState(sp.q ?? "");
  const [sortValue, setSortValue] = useState(sp.sort ?? defaultSort);
  const [minRatingValue, setMinRatingValue] = useState(sp.min_rating ?? "");
  const [hasPortal, setHasPortal] = useState(sp.has_portal === "Yes");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchValue(sp.q ?? "");
  }, [sp.q]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSortValue(sp.sort ?? defaultSort);
  }, [sp.sort, defaultSort]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinRatingValue(sp.min_rating ?? "");
  }, [sp.min_rating]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasPortal(sp.has_portal === "Yes");
  }, [sp.has_portal]);

  const navigate = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (trimmed.length === 0) continue;
      params.append(key, trimmed);
    }
    params.delete("page");
    const qs = params.toString();
    const url = qs ? `${action}?${qs}` : action;
    router.replace(url, { scroll: false });
  }, [action, router]);

  function submitSoon() {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(navigate, 350);
  }

  function submitNow() {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    navigate();
  }

  function handleChange(e: React.ChangeEvent<HTMLFormElement>) {
    const target = e.target as unknown as { type?: string };
    if (target?.type === "search") {
      submitSoon();
    } else {
      submitNow();
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitNow();
  }

  function handleReset() {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    router.replace(resetHref, { scroll: false });
  }

  return (
    <form
      ref={formRef}
      method="get"
      action={action}
      className="games-controls"
      onChange={handleChange}
      onSubmit={handleSubmit}
    >
      <div className="games-controls__search">
        <input
          id="q"
          type="search"
          name="q"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search games, authors, pitches..."
          className="retro-input"
        />
      </div>

      <ControlRow label="Sort:">
        {SORT_OPTIONS.map((option) => (
          <ControlButton
            key={option.value}
            name="sort"
            value={option.value}
            currentValue={sortValue}
            label={option.label}
            onChange={() => setSortValue(option.value)}
          />
        ))}
      </ControlRow>

      {showMinRating ? (
        <ControlRow label="Min rating:">
          {MIN_RATING_OPTIONS.map((option) => (
            <ControlButton
              key={option.value || "any"}
              name="min_rating"
              value={option.value}
              currentValue={minRatingValue}
              label={option.label}
              onChange={() => setMinRatingValue(option.value)}
            />
          ))}
        </ControlRow>
      ) : null}

      <div className="filter-group">
        <MultiSelect
          name="genre"
          options={displayGenres}
          selected={selectedGenres}
          onSelectionChange={submitNow}
          placeholderAll="All genres"
          formatSelected={(c) => `${c} genre${c === 1 ? "" : "s"} selected`}
          searchPlaceholder="Search genres..."
        />
        <MultiSelect
          name="made_with"
          options={madeWithOptions}
          selected={selectedMadeWith}
          onSelectionChange={submitNow}
          placeholderAll="All tools"
          formatSelected={(c) => `${c} tool${c === 1 ? "" : "s"} selected`}
          searchPlaceholder="Search tools..."
        />
        <PortalCheckbox checked={hasPortal} onChange={setHasPortal} />
      </div>

      <div className="games-controls__actions">
        <Link href={randomHref} className="arcade-button arcade-button--yellow">
          Random Game
        </Link>
        <button type="button" onClick={handleReset} className="arcade-button">
          Reset
        </button>
      </div>
    </form>
  );
}

function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sort-group">
      <label className="sort-label">{label}</label>
      <div className="sort-group__buttons">{children}</div>
    </div>
  );
}

function ControlButton({
  name,
  value,
  currentValue,
  label,
  onChange,
}: {
  name: string;
  value: string;
  currentValue: string;
  label: string;
  onChange: () => void;
}) {
  const isActive = currentValue === value;

  return (
    <label className={`sort-btn ${isActive ? "sort-btn--active" : ""}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={isActive}
        onChange={onChange}
        className="sort-btn__input"
      />
      <span>{label}</span>
    </label>
  );
}

function PortalCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="retro-checkbox">
      <input
        type="checkbox"
        name="has_portal"
        value="Yes"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="retro-checkbox__input"
      />
      <span className="checkbox-mark" />
      HAS PORTAL
    </label>
  );
}
