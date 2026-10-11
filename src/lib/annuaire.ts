// Annuaire officiel de l'administration (Service-Public.fr, DILA, licence ouverte) et Base Adresse Nationale.
// Les deux services sont gratuits et acceptent les appels directs depuis le navigateur.

const ANNUAIRE =
  "https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records";
const BAN_REVERSE = "https://api-adresse.data.gouv.fr/reverse/";
const BAN_SEARCH = "https://api-adresse.data.gouv.fr/search/";

export type Commune = { code: string; name: string; postcode: string };

export type AuthorityContact = {
  kind: "mairie" | "prefecture" | "prefecture_police";
  name: string;
  email: string;
  phone: string;
  address: string;
  contactForm: string;
  website: string;
  servicePublicUrl: string;
};

// Les arrondissements de Paris, Lyon et Marseille ont leur propre code : la commune est la ville entière.
export function communeCode(code: string): string {
  if (/^751\d\d$/.test(code)) return "75056";
  if (/^6938\d$/.test(code)) return "69123";
  if (/^132\d\d$/.test(code)) return "13055";
  return code;
}

export function departmentOf(code: string): string {
  if (code.startsWith("97") || code.startsWith("98")) return code.slice(0, 3);
  return code.slice(0, 2);
}

// Les champs « liste » de l'annuaire sont des textes JSON : on les lit prudemment.
function parseList(value: unknown): Record<string, unknown>[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type AnnuaireRecord = {
  nom?: string;
  adresse_courriel?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  formulaire_contact?: string | null;
  site_internet?: string | null;
  url_service_public?: string | null;
};

export function toContact(kind: AuthorityContact["kind"], r: AnnuaireRecord): AuthorityContact {
  const phone = parseList(r.telephone)[0]?.valeur;
  const addresses = parseList(r.adresse);
  const postal = addresses.find((a) => a.type_adresse === "Adresse postale") ?? addresses[0];
  const address = postal
    ? [postal.numero_voie, postal.service_distribution, `${postal.code_postal ?? ""} ${postal.nom_commune ?? ""}`.trim()]
        .filter((x) => typeof x === "string" && x.trim())
        .join(", ")
    : "";
  const website = parseList(r.site_internet)[0]?.valeur;
  return {
    kind,
    name: r.nom ?? "",
    email: (r.adresse_courriel ?? "").split(/[;,\s]+/)[0] ?? "",
    phone: typeof phone === "string" ? phone : "",
    address,
    contactForm: r.formulaire_contact ?? "",
    website: typeof website === "string" ? website : "",
    servicePublicUrl: r.url_service_public ?? "",
  };
}

async function queryAnnuaire(where: string, limit = 5): Promise<AnnuaireRecord[]> {
  const url = `${ANNUAIRE}?where=${encodeURIComponent(where)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("L'annuaire officiel ne répond pas pour le moment.");
  const data = (await res.json()) as { results?: AnnuaireRecord[] };
  return data.results ?? [];
}

export async function communeFromPoint(lat: number, lng: number): Promise<Commune | null> {
  const res = await fetch(`${BAN_REVERSE}?lat=${lat}&lon=${lng}&limit=1`);
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: { properties: { citycode: string; city: string; postcode: string } }[] };
  const p = data.features?.[0]?.properties;
  return p ? { code: p.citycode, name: p.city, postcode: p.postcode } : null;
}

export async function communeFromText(text: string): Promise<Commune | null> {
  if (text.trim().length < 3) return null;
  const res = await fetch(`${BAN_SEARCH}?q=${encodeURIComponent(text)}&limit=1`);
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: { properties: { citycode: string; city: string; postcode: string } }[] };
  const p = data.features?.[0]?.properties;
  return p ? { code: p.citycode, name: p.city, postcode: p.postcode } : null;
}

// Mairie de la commune, et préfecture du département (ou préfecture de police à Paris).
export async function findAuthorities(commune: Commune): Promise<AuthorityContact[]> {
  const code = communeCode(commune.code);
  const dept = departmentOf(code);
  const [mairies, prefs] = await Promise.all([
    queryAnnuaire(`pivot like "mairie" and code_insee_commune="${code}"`),
    dept === "75"
      ? queryAnnuaire(`nom="Préfecture de police de Paris"`, 1)
      : queryAnnuaire(`pivot like "prefecture" and startswith(code_insee_commune, "${dept}")`, 3),
  ]);
  // Préfère la mairie principale quand il y a des mairies annexes ou d'arrondissement.
  const mairie = mairies.find((m) => /centrale|^Mairie - [^-]+$/.test(m.nom ?? "")) ?? mairies[0];
  const prefecture = prefs.find((p) => (p.nom ?? "").startsWith("Préfecture")) ?? prefs[0];
  const out: AuthorityContact[] = [];
  if (dept === "75" && prefecture) out.push(toContact("prefecture_police", prefecture));
  if (mairie) out.push(toContact("mairie", mairie));
  if (dept !== "75" && prefecture) out.push(toContact("prefecture", prefecture));
  return out;
}
