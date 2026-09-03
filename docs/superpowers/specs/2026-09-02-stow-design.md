# Stow — Design

A visual packing cockpit where a human and their agent share one bag.

## Problem

WebMCP exists so people and agents can act on the same page without the agent scraping the DOM. The OpenAI WebMCP Challenge asks for an app that becomes *meaningfully better* when both can use it together.

Most demos fail that test in one of two ways:

- **Agent-only CRUD.** Search products, book a slot, add a todo. The human is a spectator.
- **Toy canvases.** Photo filters, greeting cards, Rubik’s cubes. Delightful, not load-bearing.

Packing a real bag is the opposite. It is a negotiation:

- The human knows what they cannot leave (the violin, the photo album, the child’s blanket).
- The agent knows what the threshold will not allow (Ryanair 10 kg, TSA 100 ml, lithium in the cabin, a 72-hour go-bag that still has to close).
- Neither side should win unilaterally. An agent that unpacks a pinned heirloom is wrong. A human who ignores a lithium battery rule is also wrong.

Stow is that negotiation, made visible.

## Audience

Travelers on budget airlines, parents packing a family cabin bag, and households assembling an emergency go-bag. The same constraint engine serves all three.

## Why WebMCP is the right substrate

Backend MCP would pack in the cloud and email a list. The page would be disintermediated; the human would not see the bag change, could not pin by dragging, and could not veto a swap with one click.

WebMCP keeps the bag on screen:

- Tools mutate the same state the UI renders.
- Progressive registration means the agent only sees tools that are legal in the current state.
- Destructive actions (`seal_bag`, `unpin_item`) stay on the origin, in a visible tab, with the human watching.
- A declarative trip form lets a human *or* an agent set the threshold without a second protocol.

## Approaches considered

### A. Shared grocery / shop (ordinary)

Catalog + cart + checkout. Matches the Official Rules `search_products` example and OpenAI’s Verdant Market. High execution, near-zero creativity. **Rejected.**

### B. Care board / discharge copilot (ambitious, unsafe)

Higher impact (aging parents, hospital aftercare). PHI, medical-advice liability, weak 90-second demo. **Rejected for this deadline.**

### C. Stow — constraint cockpit (chosen)

Visual bag, typed tools, veto, proposals. Shippable in hours, demoable in 90 seconds, not in the Chrome or OpenAI showcases.

**Given up:** medical/care impact; multiplayer humans; live airline APIs (rules are data files, not network).

## Product

Three presets that load a trip + catalog:

1. **Ryanair weekend** — 10 kg cabin, 40×30×20 cm, Lisbon, 2 nights.
2. **Family cabin** — toddler + two adults, liquids bag, stroller decision.
3. **Wildfire go-bag** — 72 hours, N95s, meds, documents, pet food. Human pins irreplaceables.

The screen is a cockpit, not a form:

- Left: analog-scale weight/volume gauges and violation chips.
- Center: the bag as compartments (cabin, liquids pouch, under-seat, checked if allowed).
- Right: catalog + pinned items + proposal card.
- Bottom: attributed activity log (human vs agent).

Human actions and tool executions share one store. Every mutation writes a log row with `actor: "human" | "agent"`.

## Tool strategy

Single-purpose tools. No overlap. Register only when useful. Recoverable errors in plain language.

| Tool | When registered | Annotations |
|---|---|---|
| `get_trip` | always | `readOnlyHint: true` |
| `set_trip` | until sealed | write |
| `search_products` | after trip exists | `readOnlyHint: true` |
| `get_manifest` | after trip exists | `readOnlyHint: true` |
| `add_to_bag` | after trip exists, not sealed | write |
| `remove_from_bag` | bag non-empty, not sealed | write |
| `pin_item` | item in bag, not sealed | write |
| `unpin_item` | pinned item exists | write, `destructiveHint: true` |
| `explain_violations` | always after trip | `readOnlyHint: true` |
| `propose_repack` | violations exist | `readOnlyHint: true` (returns a proposal, does not mutate) |
| `accept_proposal` | proposal pending | write |
| `reject_proposal` | proposal pending | write |
| `seal_bag` | zero blocking violations | write, `destructiveHint: true` |

`search_products` is the catalog search. It also satisfies the Devpost repository snippet shape.

