// Constantes partagées par toute l'application (libellés en français).

export const THEMES = [
  { id: "climat", label: "Climat" },
  { id: "travail", label: "Travail" },
  { id: "droits", label: "Droits" },
  { id: "education", label: "Éducation" },
  { id: "sante", label: "Santé" },
  { id: "logement", label: "Logement" },
  { id: "paix", label: "Paix" },
  { id: "culture", label: "Culture" },
  { id: "autre", label: "Autre" },
] as const;

export const STATUSES = [
  { id: "brouillon", label: "Brouillon" },
  { id: "a_declarer", label: "À déclarer" },
  { id: "declare", label: "Déclaré" },
  { id: "confirme", label: "Confirmé" },
  { id: "termine", label: "Terminé" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type StatusId = (typeof STATUSES)[number]["id"];
export type Role = "owner" | "organizer" | "member";

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Propriétaire",
  organizer: "Organisateur",
  member: "Membre",
};

// Forme des lignes renvoyées par la base (noms de colonnes identiques au SQL).
export type EventRow = {
  id: string;
  title: string;
  description: string;
  theme: ThemeId;
  status: StatusId;
  starts_at: string;
  ends_at: string | null;
  place_name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  expected_count: number | null;
  created_by: string;
  created_at: string;
};

export type Profile = { id: string; email: string; full_name: string };

export type MemberRow = { event_id: string; user_id: string; role: Role; profiles: Profile };

export type TaskRow = {
  id: string;
  event_id: string;
  title: string;
  assignee_id: string | null;
  due_at: string | null;
  done: boolean;
  created_at: string;
};

export type MaterialRow = {
  id: string;
  event_id: string;
  name: string;
  quantity: number;
  holder_id: string | null;
  location: string;
};

export type AnnouncementRow = {
  id: string;
  event_id: string;
  body: string;
  author_id: string;
  created_at: string;
};

export type DeclarationRow = {
  event_id: string;
  authority: string;
  submitted_at: string | null;
  reference: string;
  notes: string;
};
