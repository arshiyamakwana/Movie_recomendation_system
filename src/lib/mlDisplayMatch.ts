import { Movie } from "@/types/movie";

/** Lowest percent shown in a batch so the spread still feels meaningful (best in batch hits 100). */
const DISPLAY_FLOOR = 52;

/**
 * Maps raw cosine-style scores (often 0.15–0.45) to a 52–100% display range per batch.
 * The strongest match in the list always shows 100% — raw ML scores rarely equal 1.0.
 */
export function withDisplayMatchPercent<T extends Movie>(items: T[]): T[] {
  if (items.length === 0) return items;
  const scored = items.filter((m) => m._score !== undefined);
  if (scored.length === 0) return items;

  const values = scored.map((m) => m._score!);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1e-9;

  return items.map((m) => {
    if (m._score === undefined) return m;
    const t = (m._score - min) / span;
    const pct = Math.round(DISPLAY_FLOOR + t * (100 - DISPLAY_FLOOR));
    return { ...m, _displayMatchPercent: pct };
  });
}
