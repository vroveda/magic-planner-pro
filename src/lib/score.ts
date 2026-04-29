export type Condition = "excellent" | "good" | "normal" | "bad" | "avoid" | "unknown";

export function computeCondition(current: number | null | undefined, hist: number | null | undefined): {
  condition: Condition;
  deviation: number | null;
} {
  if (current == null || hist == null || hist <= 0) return { condition: "unknown", deviation: null };
  const dev = (current - hist) / hist;
  let condition: Condition;
  if (dev > 0.3) condition = "avoid";
  else if (dev > 0.1) condition = "bad";
  else if (dev >= -0.1) condition = "normal";
  else if (dev >= -0.3) condition = "good";
  else condition = "excellent";
  return { condition, deviation: dev };
}

export const conditionMeta: Record<Condition, { label: string; emoji: string; color: string; bg: string }> = {
  excellent: { label: "Excelente", emoji: "🟢", color: "text-success", bg: "bg-success/15" },
  good:      { label: "Boa",       emoji: "🟡", color: "text-warning", bg: "bg-warning/15" },
  normal:    { label: "Normal",    emoji: "⚪", color: "text-muted-foreground", bg: "bg-muted" },
  bad:       { label: "Ruim",      emoji: "🟠", color: "text-warning", bg: "bg-warning/25" },
  avoid:     { label: "Evitar",    emoji: "🔴", color: "text-danger",  bg: "bg-danger/15" },
  unknown:   { label: "Sem dados", emoji: "⚫", color: "text-muted-foreground", bg: "bg-muted/40" },
};

// Haversine distance in meters
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Walk time minutes using the 1.4x correction factor (avg 80 m/min walk -> ~57 m/min effective)
export function walkMinutes(distM: number): number {
  const correctedM = distM * 1.4;
  const metersPerMin = 80;
  return Math.max(1, Math.round(correctedM / metersPerMin));
}
