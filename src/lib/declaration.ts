// Calcul indicatif de la date limite de déclaration d'une manifestation sur la voie publique.
// Règle : déclaration au moins « trois jours francs » avant (article L211-1 du Code de la sécurité intérieure).
// Les jours francs excluent le jour du dépôt et le jour de la manifestation.
// Donc le dernier jour possible est la date de la manifestation moins 4 jours.
// Ce calcul est indicatif : à vérifier auprès de la préfecture ou d'un juriste.

const DAY_MS = 24 * 60 * 60 * 1000;

export function declarationDeadline(startsAt: Date): Date {
  const eventDay = new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate());
  return new Date(eventDay.getTime() - 4 * DAY_MS);
}

export function daysUntil(target: Date, now: Date): number {
  const a = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((a - b) / DAY_MS);
}
