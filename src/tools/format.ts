import { getAirline } from "../data/airlines";
import { totalGrams, totalMl } from "../engine/bag";
import { evaluate } from "../engine/rules";
import type { BagState, Item, Proposal, Trip, Violation } from "../engine/types";

export function kg(grams: number): string {
  return `${(grams / 1000).toFixed(2)} kg`;
}

export function liters(ml: number): string {
  return `${(ml / 1000).toFixed(1)} L`;
}

export function formatItem(item: Item): string {
  const flags = Object.keys(item.flags).filter((key) => item.flags[key as keyof Item["flags"]]);
  const flagText = flags.length ? ` [${flags.join(", ")}]` : "";
  const liquid = item.liquidMl ? ` ${item.liquidMl}ml` : "";
  return `${item.id}: ${item.name} · ${kg(item.grams)} · ${liters(item.mlVolume)}${liquid}${flagText}`;
}

export function formatViolations(violations: Violation[]): string {
  if (violations.length === 0) return "No packing violations.";
  return violations
    .map((violation) => `${violation.severity.toUpperCase()} ${violation.code}: ${violation.message}`)
    .join("\n");
}

export function formatManifest(trip: Trip, bag: BagState): string {
  const airline = getAirline(trip.airlineId);
  const lines = [
    `Trip: ${trip.destination} ${trip.start} → ${trip.end} · ${airline.name} ${airline.cabinKg} kg cabin`,
    `Mass: ${kg(totalGrams(bag))} / ${airline.cabinKg} kg`,
    `Volume: ${liters(totalMl(bag))} / ${airline.cabinLiters} L`,
    `Sealed: ${bag.sealed ? "yes" : "no"}`,
    `Pins: ${bag.pins.length ? bag.pins.join(", ") : "(none)"}`,
    "Items:",
    ...bag.items.map((item) => `- ${formatItem(item)}${bag.pins.includes(item.id) ? " PINNED" : ""}`),
    formatViolations(evaluate(trip, bag)),
  ];
  return lines.join("\n");
}

export function formatProposal(proposal: Proposal, catalog: Item[]): string {
  const name = (id: string) => catalog.find((item) => item.id === id)?.name ?? id;
  const drops = proposal.drops.map(name).join(", ") || "nothing";
  const adds = proposal.adds.map(name).join(", ") || "nothing";
  return `Proposal ${proposal.id}. Drop: ${drops}. Add: ${adds}. ${proposal.rationale}`;
}
