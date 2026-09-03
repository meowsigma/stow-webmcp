import { describe, expect, it } from "vitest";
import {
  addItem,
  createBag,
  pinItem,
  removeItem,
  sealBag,
  totalGrams,
  unpinItem,
} from "../src/engine/bag";
import { sampleShirt, sampleShoes, sampleViolin } from "./fixtures";

describe("bag", () => {
  it("adds an unpinned item and reports grams", () => {
    const bag = createBag();
    const next = addItem(bag, sampleShirt);
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.value.items.map((i) => i.id)).toEqual(["shirt"]);
    expect(totalGrams(next.value)).toBe(180);
    expect(next.value.pins.includes("shirt")).toBe(false);
  });

  it("does not duplicate an item already in the bag", () => {
    const once = addItem(createBag(), sampleShirt);
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    const twice = addItem(once.value, sampleShirt);
    expect(twice.ok).toBe(false);
    if (twice.ok) return;
    expect(twice.error).toMatch(/already in the bag/i);
  });

  it("refuses to remove an unknown item", () => {
    const result = removeItem(createBag(), "nope");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Unknown item/i);
  });

  it("refuses to remove a pinned item", () => {
    let bag = addItem(createBag(), sampleViolin);
    expect(bag.ok).toBe(true);
    if (!bag.ok) return;
    const pinned = pinItem(bag.value, "violin");
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) return;
    const removed = removeItem(pinned.value, "violin");
    expect(removed.ok).toBe(false);
    if (removed.ok) return;
    expect(removed.error).toMatch(/pinned/i);
  });

  it("cannot pin an item that is not in the bag", () => {
    const result = pinItem(createBag(), "violin");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not in the bag/i);
  });

  it("unpins then removes", () => {
    let state = addItem(createBag(), sampleShoes);
    expect(state.ok).toBe(true);
    if (!state.ok) return;
    const pinned = pinItem(state.value, "shoes");
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) return;
    const unpinned = unpinItem(pinned.value, "shoes");
    expect(unpinned.ok).toBe(true);
    if (!unpinned.ok) return;
    const removed = removeItem(unpinned.value, "shoes");
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.value.items).toHaveLength(0);
  });

  it("refuses to add after seal", () => {
    const sealed = sealBag(createBag());
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;
    const added = addItem(sealed.value, sampleShirt);
    expect(added.ok).toBe(false);
    if (added.ok) return;
    expect(added.error).toMatch(/sealed/i);
  });
});
