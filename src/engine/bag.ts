import type { BagState, Item, Result } from "./types";

export function createBag(): BagState {
  return { items: [], pins: [], sealed: false };
}

export function totalGrams(bag: BagState): number {
  return bag.items.reduce((sum, item) => sum + item.grams, 0);
}

export function totalMl(bag: BagState): number {
  return bag.items.reduce((sum, item) => sum + item.mlVolume, 0);
}

export function addItem(bag: BagState, item: Item): Result<BagState> {
  if (bag.sealed) {
    return { ok: false, error: "Bag is sealed. Nothing else can be added." };
  }
  if (bag.items.some((existing) => existing.id === item.id)) {
    return { ok: false, error: `"${item.name}" is already in the bag.` };
  }
  return {
    ok: true,
    value: { ...bag, items: [...bag.items, item] },
  };
}

export function removeItem(bag: BagState, itemId: string): Result<BagState> {
  if (bag.sealed) {
    return { ok: false, error: "Bag is sealed. Unpack is not allowed." };
  }
  const item = bag.items.find((candidate) => candidate.id === itemId);
  if (!item) {
    return { ok: false, error: `Unknown item "${itemId}". Search the catalog first.` };
  }
  if (bag.pins.includes(itemId)) {
    return {
      ok: false,
      error: `Cannot remove "${item.name}": it is pinned. Unpin it first, or propose a swap that keeps it.`,
    };
  }
  return {
    ok: true,
    value: {
      ...bag,
      items: bag.items.filter((candidate) => candidate.id !== itemId),
      pins: bag.pins.filter((id) => id !== itemId),
    },
  };
}

export function pinItem(bag: BagState, itemId: string): Result<BagState> {
  if (bag.sealed) {
    return { ok: false, error: "Bag is sealed. Pins cannot change." };
  }
  const item = bag.items.find((candidate) => candidate.id === itemId);
  if (!item) {
    return { ok: false, error: `Cannot pin "${itemId}": it is not in the bag.` };
  }
  if (bag.pins.includes(itemId)) {
    return { ok: true, value: bag };
  }
  return { ok: true, value: { ...bag, pins: [...bag.pins, itemId] } };
}

export function unpinItem(bag: BagState, itemId: string): Result<BagState> {
  if (bag.sealed) {
    return { ok: false, error: "Bag is sealed. Pins cannot change." };
  }
  if (!bag.pins.includes(itemId)) {
    return { ok: false, error: `Item "${itemId}" is not pinned.` };
  }
  return { ok: true, value: { ...bag, pins: bag.pins.filter((id) => id !== itemId) } };
}

export function sealBag(bag: BagState): Result<BagState> {
  if (bag.sealed) {
    return { ok: false, error: "Bag is already sealed." };
  }
  return { ok: true, value: { ...bag, sealed: true } };
}
