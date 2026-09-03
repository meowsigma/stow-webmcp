# Devpost submission copy — Stow

Use this on https://webmcp.devpost.com/ before 2026-09-03 13:00 PT. Do not edit the live site, repo, or video after that freeze.

## Name

Stow

## Tagline

Pack with your agent. Keep the veto.

## Description

### Why this use case is a strong fit for WebMCP

Packing is a shared-attention problem. The human knows what cannot be left (a violin, a toddler blanket, a photo album). The agent knows what a threshold will not allow (Ryanair 10 kg, TSA 100 ml, a 72-hour go-bag missing papers). WebMCP lets those two kinds of knowledge act on the same page without DOM scraping and without a backend that bypasses the UI.

### How it creates a better user experience

The bag, the analog scale, and the manifest log are the product. When the agent calls `add_to_bag` or `propose_repack`, the human sees the same mutation. Pins are a visible veto. Seal is frozen. The agent does not get a private copy of the suitcase.

### What people and agents can do together that was difficult before

Before WebMCP, an agent either clicked around a packing list or packed off-screen. Stow makes an asymmetric co-op: the human pins, the agent proposes, the human accepts or rejects. `propose_repack` is constitutionally unable to drop a pin. That contract is the point.

### How WebMCP was implemented

- Native `document.modelContext.registerTool` when the browser provides it (ChatGPT in-app browser, Chrome with `chrome://flags/#enable-webmcp-testing`).
- Chrome Labs polyfill only as fallback.
- Progressive registration via `AbortSignal` so illegal tools disappear after seal or when no proposal is pending.
- Declarative `set_trip` form (`toolname`, `tooldescription`, `toolautosubmit`) plus imperative packing tools.
- Annotations: `readOnlyHint` on reads, `destructiveHint` on unpin/seal.
- Actionable error strings so agents recover (`Unknown item`, `pinned`, `Cannot seal`, `No pending proposal`).
- On-page tool console uses `getTools` / `executeTool` so judges can exercise the API without a second client.

## Testing instructions

1. Open the live URL in ChatGPT’s in-app browser, or in Chrome 149+ with WebMCP enabled.
2. Load **Ryanair weekend**.
3. Pin the violin (human).
4. Ask the agent (or use Agent tools → `propose_repack`) to propose a repack that keeps pins.
5. Confirm the proposal does not drop the violin.
6. Accept, then seal if the scale is legal — or switch to **Wildfire go-bag**, add passport + meds, seal.

Optional: click **Watch a handoff** for a scripted human pin + agent propose.

## Built with

TypeScript, Vite, Vitest, WebMCP (`document.modelContext`), Chrome Labs polyfill (fallback only).
