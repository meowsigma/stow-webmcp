import type { Airline } from "../engine/types";

export const AIRLINES: Record<string, Airline> = {
  FR: {
    id: "FR",
    name: "Ryanair",
    cabinKg: 10,
    cabinLiters: 24,
    personalKg: 0,
  },
  BA: {
    id: "BA",
    name: "British Airways",
    cabinKg: 23,
    cabinLiters: 45,
    personalKg: 5,
  },
  GO: {
    id: "GO",
    name: "Go-bag",
    cabinKg: 9,
    cabinLiters: 30,
    personalKg: 0,
  },
};

export function getAirline(id: string): Airline {
  const airline = AIRLINES[id];
  if (!airline) {
    throw new Error(`Unknown airline "${id}"`);
  }
  return airline;
}
