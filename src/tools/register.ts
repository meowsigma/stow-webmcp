import { blocking } from "../engine/rules";
import type { Store } from "../engine/store";

export type ToolDefinition = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
  };
  execute: (input: Record<string, unknown>, extra?: { signal?: AbortSignal }) => Promise<string> | string;
};

export type ToolHost = {
  registerTool: (
    tool: ToolDefinition,
    options?: { signal?: AbortSignal },
  ) => Promise<void> | void;
};

export function shouldLoadPolyfill(nativeExists: boolean): boolean {
  return !nativeExists;
}

export function legalToolNames(store: Store): string[] {
  const { trip, bag, pending } = store.state;
  const names = ["get_trip"];
  if (!bag.sealed) names.push("set_trip");
  if (!trip) return names;
  names.push("search_products", "get_manifest", "explain_violations");
  if (!bag.sealed) {
    names.push("add_to_bag");
    if (bag.items.length > 0) names.push("remove_from_bag", "pin_item");
    if (bag.pins.length > 0) names.push("unpin_item");
    if (blocking(trip, bag).length > 0) names.push("propose_repack");
    if (pending) names.push("accept_proposal", "reject_proposal");
    if (blocking(trip, bag).length === 0) names.push("seal_bag");
  }
  return names;
}

function tools(store: Store): ToolDefinition[] {
  const all: ToolDefinition[] = [
    {
      name: "get_trip",
      title: "Get trip and bag",
      description: "Read the current trip, packed items, pins, weight, and violations. Use when you need shared bag state.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => store.getTrip(),
    },
    {
      name: "set_trip",
      title: "Set trip",
      description: "Set destination, dates, airline id (FR, BA, or GO), and bag class for the packing session.",
      inputSchema: {
        type: "object",
        properties: {
          destination: { type: "string", description: "City or place name" },
          start: { type: "string", description: "Start date YYYY-MM-DD" },
          end: { type: "string", description: "End date YYYY-MM-DD" },
          airlineId: { type: "string", enum: ["FR", "BA", "GO"], description: "FR Ryanair 10kg, BA 23kg, GO 9kg go-bag" },
          bagClass: { type: "string", enum: ["cabin", "cabin+personal"] },
          members: { type: "number" },
        },
        required: ["destination", "start", "end", "airlineId"],
        additionalProperties: false,
      },
      execute: (input) =>
        store.setTrip(
          {
            destination: String(input.destination ?? ""),
            start: String(input.start ?? ""),
            end: String(input.end ?? ""),
            airlineId: String(input.airlineId ?? "FR"),
            bagClass: input.bagClass === "cabin+personal" ? "cabin+personal" : "cabin",
            members: typeof input.members === "number" ? input.members : 1,
          },
          "agent",
        ),
    },
    {
      name: "search_products",
      title: "Search the product catalog",
      description: "Search the product catalog of packable items by name, id, or flag (liquid, lithium, clothing, document).",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search text. Empty returns the full catalog." },
        },
        required: ["query"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: (input) => store.searchProducts(String(input.query ?? "")),
    },
    {
      name: "get_manifest",
      title: "Get packing manifest",
      description: "Return the packed manifest with mass, volume, pins, and rule violations.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => store.getTrip(),
    },
    {
      name: "add_to_bag",
      title: "Add item to bag",
      description: "Pack a catalog item into the shared bag by id. The human sees the item appear immediately.",
      inputSchema: {
        type: "object",
        properties: { itemId: { type: "string", description: "Catalog id from search_products" } },
        required: ["itemId"],
        additionalProperties: false,
      },
      execute: (input) => store.addToBag(String(input.itemId ?? ""), "agent"),
    },
    {
      name: "remove_from_bag",
      title: "Remove item from bag",
      description: "Remove an unpinned item from the bag. Fails if the item is pinned by the human.",
      inputSchema: {
        type: "object",
        properties: { itemId: { type: "string" } },
        required: ["itemId"],
        additionalProperties: false,
      },
      execute: (input) => store.removeFromBag(String(input.itemId ?? ""), "agent"),
    },
    {
      name: "pin_item",
      title: "Pin item",
      description: "Mark an item as irreplaceable. Propose_repack will never drop pinned items.",
      inputSchema: {
        type: "object",
        properties: { itemId: { type: "string" } },
        required: ["itemId"],
        additionalProperties: false,
      },
      execute: (input) => store.pin(String(input.itemId ?? ""), "agent"),
    },
    {
      name: "unpin_item",
      title: "Unpin item",
      description: "Remove a pin so the item may be dropped by a repack. Ask the human before unpinning sentimental items.",
      inputSchema: {
        type: "object",
        properties: { itemId: { type: "string" } },
        required: ["itemId"],
        additionalProperties: false,
      },
      annotations: { destructiveHint: true },
      execute: (input) => store.unpin(String(input.itemId ?? ""), "agent"),
    },
    {
      name: "explain_violations",
      title: "Explain packing violations",
      description: "Explain current airline, TSA, and coverage violations in plain language.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => store.explain(),
    },
    {
      name: "propose_repack",
      title: "Propose a repack",
      description: "Draft a veto-aware repack that never drops pinned items. Does not change the bag until accept_proposal.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => store.propose("agent"),
    },
    {
      name: "accept_proposal",
      title: "Accept repack proposal",
      description: "Apply the pending repack proposal to the shared bag.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => store.acceptProposal("agent"),
    },
    {
      name: "reject_proposal",
      title: "Reject repack proposal",
      description: "Reject the pending repack proposal and leave the bag unchanged.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => store.rejectProposal("agent"),
    },
    {
      name: "seal_bag",
      title: "Seal the bag",
      description: "Seal the bag when there are no blocking violations. Frozen after success.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { destructiveHint: true },
      execute: () => store.seal("agent"),
    },
  ];

  const allowed = new Set(legalToolNames(store));
  return all.filter((tool) => allowed.has(tool.name));
}

let active: AbortController | null = null;

export async function syncTools(store: Store, host: ToolHost): Promise<void> {
  active?.abort();
  active = new AbortController();
  const signal = active.signal;
  for (const tool of tools(store)) {
    if (signal.aborted) return;
    await host.registerTool(tool, { signal });
  }
}
