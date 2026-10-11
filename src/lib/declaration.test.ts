import { describe, expect, it } from "vitest";
import {
  daysUntil,
  declarationDeadline,
  declarationEarliest,
  declarationWindow,
} from "./declaration";

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

describe("declarationEarliest", () => {
  it("place le premier jour possible 16 jours avant (15 jours francs)", () => {
    // Manifestation lundi 10 novembre 2025 : premier dépôt possible le samedi 25 octobre
    const earliest = declarationEarliest(new Date(2025, 10, 10, 14, 0));
    expect(earliest.getMonth()).toBe(9);
    expect(earliest.getDate()).toBe(25);
  });
});

describe("declarationWindow", () => {
  const start = new Date(2025, 10, 10, 14, 0);
  it("est trop tôt avant la période", () => {
    expect(declarationWindow(start, new Date(2025, 9, 24, 12, 0))).toBe("trop_tot");
  });
  it("est ouverte du premier au dernier jour, bornes incluses", () => {
    expect(declarationWindow(start, new Date(2025, 9, 25, 8, 0))).toBe("ouverte");
    expect(declarationWindow(start, new Date(2025, 10, 6, 23, 0))).toBe("ouverte");
  });
  it("est dépassée après le dernier jour", () => {
    expect(declarationWindow(start, new Date(2025, 10, 7, 8, 0))).toBe("depassee");
  });
});

describe("daysUntil", () => {
  it("compte les jours calendaires entiers", () => {
    expect(daysUntil(new Date(2025, 10, 10, 23, 0), new Date(2025, 10, 7, 8, 0))).toBe(3);
    expect(daysUntil(new Date(2025, 10, 6, 0, 0), new Date(2025, 10, 7, 23, 0))).toBe(-1);
  });
});
