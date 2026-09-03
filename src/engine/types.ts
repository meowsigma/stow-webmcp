export type Compartment = "cabin" | "liquids" | "personal" | "checked";

export type ItemFlags = {
  liquid?: boolean;
  lithium?: boolean;
  document?: boolean;
  medication?: boolean;
  sentimental?: boolean;
  clothing?: boolean;
  coverage?: string;
};

export type Item = {
  id: string;
  name: string;
  grams: number;
  mlVolume: number;
  liquidMl?: number;
  flags: ItemFlags;
  compartment: Compartment;
  utility: number;
};

export type Airline = {
  id: string;
  name: string;
  cabinKg: number;
  cabinLiters: number;
  personalKg: number;
};

export type ScenarioId = "ryanair" | "family" | "gobag";

export type Trip = {
  destination: string;
  start: string;
  end: string;
  airlineId: string;
  bagClass: "cabin" | "cabin+personal";
  scenario: ScenarioId;
  members: number;
};

export type BagState = {
  items: Item[];
  pins: string[];
  sealed: boolean;
};

export type Violation = {
  code: string;
  severity: "block" | "warn";
  message: string;
  itemIds: string[];
};

export type Proposal = {
  id: string;
  drops: string[];
  adds: string[];
  rationale: string;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type Actor = "human" | "agent";

export type LogEntry = {
  at: number;
  actor: Actor;
  tool?: string;
  message: string;
};
