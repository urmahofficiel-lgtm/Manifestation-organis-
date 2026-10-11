import { daysUntil } from "./declaration";

// « Aujourd'hui », « Demain », « J-12 » ou « Passé »
export function countdownLabel(startsAt: string, now: Date = new Date()): string {
  const d = daysUntil(new Date(startsAt), now);
  if (d < 0) return "Passé";
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Demain";
  return `J-${d}`;
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
