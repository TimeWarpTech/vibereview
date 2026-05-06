import { changelog } from "@/lib/changelog";
import { ChangelogInfinite } from "@/components/ChangelogInfinite";
import "./changelog.css";

export const metadata = {
  title: "Changelog — VibeReview",
  description: "Recent hotfixes, features and tweaks on VibeReview.",
};

const PAGE_SIZE = 5;

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
        <ChangelogInfinite entries={changelog} pageSize={PAGE_SIZE} />
      </section>
    </div>
  );
}
