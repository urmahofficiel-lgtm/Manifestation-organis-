import { describe, expect, it } from "vitest";
import { chooseZoom } from "./staticMap";

describe("chooseZoom", () => {
  it("zoome fort sur un parcours court", () => {
    expect(chooseZoom([[48.8675, 2.3637], [48.8532, 2.3692]], 1000, 640)).toBeGreaterThanOrEqual(14);
  });
  it("dézoome pour un parcours long", () => {
    const z = chooseZoom([[48.85, 2.35], [45.76, 4.83]], 1000, 640);
    expect(z).toBeLessThanOrEqual(8);
  });
});
