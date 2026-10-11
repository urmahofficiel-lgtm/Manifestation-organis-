import { describe, expect, it } from "vitest";
import { extractPostcode, suggestAuthority } from "./address";

describe("suggestAuthority", () => {
  it("oriente vers la préfecture de police à Paris", () => {
    expect(suggestAuthority("75011", "Paris")).toBe("Préfecture de police de Paris");
  });
  it("oriente vers la mairie ailleurs", () => {
    expect(suggestAuthority("69001", "Lyon")).toBe("Mairie de Lyon");
  });
  it("ne propose rien sans ville", () => {
    expect(suggestAuthority("", "")).toBe("");
  });
});

describe("extractPostcode", () => {
  it("trouve le code postal dans une adresse", () => {
    expect(extractPostcode("Place de la République, 75011 Paris")).toBe("75011");
    expect(extractPostcode("Sans code")).toBe("");
  });
});
