import { addItem, createBag } from "../engine/bag";
import type { BagState, ScenarioId, Trip } from "../engine/types";
import { findItem } from "./catalog";

export type Preset = {
  id: ScenarioId;
  label: string;
  blurb: string;
  trip: Trip;
  itemIds: string[];
};

export const PRESETS: Preset[] = [
  {
    id: "ryanair",
    label: "Ryanair weekend",
    blurb: "Lisbon, 10 kg cabin. Taste vs physics.",
    trip: {
      destination: "Lisbon",
      start: "2026-09-12",
      end: "2026-09-14",
      airlineId: "FR",
      bagClass: "cabin",
      scenario: "ryanair",
      members: 1,
    },
    itemIds: [
      "passport",
      "violin",
      "laptop",
      "shoes",
      "dress-shoes",
      "jeans",
      "wine",
      "camera",
      "jacket",
      "book",
      "snacks",
      "headphones",
      "charger",
      "shirt",
      "shirt-2",
      "shirt-3",
      "lotion",
      "toothpaste",
      "power-bank",
    ],
  },
  {
    id: "family",
    label: "Family cabin",
    blurb: "Two adults, one toddler, one 10 kg bag.",
    trip: {
      destination: "Manchester",
      start: "2026-10-02",
      end: "2026-10-05",
      airlineId: "FR",
      bagClass: "cabin",
      scenario: "family",
      members: 3,
    },
    itemIds: [
      "passport",
      "toddler-blanket",
      "diapers",
      "formula",
      "meds",
      "laptop",
      "snacks",
      "shirt",
      "jeans",
      "shoes",
      "toothpaste",
      "jacket",
      "charger",
      "headphones",
      "book",
      "camera",
    ],
  },
  {
    id: "gobag",
    label: "Wildfire go-bag",
    blurb: "72 hours. Pin the album. Do not skip the papers.",
    trip: {
      destination: "Home",
      start: "2026-09-02",
      end: "2026-09-05",
      airlineId: "GO",
      bagClass: "cabin",
      scenario: "gobag",
      members: 2,
    },
    itemIds: ["photo-album", "n95", "flashlight", "water", "pet-food", "shirt", "charger"],
  },
];

export function bagFromIds(ids: string[]): BagState {
  let bag = createBag();
  for (const id of ids) {
    const item = findItem(id);
    if (!item) continue;
    const added = addItem(bag, item);
    if (added.ok) bag = added.value;
  }
  return bag;
}

export function getPreset(id: ScenarioId): Preset {
  const preset = PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`Unknown preset ${id}`);
  return preset;
}
