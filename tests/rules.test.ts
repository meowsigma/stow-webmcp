import { describe, expect, it } from "vitest";
import { addItem, createBag, pinItem } from "../src/engine/bag";
import { evaluate } from "../src/engine/rules";
import {
  gobagTrip,
  ryanairTrip,
  sampleLiquidOk,
  sampleLiquidOver,
  samplePassport,
  sampleShirt,
  sampleShoes,
  sampleViolin,
} from "./fixtures";

function mustAdd(bag: ReturnType<typeof createBag>, item: Parameters<typeof addItem>[1]) {
  const result = addItem(bag, item);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("rules", () => {
  it("flags cabin overweight at 10001 g against a 10 kg Ryanair limit", () => {
    let bag = createBag();
    bag = mustAdd(bag, sampleViolin);
    bag = mustAdd(bag, sampleShoes);
    bag = mustAdd(bag, { ...sampleShirt, id: "brick", name: "Brick", grams: 7001, mlVolume: 1000 });
    const violations = evaluate(ryanairTrip, bag);
    const overweight = violations.find((v) => v.code === "overweight");
    expect(overweight?.severity).toBe("block");
    expect(overweight?.message).toMatch(/10 kg/);
  });

  it("allows 90 ml liquids and blocks 150 ml", () => {
    const ok = evaluate(ryanairTrip, mustAdd(createBag(), sampleLiquidOk));
    expect(ok.filter((v) => v.code === "liquid_over_100ml")).toHaveLength(0);
    const bad = evaluate(ryanairTrip, mustAdd(createBag(), sampleLiquidOver));
    expect(bad.some((v) => v.code === "liquid_over_100ml")).toBe(true);
    expect(bad.find((v) => v.code === "liquid_over_100ml")?.itemIds).toContain("lotion");
  });

  it("blocks a go-bag missing documents", () => {
    const bag = mustAdd(createBag(), sampleShirt);
    const violations = evaluate(gobagTrip, bag);
    const missing = violations.find((v) => v.code === "missing_coverage");
    expect(missing?.severity).toBe("block");
    expect(missing?.message).toMatch(/document/i);
  });

  it("does not block a go-bag that includes a passport", () => {
    const bag = mustAdd(createBag(), samplePassport);
    const violations = evaluate(gobagTrip, bag);
    expect(violations.some((v) => v.code === "missing_coverage" && /document/i.test(v.message))).toBe(
      false,
    );
  });

  it("warns when a pinned item is the majority of cabin mass", () => {
    let bag = mustAdd(createBag(), sampleViolin);
    const pinned = pinItem(bag, "violin");
    if (!pinned.ok) throw new Error(pinned.error);
    const violations = evaluate(ryanairTrip, pinned.value);
    expect(violations.some((v) => v.code === "pin_heavy")).toBe(true);
  });
});
