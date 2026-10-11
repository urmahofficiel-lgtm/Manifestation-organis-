import { describe, expect, it } from "vitest";
import { communeCode, departmentOf, toContact } from "./annuaire";

describe("communeCode", () => {
  it("ramène les arrondissements à la commune", () => {
    expect(communeCode("75111")).toBe("75056");
    expect(communeCode("69383")).toBe("69123");
    expect(communeCode("13201")).toBe("13055");
    expect(communeCode("33063")).toBe("33063");
  });
});

describe("departmentOf", () => {
  it("lit le département, y compris outre-mer et Corse", () => {
    expect(departmentOf("69123")).toBe("69");
    expect(departmentOf("97411")).toBe("974");
    expect(departmentOf("2A004")).toBe("2A");
  });
});

describe("toContact", () => {
  it("lit les champs de l'annuaire officiel (format réel de la mairie de Lyon)", () => {
    const c = toContact("mairie", {
      nom: "Mairie - Lyon - Mairie centrale",
      adresse_courriel: null,
      telephone: '[{"valeur": "04 72 10 30 30", "description": ""}]',
      adresse:
        '[{"type_adresse": "Adresse", "numero_voie": "Place de la Comédie", "service_distribution": "", "code_postal": "69001", "nom_commune": "Lyon"}, {"type_adresse": "Adresse postale", "numero_voie": "Place de la Comédie", "service_distribution": "BP 1065", "code_postal": "69205", "nom_commune": "Lyon cedex 01"}]',
      formulaire_contact: "https://moncompte.grandlyon.com/login/",
      site_internet: '[{"libelle": "", "valeur": "https://www.lyon.fr/"}]',
      url_service_public: "https://lannuaire.service-public.gouv.fr/x",
    });
    expect(c.email).toBe("");
    expect(c.phone).toBe("04 72 10 30 30");
    expect(c.address).toBe("Place de la Comédie, BP 1065, 69205 Lyon cedex 01");
    expect(c.website).toBe("https://www.lyon.fr/");
    expect(c.contactForm).toBe("https://moncompte.grandlyon.com/login/");
  });

  it("garde la première adresse e-mail et tolère les champs invalides", () => {
    const c = toContact("mairie", { nom: "Mairie - Curgy", adresse_courriel: "secretariat@mairiedecurgy.fr", telephone: "pas du json" });
    expect(c.email).toBe("secretariat@mairiedecurgy.fr");
    expect(c.phone).toBe("");
  });
});
