"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { collectFingerprint } from "@/lib/fingerprint";

type Props = { gameUrl: string; redirectTo?: string };
const ratingStorageKey = (gameUrl: string) => `vibereview:rating:${gameUrl}`;

export function ReviewForm({ gameUrl, redirectTo }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem(ratingStorageKey(gameUrl));
    const parsed = Number(saved);
    if (parsed >= 1 && parsed <= 5) setRating(parsed);
  }, [gameUrl]);

  const fingerprintRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    collectFingerprint()
      .then((fp) => {
        if (!cancelled) fingerprintRef.current = fp;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nextAllowedAt, setNextAllowedAt] = useState<Date | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!nextAllowedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [nextAllowedAt]);

  function formatCooldown(ms: number): string {
    if (ms <= 0) return "now";
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function handleRatingSelect(nextRating: number) {
    setError(null);
    setRating(nextRating);
    window.localStorage.setItem(ratingStorageKey(gameUrl), String(nextRating));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem("website") as HTMLInputElement | null)?.value;
    if (honeypot) return;

    if (body.trim().length === 0) {
      setError("Write something first.");
      return;
    }

    if (rating < 1) {
      setError("Pick a star rating first.");
      return;
    }

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameUrl,
          rating,
          body: body.trim(),
          authorName: authorName.trim() || undefined,
          clientFingerprint: fingerprintRef.current ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong.");
        if (data.nextAllowedAt) {
          setNextAllowedAt(new Date(data.nextAllowedAt));
        }
        return;
      }
    } catch {
      setError("Could not reach the reviews API.");
      return;
    }

    setBody("");
    setAuthorName("");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} method="post" action="/api/reviews" className="review-form">
      <h3 className="review-form__header">write a review</h3>

      <div className="form-stack">
        <input type="hidden" name="gameUrl" value={gameUrl} />
        {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-300">Rating</span>
          <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label="Rating">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleRatingSelect(n)}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  aria-pressed={n === rating}
                  className={`review-rating__star ${n <= rating ? "review-rating__star--active" : "review-rating__star--inactive"} ${n === rating ? "review-rating__star--selected" : ""}`}
                >
                  {"\u2605"}
                </button>
              ))}
            </div>
            <span className="text-xs text-zinc-400 min-w-24">
              {rating > 0 ? `your vote: ${rating}/5` : "select"}
            </span>
            <select
              name="rating"
              value={rating}
              onChange={(e) => handleRatingSelect(Number(e.target.value))}
              className="retro-select w-auto min-w-28"
              aria-label="Select rating"
            >
              <option value={0}>Choose</option>
              <option value={1}>1/5</option>
              <option value={2}>2/5</option>
              <option value={3}>3/5</option>
              <option value={4}>4/5</option>
              <option value={5}>5/5</option>
            </select>
          </div>
        </div>

        <input
          type="text"
          name="authorName"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={60}
          className="retro-input"
        />

        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you think?"
          maxLength={2000}
          rows={5}
          required
          className="retro-textarea"
        />

        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        {error ? <p className="form-error">{error}</p> : null}
        {nextAllowedAt ? (
          <p className="form-hint">
            You can review again in {formatCooldown(nextAllowedAt.getTime() - now)}.
          </p>
        ) : null}

        <div className="form-row">
          <span className="form-hint">{body.length}/2000</span>
          <button type="submit" disabled={isPending} className="arcade-button arcade-button--yellow disabled:opacity-50">
            {isPending ? "Posting..." : "Post Review"}
          </button>
        </div>
      </div>
    </form>
  );
}
