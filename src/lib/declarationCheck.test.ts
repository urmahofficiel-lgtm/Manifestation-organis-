import { describe, expect, it } from "vitest";
import { cityFromAddress, declarationChecklist } from "./declarationCheck";
import type { EventRow } from "./types";

const base: EventRow = {
  id: "1", title: "T", description: "", theme: "autre", status: "brouillon", starts_at: "2025-11-10T13:00:00Z",
  ends_at: null, place_name: "Place X", address: "", lat: null, lng: null, expected_count: null, organizer_name: "",
  is_public: false, purpose: "", route: [], pois: [], route_description: "", departure_at: null, dispersal_at: null,
  dispersal_place: "", municipalities: "", safety_notes: "", created_by: "u", created_at: "",
};

describe("declarationChecklist", () => {
  it("signale les éléments manquants", () => {
    const items = declarationChecklist(base, 0);
    expect(items.filter((i) => !i.ok).map((i) => i.label)).toEqual([
      "Objet de la manifestation",
      "Itinéraire (tracé ou écrit), ou rassemblement statique",
      "Heure et lieu de dispersion",
      "Au moins un organisateur déclarant engagé",
    ]);
  });
  it("valide une déclaration complète", () => {
    const full = { ...base, purpose: "Climat", route: [[1, 2], [3, 4]] as [number, number][], dispersal_at: "2025-11-10T16:00:00Z", dispersal_place: "Bastille" };
    expect(declarationChecklist(full, 1).every((i) => i.ok)).toBe(true);
  });
});

describe("cityFromAddress", () => {
  it("lit la ville après le code postal", () => {
    expect(cityFromAddress("12 rue de la Paix, 69001 Lyon")).toBe("Lyon");
    expect(cityFromAddress("sans code")).toBe("");
  });
});
