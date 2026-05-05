type Props = { value: number; size?: "sm" | "md" };

export function StarRating({ value, size = "sm" }: Props) {
  const rounded = Math.round(value);
  const cls = size === "md" ? "star-row--md" : "star-row--sm";

  return (
    <span className={`star-row ${cls}`} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rounded ? "star-row__filled" : "star-row__empty"}>
          ★
        </span>
      ))}
    </span>
  );
}
