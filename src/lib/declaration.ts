// Calcul indicatif de la période de déclaration d'une manifestation sur la voie publique.
// Règle (article L211-2 du Code de la sécurité intérieure) : la déclaration est faite au moins
// trois jours francs et au plus quinze jours francs avant la manifestation.
// Les jours francs excluent le jour du dépôt et le jour de la manifestation.
// Dernier jour de dépôt : date de la manifestation moins 4 jours.
// Premier jour de dépôt : date de la manifestation moins 16 jours.
// Ce calcul est indicatif : à vérifier auprès de la mairie ou de la préfecture compétente.

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function declarationDeadline(startsAt: Date): Date {
  return new Date(startOfDay(startsAt).getTime() - 4 * DAY_MS);
}

export function declarationEarliest(startsAt: Date): Date {
  return new Date(startOfDay(startsAt).getTime() - 16 * DAY_MS);
}

export function daysUntil(target: Date, now: Date): number {
  return Math.round((startOfDay(target).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export type DeclarationWindow = "trop_tot" | "ouverte" | "depassee";

export function declarationWindow(startsAt: Date, now: Date): DeclarationWindow {
  const today = startOfDay(now).getTime();
  if (today < declarationEarliest(startsAt).getTime()) return "trop_tot";
  if (today > declarationDeadline(startsAt).getTime()) return "depassee";
  return "ouverte";
}
