// Recherche d'adresses dans la Base Adresse Nationale (service public gratuit : api-adresse.data.gouv.fr).
// Une adresse choisie dans les suggestions est considérée comme vérifiée : elle existe réellement.

export type AddressHit = {
  label: string;
  street: string;
  postcode: string;
  city: string;
};

type BanFeature = { properties: { label: string; name: string; postcode: string; city: string; type: string } };

export async function searchAddress(query: string, signal?: AbortSignal): Promise<AddressHit[]> {
  const q = query.trim();
  if (q.length < 4) return [];
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: BanFeature[] };
  return (data.features ?? [])
    .filter((f) => f.properties.type === "housenumber" || f.properties.type === "street")
    .map((f) => ({
      label: f.properties.label,
      street: f.properties.name,
      postcode: f.properties.postcode,
      city: f.properties.city,
    }));
}

// Autorité à qui adresser la déclaration, d'après le code postal du lieu de la manif.
export function suggestAuthority(postcode: string, city: string): string {
  if (/^75\d{3}$/.test(postcode)) return "Préfecture de police de Paris";
  if (city) return `Mairie de ${city}`;
  return "";
}

export function extractPostcode(text: string): string {
  return text.match(/\b(\d{5})\b/)?.[1] ?? "";
}