Declarative twin: a `<form toolname="set_trip" … toolautosubmit>` for destination, dates, airline, bag class.

Unregister via `AbortController` when state makes a tool illegal (e.g. `accept_proposal` after reject; `add_to_bag` after seal).

`execute` second argument `{ signal }` is forwarded to any async work (proposal scoring is sync; reserved for future fetches).

Error contract (examples):

- `add_to_bag` unknown id → `Unknown item "x". Search the catalog first.`
- `remove_from_bag` on pinned item → `Cannot remove "Violin": it is pinned. Unpin it first, or propose a swap that keeps it.`
- `seal_bag` with overweight → `Cannot seal: cabin bag is 12.4 kg over a 10 kg limit. Ask the agent to propose_repack or remove items.`
- `accept_proposal` with none pending → `No pending proposal. Call propose_repack first.`

## Engine (pure, tested)

Types:

- `Item`: id, name, grams, mlVolume, flags `{ liquid, lithium, document, medication, sentimental }`, compartment preference.
- `Trip`: destination, start, end, airline id, bag class, members[].
- `BagState`: items[], pins: Set<itemId>, sealed: boolean.
- `Rule`: airline max kg/cm, TSA liquids 100 ml, lithium cabin-only, go-bag coverage checklist.
- `Violation`: `{ code, severity: "block"|"warn", message, itemIds[] }`.
- `Proposal`: `{ id, drops[], adds[], rationale, remainingViolations }`.

Invariants:

1. Pinned items never appear in `proposal.drops`.
2. `seal_bag` succeeds only if no `block` violations.
3. Human and agent paths call the same functions.
4. Unknown schema properties are ignored by the engine; tool wrappers reject empty required fields with actionable errors.

Proposal algorithm (deterministic, no LLM): greedy drop of unpinned lowest-sentiment-density items (grams per utility) until weight/volume legal, then optional add of missing go-bag coverage items that fit. Utility: documents and medications > clothing > duplicates.

## WebMCP wiring

- Prefer native `document.modelContext`.
- Load Google Chrome Labs polyfill only when native is absent, so ChatGPT’s in-app browser and Chrome 149+ with `chrome://flags/#enable-webmcp-testing` use the real API.
- After each store mutation, resync registrations (abort previous controller, register the legal set).
- Highlight the bag and log when a tool runs (CSS class `tool-form-active` / actor flash).

## Stack

- Vite 5 + TypeScript
- Vanilla DOM (no React) — one writer, distinctive UI, no hook/lifecycle mismatch with AbortSignal
- Vitest for engine + tool-wrapper tests
- Static JSON: catalog, airlines, presets
- CSS custom properties from the Stow tokens (stone, brass, paper)
- Apache-2.0 (matches Chrome Labs polyfill)

## UI direction

Not liquid-glass SaaS. A night-gate instrument panel:

- Background `#0C0A09`, paper cards `#FAFAF9`, brass `#A16207`
- Display: Fraunces; UI: IBM Plex Sans; numbers: IBM Plex Mono
- Weight needle, luggage-tag chips, stamped log
- `prefers-reduced-motion` disables needle animation
- Keyboard: catalog add, pin, seal; visible focus rings

## Out of scope

- Accounts, payments, live weather/airline APIs
- Headless-only agents
- Medical advice
- Devpost form fill if no logged-in user session is available (prepare `SUBMISSION.md`)

## Verification

- `npx vitest run` — engine invariants and tool error strings
- `npx vite build` — production bundle
- Native: Chrome with WebMCP flag, `document.modelContext.getTools()` returns the legal set after each preset
- Human path: load Ryanair preset, add items until overweight, pin one, run `propose_repack` from an on-page inspector, accept, seal
- Polyfill path: same flow without the flag
- No unrelated files in the git diff

## Assumptions

- Deadline is 2026-09-03 13:00 PT. Live URL + public GitHub are required to win; local work proceeds even if deploy/YouTube/Devpost stay `NOT PROVEN`.
- `document.modelContext.registerTool` is the contest API (not `navigator.modelContext`).
- Judges may not run the live site; video and description must show the human+agent loop.

## Self-review

- No TBD/TODO.
- Architecture matches the tool table.
- Scope is one product (Stow), three presets, one engine.
- `search_products` means catalog search, not a store.
