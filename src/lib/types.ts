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

export const ACCOUNT_TYPES = [
  { id: "individu", label: "Citoyen ou personne seule", hint: "Vous organisez à titre personnel ou avec des proches." },
  { id: "association", label: "Association", hint: "Association déclarée ou non, avec ses membres et bénévoles." },
  { id: "syndicat", label: "Syndicat", hint: "Section syndicale, union locale ou organisation professionnelle." },
  { id: "collectif", label: "Collectif ou groupe informel", hint: "Un groupe de personnes réunies autour d'une cause commune." },
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number]["id"];
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
  organizer_name: string;
  is_public: boolean;
  purpose: string;
  route: LatLng[];
  pois: Poi[];
  route_description: string;
  departure_at: string | null;
  dispersal_at: string | null;
  dispersal_place: string;
  municipalities: string;
  safety_notes: string;
  created_by: string;
  created_at: string;
};

export type Profile = { id: string; email: string; full_name: string };

export type MemberRow = {
  event_id: string;
  user_id: string;
  role: Role;
  field_role: FieldRole | null;
  checked_in_at: string | null;
  profiles: Profile;
};

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
  letter_generated_at: string | null;
  banned: boolean;
  ban_notes: string;
  authority_email: string;
  authority_details: Record<string, unknown>;
  sent_at: string | null;
  sent_via: SentVia | null;
};

export type SentVia = "email" | "formulaire" | "main" | "courrier";

export type DeclarationDocument = {
  id: string;
  event_id: string;
  kind: "lettre" | "recepisse" | "autre";
  path: string;
  file_name: string;
  created_by: string;
  created_at: string;
};

export type MyProfile = Profile & { account_type: AccountType; organization_name: string };

export type SloganRow = {
  id: string;
  event_id: string;
  text: string;
  author_id: string;
  status: "propose" | "valide";
  created_at: string;
};

export type Channel = "equipe" | "orga";

export type MessageRow = {
  id: string;
  event_id: string;
  author_id: string;
  body: string;
  channel: Channel;
  created_at: string;
};

export type InviteRow = {
  id: string;
  event_id: string;
  code: string;
  role: "organizer" | "member";
  expires_at: string;
  max_uses: number | null;
  uses: number;
  revoked: boolean;
  created_at: string;
};

export type InvitePreview = { event_title: string; starts_at: string; organizer_name: string };

export type PublicEvent = Pick<
  EventRow,
  | "id"
  | "title"
  | "description"
  | "theme"
  | "starts_at"
  | "ends_at"
  | "place_name"
  | "address"
  | "lat"
  | "lng"
  | "organizer_name"
  | "expected_count"
  | "purpose"
  | "route"
  | "pois"
  | "route_description"
  | "departure_at"
  | "dispersal_at"
  | "dispersal_place"
  | "safety_notes"
>;

export type EventSummary = {
  members: number;
  tasksTotal: number;
  tasksDone: number;
  materials: number;
  slogansValid: number;
  slogansProposed: number;
  messages: number;
  unread: number;
  announcements: number;
  alertsOpen: number;
  declarationSubmitted: boolean;
};

export type MyTask = {
  id: string;
  title: string;
  done: boolean;
  event_id: string;
  events: { title: string; starts_at: string } | null;
};

// Couleur d'affiche associée à chaque thème
export const THEME_COLORS: Record<ThemeId, string> = {
  climat: "#1f9d55",
  travail: "#e4002b",
  droits: "#7b2cbf",
  education: "#1d4ed8",
  sante: "#0f8b8d",
  logement: "#f97316",
  paix: "#0ea5e9",
  culture: "#db2777",
  autre: "#111111",
};

// Carte : parcours et repères
export type LatLng = [number, number];

export const POI_KINDS = [
  { id: "rassemblement", label: "Rassemblement", color: "#e4002b" },
  { id: "secours", label: "Poste de secours", color: "#15803d" },
  { id: "eau", label: "Point d'eau", color: "#0ea5e9" },
  { id: "dispersion", label: "Dispersion", color: "#7b2cbf" },
  { id: "autre", label: "Autre repère", color: "#111111" },
] as const;

export type PoiKind = (typeof POI_KINDS)[number]["id"];
export type Poi = { lat: number; lng: number; kind: PoiKind; label: string };

// Rôles sur le terrain le jour J
export const FIELD_ROLES = [
  { id: "responsable", label: "Responsable" },
  { id: "service_ordre", label: "Service d'ordre" },
  { id: "secours", label: "Secours" },
  { id: "liaison", label: "Liaison autorités" },
  { id: "presse", label: "Presse" },
  { id: "juridique", label: "Juridique" },
  { id: "logistique", label: "Logistique" },
] as const;

export type FieldRole = (typeof FIELD_ROLES)[number]["id"];

export type Declarant = {
  user_id: string;
  first_name: string;
  last_name: string;
  address_line: string;
  postal_code: string;
  city: string;
  phone: string;
  address_verified: boolean;
};

export type ContactKind = "autorites" | "juridique" | "secours" | "autre";

export type ContactRow = {
  id: string;
  event_id: string;
  kind: ContactKind;
  label: string;
  phone: string;
  notes: string;
};

export type AlertLevel = "info" | "attention" | "urgence";

export type AlertRow = {
  id: string;
  event_id: string;
  author_id: string;
  level: AlertLevel;
  body: string;
  resolved: boolean;
  created_at: string;
};

export type DebriefRow = {
  event_id: string;
  participants_estimate: number | null;
  incidents: string;
  press: string;
  lessons: string;
};
