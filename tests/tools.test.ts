import { describe, expect, it } from "vitest";
import { Store } from "../src/engine/store";
import { legalToolNames, syncTools, type ToolHost } from "../src/tools/register";
import { shouldLoadPolyfill } from "../src/tools/register";

class FakeHost implements ToolHost {
  registered: string[] = [];
  aborted = 0;

  async registerTool(tool: { name: string }, options?: { signal?: AbortSignal }): Promise<void> {
    this.registered.push(tool.name);
    options?.signal?.addEventListener("abort", () => {
      this.aborted += 1;
      this.registered = this.registered.filter((name) => name !== tool.name);
    });
  }
}

describe("tool wrappers", () => {
  it("search_products filters the catalog", () => {
    const store = new Store();
    store.loadPreset("ryanair");
    const text = store.searchProducts("liquid");
    expect(text).toMatch(/Lotion 150ml/);
    expect(text).not.toMatch(/Violin/);
  });

  it("add_to_bag unknown id is actionable", () => {
    const store = new Store();
    store.loadPreset("ryanair");
    expect(store.addToBag("nope", "agent")).toMatch(/Unknown item/);
  });

  it("refuses to remove a pinned item", () => {
    const store = new Store();
    store.loadPreset("ryanair");
    store.pin("violin", "human");
    expect(store.removeFromBag("violin", "agent")).toMatch(/pinned/i);
  });

  it("seal_bag refuses blocking violations", () => {
    const store = new Store();
    store.loadPreset("ryanair");
    expect(store.seal("human")).toMatch(/Cannot seal/i);
  });

  it("accept_proposal without a pending proposal is actionable", () => {
    const store = new Store();
    store.loadPreset("ryanair");
    expect(store.acceptProposal("agent")).toMatch(/No pending proposal/i);
  });
});

describe("progressive registration", () => {
  it("does not register add_to_bag after seal", async () => {
    const store = new Store();
    store.loadPreset("gobag");
    store.addToBag("passport", "human");
    store.addToBag("meds", "human");
    const host = new FakeHost();
    await syncTools(store, host);
    expect(legalToolNames(store)).toContain("add_to_bag");
    const sealed = store.seal("human");
    expect(sealed).toMatch(/sealed/i);
    await syncTools(store, host);
    expect(legalToolNames(store)).not.toContain("add_to_bag");
    expect(legalToolNames(store)).toContain("get_manifest");
  });

  it("registers accept_proposal only while a proposal is pending", async () => {
    const store = new Store();
    store.loadPreset("ryanair");
    expect(legalToolNames(store)).not.toContain("accept_proposal");
    const proposed = store.propose("agent");
    expect(proposed).toMatch(/Drop/i);
    expect(legalToolNames(store)).toContain("accept_proposal");
    store.rejectProposal("human");
    expect(legalToolNames(store)).not.toContain("accept_proposal");
  });

  it("skips the polyfill when native modelContext exists", () => {
    expect(shouldLoadPolyfill(true)).toBe(false);
    expect(shouldLoadPolyfill(false)).toBe(true);
  });
});
