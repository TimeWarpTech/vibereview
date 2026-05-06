type Props = { value: number; size?: "sm" | "md" };

export function StarRating({ value, size = "sm" }: Props) {
  const clamped = Math.max(0, Math.min(5, value));
  const cls = size === "md" ? "star-row--md" : "star-row--sm";
  const percent = (clamped / 5) * 100;

  return (
    <span
      className={`star-row--fractional ${cls}`}
      aria-label={`${clamped.toFixed(1)} out of 5`}
    >
      <span className="star-row__track" aria-hidden="true">★★★★★</span>
      <span
        className="star-row__fill"
        aria-hidden="true"
        style={{ width: `${percent}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}
