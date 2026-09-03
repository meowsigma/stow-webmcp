import { getAirline } from "../data/airlines";
import { addItem, removeItem } from "./bag";
import { blocking } from "./rules";
import type { BagState, Item, Proposal, Result, Trip } from "./types";

function density(item: Item): number {
  const utility = Math.max(item.utility, 0.1);
  return item.grams / utility;
}

let proposalSeq = 0;

export function proposeRepack(trip: Trip, bag: BagState, catalog: Item[]): Result<Proposal> {
  const limitGrams = tripAirlineLimitGrams(trip);
  const pinnedGrams = bag.items
    .filter((item) => bag.pins.includes(item.id))
    .reduce((sum, item) => sum + item.grams, 0);

  if (pinnedGrams > limitGrams) {
    return {
      ok: false,
      error: `Pinned items alone exceed the ${limitGrams / 1000} kg cabin limit. Unpin something before a repack can succeed.`,
    };
  }

  const drops: string[] = [];
  let working: BagState = {
    items: [...bag.items],
    pins: [...bag.pins],
    sealed: bag.sealed,
  };

  const unpinned = () =>
    working.items
      .filter((item) => !working.pins.includes(item.id))
      .slice()
      .sort((a, b) => density(b) - density(a));

  while (blocking(trip, working).some((v) => v.code === "overweight" || v.code === "overvolume" || v.code === "liquid_over_100ml")) {
    const liquid = working.items.find(
      (item) => !working.pins.includes(item.id) && item.flags.liquid && (item.liquidMl ?? 0) > 100,
    );
    const candidate = liquid ?? unpinned()[0];
    if (!candidate) break;
    const removed = removeItem(working, candidate.id);
    if (!removed.ok) break;
    working = removed.value;
    drops.push(candidate.id);
  }

  const adds: string[] = [];
  if (trip.scenario === "gobag") {
    for (const flag of ["document", "medication"] as const) {
      const has = working.items.some((item) => item.flags[flag]);
      if (has) continue;
      const extra = catalog.find(
        (item) => item.flags[flag] && !working.items.some((inBag) => inBag.id === item.id),
      );
      if (!extra) continue;
      const added = addItem(working, extra);
      if (!added.ok) continue;
      if (blocking(trip, added.value).some((v) => v.code === "overweight" || v.code === "overvolume")) {
        continue;
      }
      working = added.value;
      adds.push(extra.id);
    }
  }

  const remaining = blocking(trip, working);
  if (remaining.length > 0 && drops.length === 0 && adds.length === 0) {
    return {
      ok: false,
      error: remaining[0]?.message ?? "No legal repack exists without unpinning items.",
    };
  }

  proposalSeq += 1;
  const dropNames = drops.join(", ") || "nothing";
  const addNames = adds.length ? ` Add ${adds.join(", ")}.` : "";
  return {
    ok: true,
    value: {
      id: `prop-${proposalSeq}`,
      drops,
      adds,
      rationale: `Keep every pin. Drop ${dropNames} to clear blocking rules.${addNames}`,
    },
  };
}

export function applyProposal(bag: BagState, proposal: Proposal, catalog: Item[]): Result<BagState> {
  let working = bag;
  for (const id of proposal.drops) {
    const removed = removeItem(working, id);
    if (!removed.ok) return removed;
    working = removed.value;
  }
  for (const id of proposal.adds) {
    const item = catalog.find((candidate) => candidate.id === id);
    if (!item) {
      return { ok: false, error: `Unknown item "${id}". Search the catalog first.` };
    }
    const added = addItem(working, item);
    if (!added.ok) return added;
    working = added.value;
  }
  return { ok: true, value: working };
}

function tripAirlineLimitGrams(trip: Trip): number {
  return getAirline(trip.airlineId).cabinKg * 1000;
}
