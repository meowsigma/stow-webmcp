import type { Item, Trip } from "../src/engine/types";

export const sampleShirt: Item = {
  id: "shirt",
  name: "Merino shirt",
  grams: 180,
  mlVolume: 900,
  flags: { clothing: true },
  compartment: "cabin",
  utility: 5,
};

export const sampleShoes: Item = {
  id: "shoes",
  name: "Trail shoes",
  grams: 800,
  mlVolume: 4000,
  flags: { clothing: true },
  compartment: "cabin",
  utility: 3,
};

export const sampleViolin: Item = {
  id: "violin",
  name: "Violin",
  grams: 2200,
  mlVolume: 8000,
  flags: { sentimental: true },
  compartment: "cabin",
  utility: 10,
};

export const sampleLiquidOk: Item = {
  id: "toothpaste",
  name: "Toothpaste 90ml",
  grams: 110,
  mlVolume: 200,
  liquidMl: 90,
  flags: { liquid: true },
  compartment: "liquids",
  utility: 6,
};

export const sampleLiquidOver: Item = {
  id: "lotion",
  name: "Lotion 150ml",
  grams: 170,
  mlVolume: 250,
  liquidMl: 150,
  flags: { liquid: true },
  compartment: "liquids",
  utility: 4,
};

export const samplePassport: Item = {
  id: "passport",
  name: "Passport",
  grams: 30,
  mlVolume: 80,
  flags: { document: true },
  compartment: "personal",
  utility: 10,
};

export const samplePowerBank: Item = {
  id: "power-bank",
  name: "Power bank",
  grams: 280,
  mlVolume: 250,
  flags: { lithium: true },
  compartment: "cabin",
  utility: 7,
};

export const ryanairTrip: Trip = {
  destination: "Lisbon",
  start: "2026-09-12",
  end: "2026-09-14",
  airlineId: "FR",
  bagClass: "cabin",
  scenario: "ryanair",
  members: 1,
};

export const gobagTrip: Trip = {
  destination: "Home",
  start: "2026-09-02",
  end: "2026-09-05",
  airlineId: "GO",
  bagClass: "cabin",
  scenario: "gobag",
  members: 2,
};
