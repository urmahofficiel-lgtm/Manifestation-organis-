// Idées de slogans par thème, pour aider l'équipe à démarrer. Modifiables et à adapter à votre cause.
import type { ThemeId } from "./types";

export const SLOGAN_IDEAS: Record<ThemeId, string[]> = {
  climat: ["Pour un futur vivable", "Justice climatique, maintenant", "Il n'y a pas de planète B"],
  travail: ["Salaire digne, vie digne", "Nos emplois, nos droits", "Le travail mérite le respect"],
  droits: ["Nos droits ne se négocient pas", "Égalité pour toutes et tous", "Liberté, égalité, fraternité"],
  education: ["L'école est un bien commun", "Des moyens pour apprendre", "L'avenir se construit à l'école"],
  sante: ["Soigner n'est pas un luxe", "Un hôpital public pour toutes et tous", "La santé, un droit partout"],
  logement: ["Un toit, c'est un droit", "Des loyers justes", "Un logement digne pour chacun"],
  paix: ["La paix, pas la guerre", "Ensemble pour la paix", "Désarmons les conflits"],
  culture: ["La culture n'est pas un luxe", "Des lieux ouverts à toutes et tous", "Créer, transmettre, partager"],
  autre: ["Ensemble, on est plus forts", "Nos voix comptent", "Mobilisons-nous"],
};
