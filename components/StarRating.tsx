type Props = { value: number; size?: "sm" | "md" };

export function StarRating({ value, size = "sm" }: Props) {
  const rounded = Math.round(value);
  const cls = size === "md" ? "text-lg" : "text-sm";
  return (
    <span className={`inline-flex gap-0.5 ${cls}`} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rounded ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"}>
          ★
        </span>
      ))}
    </span>
  );
}
