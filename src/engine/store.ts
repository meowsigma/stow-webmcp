import { CATALOG, findItem, searchCatalog } from "../data/catalog";
import { bagFromIds, getPreset } from "../data/presets";
import { formatManifest, formatProposal, formatViolations, formatItem } from "../tools/format";
import { addItem, createBag, pinItem, removeItem, sealBag, unpinItem } from "./bag";
import { applyProposal, proposeRepack } from "./propose";
import { blocking, evaluate } from "./rules";
import type { Actor, BagState, LogEntry, Proposal, ScenarioId, Trip } from "./types";

export type AppState = {
  trip: Trip | null;
  bag: BagState;
  pending: Proposal | null;
  log: LogEntry[];
};

export class Store {
  state: AppState = {
    trip: null,
    bag: createBag(),
    pending: null,
    log: [],
  };

  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private note(actor: Actor, message: string, tool?: string): void {
    this.state = {
      ...this.state,
      log: [...this.state.log, { at: Date.now(), actor, tool, message }].slice(-40),
    };
    this.emit();
  }

  private requireTrip(): string | null {
    if (!this.state.trip) return "No trip yet. Call set_trip or load a preset first.";
    return null;
  }

  loadPreset(id: ScenarioId, actor: Actor = "human"): string {
    const preset = getPreset(id);
    this.state = {
      trip: preset.trip,
      bag: bagFromIds(preset.itemIds),
      pending: null,
      log: [],
    };
    this.note(actor, `Loaded preset ${preset.label}.`, "load_preset");
    return formatManifest(preset.trip, this.state.bag);
  }

  setTrip(
    input: {
      destination: string;
      start: string;
      end: string;
      airlineId: string;
      bagClass?: "cabin" | "cabin+personal";
      scenario?: ScenarioId;
      members?: number;
    },
    actor: Actor,
  ): string {
    if (this.state.bag.sealed) return "Bag is sealed. Trip details are frozen.";
    const trip: Trip = {
      destination: input.destination,
      start: input.start,
      end: input.end,
      airlineId: input.airlineId,
      bagClass: input.bagClass ?? "cabin",
      scenario: input.scenario ?? this.state.trip?.scenario ?? "ryanair",
      members: input.members ?? 1,
    };
    this.state = { ...this.state, trip, pending: null };
    this.note(actor, `Trip set to ${trip.destination} on ${trip.airlineId}.`, "set_trip");
    return formatManifest(trip, this.state.bag);
  }

  getTrip(): string {
    if (!this.state.trip) return "No trip yet. Call set_trip or load a preset first.";
    return formatManifest(this.state.trip, this.state.bag);
  }

  searchProducts(query: string): string {
    const hits = searchCatalog(query);
    if (hits.length === 0) return `No catalog items match "${query}".`;
    return hits.map(formatItem).join("\n");
  }

  addToBag(itemId: string, actor: Actor): string {
    const missing = this.requireTrip();
    if (missing) return missing;
    const item = findItem(itemId);
    if (!item) return `Unknown item "${itemId}". Search the catalog first.`;
    const result = addItem(this.state.bag, item);
    if (!result.ok) return result.error;
    this.state = { ...this.state, bag: result.value, pending: null };
    this.note(actor, `Added ${item.name}.`, "add_to_bag");
    return this.getTrip();
  }

  removeFromBag(itemId: string, actor: Actor): string {
    const missing = this.requireTrip();
    if (missing) return missing;
    const result = removeItem(this.state.bag, itemId);
    if (!result.ok) return result.error;
    this.state = { ...this.state, bag: result.value, pending: null };
    this.note(actor, `Removed ${itemId}.`, "remove_from_bag");
    return this.getTrip();
  }

  pin(itemId: string, actor: Actor): string {
    const missing = this.requireTrip();
    if (missing) return missing;
    const result = pinItem(this.state.bag, itemId);
    if (!result.ok) return result.error;
    this.state = { ...this.state, bag: result.value };
    this.note(actor, `Pinned ${itemId}.`, "pin_item");
    return this.getTrip();
  }

  unpin(itemId: string, actor: Actor): string {
    const missing = this.requireTrip();
    if (missing) return missing;
    const result = unpinItem(this.state.bag, itemId);
    if (!result.ok) return result.error;
    this.state = { ...this.state, bag: result.value };
    this.note(actor, `Unpinned ${itemId}.`, "unpin_item");
    return this.getTrip();
  }

  explain(): string {
    const missing = this.requireTrip();
    if (missing) return missing;
    return formatViolations(evaluate(this.state.trip!, this.state.bag));
  }

  propose(actor: Actor): string {
    const missing = this.requireTrip();
    if (missing) return missing;
    const result = proposeRepack(this.state.trip!, this.state.bag, CATALOG);
    if (!result.ok) return result.error;
    this.state = { ...this.state, pending: result.value };
    this.note(actor, result.value.rationale, "propose_repack");
    return formatProposal(result.value, CATALOG);
  }

  acceptProposal(actor: Actor): string {
    if (!this.state.pending) return "No pending proposal. Call propose_repack first.";
    const applied = applyProposal(this.state.bag, this.state.pending, CATALOG);
    if (!applied.ok) return applied.error;
    this.state = { ...this.state, bag: applied.value, pending: null };
    this.note(actor, "Accepted the repack proposal.", "accept_proposal");
    return this.getTrip();
  }

  rejectProposal(actor: Actor): string {
    if (!this.state.pending) return "No pending proposal. Call propose_repack first.";
    this.state = { ...this.state, pending: null };
    this.note(actor, "Rejected the repack proposal.", "reject_proposal");
    return "Proposal rejected. The bag is unchanged.";
  }

  seal(actor: Actor): string {
    const missing = this.requireTrip();
    if (missing) return missing;
    const blocks = blocking(this.state.trip!, this.state.bag);
    if (blocks.length > 0) {
      return `Cannot seal: ${blocks[0].message}`;
    }
    const result = sealBag(this.state.bag);
    if (!result.ok) return result.error;
    this.state = { ...this.state, bag: result.value, pending: null };
    this.note(actor, "Sealed the bag.", "seal_bag");
    return `Bag sealed. ${this.getTrip()}`;
  }
}
