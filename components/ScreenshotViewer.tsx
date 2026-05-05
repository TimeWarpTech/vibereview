"use client";

import { useEffect, useState } from "react";
import { screenshotUrl } from "@/lib/screenshot";

type Props = { src: string; alt: string };

export function ScreenshotViewer({ src, alt }: Props) {
  const thumb = screenshotUrl(src, 1200);
  const full = screenshotUrl(src, 2400) ?? thumb;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!thumb) {
    return (
      <div className="w-full aspect-video flex items-center justify-center text-[color:var(--muted)]">
        No image
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="screenshot-trigger"
        aria-label="View full screenshot"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={alt}
          className="w-full h-full object-cover aspect-video"
          referrerPolicy="no-referrer"
        />
        <span className="screenshot-trigger__hint">click to expand</span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="screenshot-overlay"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            className="screenshot-overlay__close"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Close"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={full ?? thumb}
            alt={alt}
            className="screenshot-overlay__image"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
