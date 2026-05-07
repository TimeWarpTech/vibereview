"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { collectFingerprint } from "@/lib/fingerprint";
import type { IdeaView } from "@/lib/ideas";

type Props = { initialIdeas: IdeaView[]; initialTotal: number; pageSize: number };

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

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString();
}

export function IdeasBoard({ initialIdeas, initialTotal, pageSize }: Props) {
  const [ideas, setIdeas] = useState<IdeaView[]>(initialIdeas);
  const [total, setTotal] = useState<number>(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nextAllowedAt, setNextAllowedAt] = useState<Date | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [sort, setSort] = useState<"top" | "new">("top");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modalOpen]);

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

  useEffect(() => {
    if (!nextAllowedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [nextAllowedAt]);

  const isFirstSort = useRef(true);
  useEffect(() => {
    if (isFirstSort.current) {
      isFirstSort.current = false;
      return;
    }
    let cancelled = false;
    fetch(`/api/ideas?sort=${sort}&limit=${pageSize}&skip=0`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok) {
          setIdeas(data.data as IdeaView[]);
          if (typeof data.total === "number") setTotal(data.total);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sort, pageSize]);

  const hasMore = ideas.length < total;
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        sort,
        skip: String(ideas.length),
        limit: String(pageSize),
      });
      const res = await fetch(`/api/ideas?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) return;
      setIdeas((current) => {
        const seen = new Set(current.map((i) => i.id));
        const merged = [...current];
        for (const i of data.data as IdeaView[]) {
          if (!seen.has(i.id)) {
            seen.add(i.id);
            merged.push(i);
          }
        }
        return merged;
      });
      if (typeof data.total === "number") setTotal(data.total);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, ideas.length, pageSize, sort]);

  useEffect(() => {
    if (!hasMore || loadingMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (body.trim().length < 5) {
      setError("Idea must be at least 5 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          authorName: authorName.trim() || undefined,
          clientFingerprint: fingerprintRef.current ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong.");
        if (data.nextAllowedAt) setNextAllowedAt(new Date(data.nextAllowedAt));
        return;
      }
      setIdeas((prev) => [data.data as IdeaView, ...prev]);
      setTotal((t) => t + 1);
      setBody("");
      setAuthorName("");
      setModalOpen(false);
    } catch {
      setError("Could not reach the API.");
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(id: string, direction: "up" | "down") {
    const prev = ideas;
    setIdeas((list) =>
      list.map((i) => {
        if (i.id !== id) return i;
        const wasUp = i.myVote === "up";
        const wasDown = i.myVote === "down";
        let upCount = i.upCount;
        let downCount = i.downCount;
        let myVote: "up" | "down" | null;
        if (direction === "up") {
          if (wasUp) {
            upCount -= 1;
            myVote = null;
          } else {
            upCount += 1;
            if (wasDown) downCount -= 1;
            myVote = "up";
          }
        } else {
          if (wasDown) {
            downCount -= 1;
            myVote = null;
          } else {
            downCount += 1;
            if (wasUp) upCount -= 1;
            myVote = "down";
          }
        }
        return { ...i, upCount, downCount, votes: upCount - downCount, myVote };
      }),
    );
    try {
      const res = await fetch(`/api/ideas/${id}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          direction,
          clientFingerprint: fingerprintRef.current ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setIdeas(prev);
        return;
      }
      setIdeas((list) =>
        list.map((i) =>
          i.id === id
            ? {
                ...i,
                votes: data.votes,
                upCount: data.upCount,
                downCount: data.downCount,
                myVote: data.myVote,
              }
            : i,
        ),
      );
    } catch {
      setIdeas(prev);
    }
  }

  return (
    <div className="page-stack">
      <div className="form-row">
        <h2 className="pixel-heading" style={{ fontSize: "1.25rem" }}>
          Ideas <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.85rem" }}>({total})</span>
        </h2>
        <div className="ideas-toolbar">
          <div className="ideas-sort" role="tablist" aria-label="Sort ideas">
            <button
              type="button"
              role="tab"
              aria-selected={sort === "top"}
              onClick={() => setSort("top")}
              className={`ideas-sort__tab ${sort === "top" ? "ideas-sort__tab--active" : ""}`}
            >
              Top
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sort === "new"}
              onClick={() => setSort("new")}
              className={`ideas-sort__tab ${sort === "new" ? "ideas-sort__tab--active" : ""}`}
            >
              New
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            className="arcade-button arcade-button--yellow"
          >
            + New idea
          </button>
        </div>
      </div>

      {modalOpen ? (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Submit a new idea"
          >
            <form onSubmit={submit} className="review-form">
              <div className="review-form__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>share an idea</span>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="arcade-button"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="form-stack">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your name (optional)"
                  maxLength={60}
                  className="retro-input"
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What should VibeReview do next?"
                  maxLength={1000}
                  rows={5}
                  required
                  autoFocus
                  className="retro-textarea"
                />
                {error ? <p className="form-error">{error}</p> : null}
                {nextAllowedAt ? (
                  <p className="form-hint">
                    You can submit again in {formatCooldown(nextAllowedAt.getTime() - now)}.
                  </p>
                ) : null}
                <div className="form-row">
                  <span className="form-hint">{body.length}/1000</span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="arcade-button arcade-button--yellow disabled:opacity-50"
                  >
                    {submitting ? "Posting..." : "Submit Idea"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ul className="review-list">
        {ideas.length === 0 ? (
          <li className="review-card">No ideas yet — be the first.</li>
        ) : null}
        {ideas.map((i) => (
          <li key={i.id} className="review-card">
            <div className="review-card__top">
              <div className="review-card__author">
                <div className="idea-vote-inline">
                  <button
                    type="button"
                    onClick={() => vote(i.id, "up")}
                    className={`idea-vote-btn ${i.myVote === "up" ? "idea-vote-btn--up" : ""}`}
                    aria-pressed={i.myVote === "up"}
                    title={i.myVote === "up" ? "Remove upvote" : "Upvote"}
                  >
                    ▲ {i.upCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => vote(i.id, "down")}
                    className={`idea-vote-btn ${i.myVote === "down" ? "idea-vote-btn--down" : ""}`}
                    aria-pressed={i.myVote === "down"}
                    title={i.myVote === "down" ? "Remove downvote" : "Downvote"}
                  >
                    ▼ {i.downCount}
                  </button>
                </div>
                <strong>{i.authorName}</strong>
                {i.fpId ? (
                  <span className="review-card__fp" title="Device fingerprint id">
                    #{i.fpId}
                  </span>
                ) : null}
                {i.verdict ? (
                  <span
                    className={`idea-flag idea-flag--${i.verdict}`}
                    title={`Verdict: ${i.verdict}`}
                  >
                    {i.verdict}
                  </span>
                ) : null}
              </div>
              <span className="review-card__date">{formatDate(i.createdAt)}</span>
            </div>
            <p className="review-card__body whitespace-pre-wrap">{i.body}</p>
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} className="infinite-sentinel">
        {hasMore ? (
          loadingMore ? (
            "Loading more ideas..."
          ) : (
            <button
              type="button"
              onClick={() => void loadMore()}
              className="arcade-button arcade-button--yellow"
            >
              Load More
            </button>
          )
        ) : ideas.length > 0 ? (
          "End of ideas"
        ) : null}
      </div>
    </div>
  );
}
