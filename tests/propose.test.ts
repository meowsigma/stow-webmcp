import { describe, expect, it } from "vitest";
import { addItem, createBag, pinItem } from "../src/engine/bag";
import { proposeRepack } from "../src/engine/propose";
import { applyProposal } from "../src/engine/propose";
import { evaluate } from "../src/engine/rules";
import { CATALOG } from "../src/data/catalog";
import { sampleShoes, sampleViolin, ryanairTrip } from "./fixtures";

function mustAdd(bag: ReturnType<typeof createBag>, item: Parameters<typeof addItem>[1]) {
  const result = addItem(bag, item);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("proposeRepack", () => {
  it("never drops a pinned violin", () => {
    let bag = mustAdd(createBag(), sampleViolin);
    bag = mustAdd(bag, sampleShoes);
    bag = mustAdd(bag, {
      id: "anvil",
      name: "Anvil",
      grams: 7500,
      mlVolume: 2000,
      flags: {},
      compartment: "cabin",
      utility: 1,
    });
    const pinned = pinItem(bag, "violin");
    if (!pinned.ok) throw new Error(pinned.error);
    const proposal = proposeRepack(ryanairTrip, pinned.value, CATALOG);
    expect(proposal.ok).toBe(true);
    if (!proposal.ok) return;
    expect(proposal.value.drops).not.toContain("violin");
    expect(proposal.value.drops).toContain("anvil");
    expect(proposal.value.rationale.length).toBeGreaterThan(10);
  });

  it("returns an actionable error when pinned mass alone exceeds the limit", () => {
    let bag = mustAdd(createBag(), { ...sampleViolin, grams: 11000 });
    const pinned = pinItem(bag, "violin");
    if (!pinned.ok) throw new Error(pinned.error);
    const proposal = proposeRepack(ryanairTrip, pinned.value, CATALOG);
    expect(proposal.ok).toBe(false);
    if (proposal.ok) return;
    expect(proposal.error).toMatch(/Pinned items alone exceed/i);
  });

  it("clears overweight after accept", () => {
    let bag = mustAdd(createBag(), sampleViolin);
    bag = mustAdd(bag, sampleShoes);
    bag = mustAdd(bag, {
      id: "anvil",
      name: "Anvil",
      grams: 7500,
      mlVolume: 2000,
      flags: {},
      compartment: "cabin",
      utility: 1,
    });
    const proposal = proposeRepack(ryanairTrip, bag, CATALOG);
    expect(proposal.ok).toBe(true);
    if (!proposal.ok) return;
    const applied = applyProposal(bag, proposal.value, CATALOG);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const blocks = evaluate(ryanairTrip, applied.value).filter((v) => v.severity === "block");
    expect(blocks).toHaveLength(0);
  });
});
