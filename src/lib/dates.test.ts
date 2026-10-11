import { describe, expect, it } from "vitest";
import { countdownLabel } from "./dates";

describe("countdownLabel", () => {
  const now = new Date(2025, 10, 7, 10, 0);
  it("affiche J-x pour les dates à venir", () => {
    expect(countdownLabel(new Date(2025, 10, 19, 14, 0).toISOString(), now)).toBe("J-12");
  });
  it("gère aujourd'hui, demain et passé", () => {
    expect(countdownLabel(new Date(2025, 10, 7, 20, 0).toISOString(), now)).toBe("Aujourd'hui");
    expect(countdownLabel(new Date(2025, 10, 8, 9, 0).toISOString(), now)).toBe("Demain");
    expect(countdownLabel(new Date(2025, 10, 6, 9, 0).toISOString(), now)).toBe("Passé");
  });
});
