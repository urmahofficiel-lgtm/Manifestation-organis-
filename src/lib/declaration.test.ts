import { describe, expect, it } from "vitest";
import { daysUntil, declarationDeadline } from "./declaration";

describe("declarationDeadline", () => {
  it("place la limite 4 jours avant la manifestation (3 jours francs)", () => {
    // Manifestation lundi 10 novembre 2025 à 14h : dernier dépôt possible le jeudi 6 novembre
    const deadline = declarationDeadline(new Date(2025, 10, 10, 14, 0));
    expect(deadline.getFullYear()).toBe(2025);
    expect(deadline.getMonth()).toBe(10);
    expect(deadline.getDate()).toBe(6);
  });

  it("gère le passage d'un mois à l'autre", () => {
    const deadline = declarationDeadline(new Date(2025, 2, 2, 9, 0));
    expect(deadline.getMonth()).toBe(1);
    expect(deadline.getDate()).toBe(26);
  });
});

describe("daysUntil", () => {
  it("compte les jours calendaires entiers", () => {
    expect(daysUntil(new Date(2025, 10, 10, 23, 0), new Date(2025, 10, 7, 8, 0))).toBe(3);
    expect(daysUntil(new Date(2025, 10, 6, 0, 0), new Date(2025, 10, 7, 23, 0))).toBe(-1);
  });
});
