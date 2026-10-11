// Consignes de sécurité recommandées, pensées pour limiter les blessures et les dégâts.

export const PARTICIPANT_SAFETY_TIPS = [
  "Restez calmes et ne répondez pas aux provocations.",
  "Suivez les consignes du service d'ordre, reconnaissable à ses gilets.",
  "Repérez les postes de secours, les points d'eau et le lieu de dispersion sur la carte.",
  "Buvez régulièrement. En cas de malaise, prévenez le service d'ordre ou appelez le 15 ou le 112.",
  "Gardez les enfants et les personnes fragiles près de vous. Convenez d'un point de rendez-vous si vous êtes séparés.",
  "Respectez le parcours déclaré et les biens : une dégradation nuit à la cause et peut être sanctionnée.",
  "À la fin, dispersez-vous calmement au lieu indiqué.",
];

export const TEAM_SAFETY_TIPS = [
  "Briefez l'équipe avant le départ : rôles, parcours, points de secours, contacts.",
  "Le service d'ordre garde le cortège compact et apaise les tensions par le dialogue, jamais par la force.",
  "Un seul interlocuteur parle aux forces de l'ordre : la personne en charge de la liaison.",
  "Signalez tout incident dans les alertes, même mineur : mieux vaut prévenir trop tôt que trop tard.",
  "Éloignez le cortège de toute personne ou groupe qui cherche l'affrontement, et prévenez la liaison.",
  "En cas de blessé : sécurisez, appelez le 15 ou le 112, envoyez l'équipe secours.",
];

export const DEFAULT_SAFETY_NOTES = PARTICIPANT_SAFETY_TIPS.map((t) => `• ${t}`).join("\n");

export const EMERGENCY_NUMBERS = [
  { label: "SAMU (urgence médicale)", phone: "15" },
  { label: "Police secours", phone: "17" },
  { label: "Pompiers", phone: "18" },
  { label: "Numéro d'urgence européen", phone: "112" },
  { label: "Urgence par SMS (personnes sourdes ou malentendantes)", phone: "114" },
];
