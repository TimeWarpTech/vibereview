import "./ranking.css";
import { safeAggregateByGame } from "@/lib/reviews";
import {
  buildRankedGames,
  topRatedScore,
  TOP_RATED_PRIOR_VOTES,
  TOP_RATED_PRIOR_MEAN,
} from "@/lib/gameBrowse";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ranking — VibeReview",
  description: "How VibeReview sorts the Top Rated list.",
};

export default async function RankingPage() {
  const aggMap = await safeAggregateByGame();
  const ranked = buildRankedGames({ sort: "top_rated" }, aggMap);
  const sample = ranked.filter((r) => r.reviewCount > 0).slice(0, 5);
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <h1 className="pixel-heading">RANKING</h1>
        <p className="hero-copy">
          How the Top Rated list is sorted, and why a 5.0 with 2 reviews
          doesn&apos;t always beat a 4.8 with 10.
        </p>
      </section>

      <section className="ranking-section">
        <h2>The problem</h2>
        <p>
          A simple average rewards luck. Three perfect 5★ reviews give a 5.0,
          but that&apos;s a tiny sample — one bad review would tank it. A game
          with a 4.8 average over 40 reviews is a stronger signal of quality,
          even though the raw number is lower.
        </p>
        <p>
          Sorting by raw average puts low-volume games on top by accident.
          Sorting by review count alone ignores quality. We want both.
        </p>
      </section>

      <section className="ranking-section">
        <h2>Bayesian average</h2>
        <p>
          Top Rated uses a Bayesian average — every game is treated as if it
          had a few extra phantom votes at a neutral rating. Games with many
          real reviews barely feel the prior; games with very few are pulled
          toward the neutral score.
        </p>
        <div className="ranking-formula">
{`score = (n · avg + k · m) / (n + k)

n   = number of reviews
avg = actual average rating
k   = prior weight (${TOP_RATED_PRIOR_VOTES} votes)
m   = prior mean (${TOP_RATED_PRIOR_MEAN.toFixed(1)})`}
        </div>
        <p>
          With <strong>k = {TOP_RATED_PRIOR_VOTES}</strong> and{" "}
          <strong>m = {TOP_RATED_PRIOR_MEAN.toFixed(1)}</strong>, the prior is
          light. It only matters when review counts are small. Once a game has
          ~10+ reviews, the score is essentially the real average.
        </p>
      </section>

      <section className="ranking-section">
        <h2>Live example</h2>
        {sample.length > 0 ? (
          <>
            <p>
              The current top {sample.length} reviewed game
              {sample.length === 1 ? "" : "s"} on the site, scored under the
              formula above:
            </p>
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Game</th>
                  <th>Avg</th>
                  <th>Reviews</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {sample.map((r, i) => (
                  <tr key={r.game.game_url}>
                    <td>{i + 1}</td>
                    <td>{r.game.game_name}</td>
                    <td>{r.avgRating.toFixed(1)}</td>
                    <td>{r.reviewCount}</td>
                    <td>{topRatedScore(r.reviewCount, r.avgRating).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p>No reviewed games yet — once reviews start coming in, the live ranking will appear here.</p>
        )}
        <p>
          The displayed star average stays the real number — only the internal
          ranking score is weighted.
        </p>
      </section>

      <section className="ranking-section">
        <h2>One author, one vote</h2>
        <p>
          Anyone can post as many reviews as they want — but for the rating that
          matters (the average shown on the game page), all reviews from the
          same author are <strong>collapsed into a single vote</strong> using
          their own internal average. So six 5★ reviews from one person count
          the same as one 5★ review.
        </p>
        <p>
          This means the rating is resistant to spam: posting the same review
          ten times doesn&apos;t move the needle. It also means a single
          determined troll can&apos;t tank a game by spamming 1★ — they get one
          1★ vote, not ten.
        </p>
        <div className="ranking-formula">
{`per_game_average
  = average over distinct authors
      of (each author's own average)`}
        </div>
        <p>
          On the game page, multi-review authors show up as a single card with
          the average of their own ratings up top, the most recent review
          below, and a &quot;Show N previous reviews&quot; expander that opens a
          tree view of the rest.
        </p>
      </section>

      <section className="ranking-section">
        <h2>Identifying authors</h2>
        <p>
          Anonymity is a product requirement — there&apos;s no login. To
          identify the same person across reviews without an account, three
          signals are combined, in order of strength:
        </p>
        <ol>
          <li>
            <strong>Device fingerprint</strong> — a SHA-256 hash of canvas
            rendering, WebGL renderer/vendor, OfflineAudioContext output,
            installed font probes, screen, timezone and user-agent. Stable
            across cookie clears, browser restarts, and most VPN switches.
          </li>
          <li>
            <strong>Anonymous client cookie</strong> — a random UUID stored in
            an <code>httpOnly</code> cookie (<code>vr_uid</code>) for one year.
            Survives IP changes; cleared when the user wipes cookies.
          </li>
          <li>
            <strong>IP hash</strong> — SHA-256 of the request IP plus a server
            secret. Raw IPs are never stored. Last-resort signal — shared
            networks (campus Wi-Fi, mobile carriers) collapse onto one hash.
          </li>
        </ol>
        <p>
          For grouping, the strongest available signal wins:{" "}
          <code>fingerprint → cookie → ip</code>. Each review carries an
          opaque, truncated fingerprint id (e.g. <code>#a1b2c3d4</code>) shown
          on the card so repeat authors are visible at a glance.
        </p>
      </section>

      <section className="ranking-section">
        <h2>Tiebreakers</h2>
        <ol>
          <li>Higher Bayesian score wins.</li>
          <li>If scores tie, more reviews wins.</li>
          <li>If review counts also tie, higher raw average wins.</li>
        </ol>
      </section>

      <section className="ranking-section">
        <h2>Other sorts</h2>
        <ul>
          <li>
            <strong>Newest</strong> — sorts by the game&apos;s submission
            timestamp. Reviews don&apos;t affect this.
          </li>
          <li>
            <strong>Most Reviewed</strong> — pure review count, with average as
            the tiebreaker.
          </li>
        </ul>
      </section>

      <section className="ranking-section">
        <h2>Star display</h2>
        <p>
          Stars use fractional fills — a 4.5 average shows four-and-a-half
          stars filled, not five. The numeric score (e.g. <code>4.8 (4)</code>)
          is shown next to the stars so close averages are easy to tell apart.
        </p>
      </section>
    </div>
  );
}
