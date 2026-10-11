import type { EventRow } from "./types";

export type CheckItem = { label: string; ok: boolean; section: string };

// Vérifie que la manif contient tout ce que la loi demande dans une déclaration (article L211-2 du CSI).
export function declarationChecklist(event: EventRow, signatoryCount: number): CheckItem[] {
  return [
    { label: "Objet de la manifestation", ok: event.purpose.trim().length > 0, section: "parcours" },
    { label: "Date, heure et lieu de rassemblement", ok: Boolean(event.starts_at && (event.place_name || event.address)), section: "infos" },
    {
      label: "Itinéraire (tracé ou écrit), ou rassemblement statique",
      ok: event.route.length > 1 || event.route_description.trim().length > 0 || event.lat !== null,
      section: "parcours",
    },
    { label: "Heure et lieu de dispersion", ok: Boolean(event.dispersal_at && event.dispersal_place.trim()), section: "parcours" },
    { label: "Au moins un organisateur déclarant engagé", ok: signatoryCount > 0, section: "demarches" },
  ];
}

export function cityFromAddress(address: string): string {
  return address.match(/\b\d{5}\s+([^,]+)/)?.[1]?.trim() ?? "";
}
