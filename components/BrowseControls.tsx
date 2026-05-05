"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import {
  MADE_WITH_OPTIONS,
  MIN_RATING_OPTIONS,
  SORT_OPTIONS,
  type BrowseSearchParams,
} from "@/lib/gameBrowse";
import { GenreMultiSelect } from "@/components/GenreMultiSelect";

type Props = {
  action: string;
  resetHref: string;
  randomHref: string;
  sp: BrowseSearchParams;
  selectedGenres: string[];
  displayGenres: string[];
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
  showMinRating = false,
  defaultSort = "newest",
}: Props) {
  const sort = sp.sort ?? defaultSort;
  const formRef = useRef<HTMLFormElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function submitSoon() {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => formRef.current?.requestSubmit(), 350);
  }

  function submitNow() {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    formRef.current?.requestSubmit();
  }

  function handleChange(e: React.ChangeEvent<HTMLFormElement>) {
    const target = e.target as unknown as { type?: string };
    if (target?.type === "search") {
      submitSoon();
    } else {
      submitNow();
    }
  }

  return (
    <form
      ref={formRef}
      method="get"
      action={action}
      className="games-controls"
      onChange={handleChange}
    >
      <div className="games-controls__search">
        <input
          id="q"
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
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
            currentValue={sort}
            label={option.label}
          />
        ))}
      </ControlRow>

      <ControlRow label="Made with:">
        {MADE_WITH_OPTIONS.map((option) => (
          <ControlButton
            key={option.value}
            name="made_with"
            value={option.value}
            currentValue={sp.made_with ?? ""}
            label={option.label}
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
              currentValue={sp.min_rating ?? ""}
              label={option.label}
            />
          ))}
        </ControlRow>
      ) : null}

      <div className="filter-group">
        <GenreMultiSelect
          options={displayGenres}
          selected={selectedGenres}
          onSelectionChange={submitNow}
        />
        <GenreCheckbox value="Yes" checked={sp.has_portal === "Yes"} label="Has Portal" name="has_portal" />
      </div>

      <div className="games-controls__actions">
        <Link href={randomHref} className="arcade-button arcade-button--yellow">
          Random Game
        </Link>
        <Link href={resetHref} className="arcade-button">
          Reset
        </Link>
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
}: {
  name: string;
  value: string;
  currentValue: string;
  label: string;
}) {
  const isActive = currentValue === value;

  return (
    <label className={`sort-btn ${isActive ? "sort-btn--active" : ""}`}>
      <input type="radio" name={name} value={value} defaultChecked={isActive} className="sort-btn__input" />
      <span>{label}</span>
    </label>
  );
}

function GenreCheckbox({
  value,
  checked,
  label,
  name = "genre",
}: {
  value: string;
  checked: boolean;
  label: string;
  name?: string;
}) {
  return (
    <label className="retro-checkbox">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="retro-checkbox__input"
      />
      <span className="checkbox-mark" />
      {label.toUpperCase()}
    </label>
  );
}
