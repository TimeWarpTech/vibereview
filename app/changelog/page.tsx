import { changelog, type ChangelogKind } from "@/lib/changelog";
import "./changelog.css";

export const metadata = {
  title: "Changelog — VibeReview",
  description: "Recent hotfixes, features and tweaks on VibeReview.",
};

const kindLabel: Record<ChangelogKind, string> = {
  fix: "hotfix",
  feature: "feature",
  tweak: "tweak",
};

export default function ChangelogPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <h1 className="pixel-heading">CHANGELOG</h1>
        <p className="hero-copy">
          Everything fixed, tweaked or added to VibeReview. Newest on top.
        </p>
      </section>

      <section>
        <ul className="changelog-list">
          {changelog.map((entry, i) => (
            <li key={`${entry.date}-${i}`} className="changelog-item">
              <div className="changelog-item__meta">
                <span className={`changelog-tag changelog-tag--${entry.kind}`}>
                  {kindLabel[entry.kind]}
                </span>
                <time className="changelog-date" dateTime={entry.date}>
                  {entry.date}
                </time>
              </div>
              <h2 className="changelog-title">{entry.title}</h2>
              <p className="changelog-body">{entry.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
