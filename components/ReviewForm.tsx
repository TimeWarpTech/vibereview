"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = { gameUrl: string };

export function ReviewForm({ gameUrl }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Honeypot — if filled, bail silently (bot).
    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem("website") as HTMLInputElement | null)?.value;
    if (honeypot) return;

    if (body.trim().length === 0) {
      setError("Write something first.");
      return;
    }

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameUrl, rating, body: body.trim(), authorName: authorName.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setBody("");
    setAuthorName("");
    setRating(5);
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <h3 className="font-semibold">Write a review</h3>

      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Rating</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className={`text-2xl leading-none ${n <= rating ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"} hover:scale-110 transition`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        name="authorName"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        placeholder="Your name (optional)"
        maxLength={60}
        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
      />

      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think?"
        maxLength={2000}
        rows={4}
        required
        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm resize-y"
      />

      {/* Honeypot — hidden from users, attractive to bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{body.length}/2000</span>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Posting…" : "Post review"}
        </button>
      </div>
    </form>
  );
}
