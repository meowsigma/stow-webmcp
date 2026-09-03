import { getAirline } from "../data/airlines";
import { totalGrams, totalMl } from "./bag";
import type { BagState, Trip, Violation } from "./types";

const TSA_LIQUID_ML = 100;

const GOBAG_COVERAGE: { flag: "document" | "medication"; label: string }[] = [
  { flag: "document", label: "documents" },
  { flag: "medication", label: "medication" },
];

export function evaluate(trip: Trip, bag: BagState): Violation[] {
  const airline = getAirline(trip.airlineId);
  const violations: Violation[] = [];
  const grams = totalGrams(bag);
  const limitGrams = airline.cabinKg * 1000;

  if (grams > limitGrams) {
    const overKg = ((grams - limitGrams) / 1000).toFixed(1);
    violations.push({
      code: "overweight",
      severity: "block",
      message: `Cabin bag is ${overKg} kg over a ${airline.cabinKg} kg ${airline.name} limit. Remove unpinned items or ask for propose_repack.`,
      itemIds: bag.items.map((item) => item.id),
    });
  }

  const limitMl = airline.cabinLiters * 1000;
  if (totalMl(bag) > limitMl) {
    violations.push({
      code: "overvolume",
      severity: "block",
      message: `Packed volume exceeds ${airline.cabinLiters} L. Drop bulky unpinned items.`,
      itemIds: bag.items.map((item) => item.id),
    });
  }

  for (const item of bag.items) {
    if (item.flags.liquid && (item.liquidMl ?? 0) > TSA_LIQUID_ML) {
      violations.push({
        code: "liquid_over_100ml",
        severity: "block",
        message: `"${item.name}" is ${item.liquidMl} ml. TSA cabin liquids must be 100 ml or less.`,
        itemIds: [item.id],
      });
    }
  }

  if (trip.scenario === "gobag") {
    for (const need of GOBAG_COVERAGE) {
      const present = bag.items.some((item) => item.flags[need.flag]);
      if (!present) {
        violations.push({
          code: "missing_coverage",
          severity: "block",
          message: `Go-bag is missing ${need.label}. Add a ${need.label} item before you seal.`,
          itemIds: [],
        });
      }
    }
  }

  const pinnedGrams = bag.items
    .filter((item) => bag.pins.includes(item.id))
    .reduce((sum, item) => sum + item.grams, 0);
  if (pinnedGrams > 0 && pinnedGrams >= grams * 0.5) {
    violations.push({
      code: "pin_heavy",
      severity: "warn",
      message: "Pinned items are most of the bag. The agent cannot drop them; you may need to unpin or accept overweight fees.",
      itemIds: [...bag.pins],
    });
  }

  return violations;
}

export function blocking(trip: Trip, bag: BagState): Violation[] {
  return evaluate(trip, bag).filter((violation) => violation.severity === "block");
}
