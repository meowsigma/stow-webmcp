# Stow

**Pack with your agent. Keep the veto.**

Stow is an agent-native packing cockpit for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/). A human and their agent share one bag on one page. The human pins irreplaceables. The agent enforces airline mass, TSA liquids, and go-bag coverage. Neither side can finish the job alone.

This is not a cart with `add_to_cart`. It is a negotiation with physics.

## Why WebMCP

Backend MCP would pack in the cloud and email a list. The page would be disintermediated. Stow keeps the bag on screen:

- Imperative tools mutate the same store the UI renders.
- A declarative `set_trip` form can be filled by a human or an agent.
- Tools register and unregister with `AbortSignal` as the bag state changes.
- Destructive tools (`unpin_item`, `seal_bag`) stay in a visible tab.

People and agents can do something that was brittle before: pack a real constraint problem together, with a veto the agent cannot override.

## Live demo

- App: https://meowsigma.github.io/stow-webmcp/
- Source: https://github.com/meowsigma/stow-webmcp

## Try it locally

```bash
npm install
npm test
npm run dev
```

Production:

```bash
npm run build
npm run preview
```

### ChatGPT in-app browser

Open the live URL. WebMCP is native there. Ask:

> Pin the violin, explain the violations, propose a repack that keeps every pin, then wait for me to accept.

### Google Chrome 149+

1. Visit `chrome://flags/#enable-webmcp-testing` and enable it.
2. Restart Chrome.
3. Open Stow.
4. Use the on-page **Agent tools** console, Chrome DevTools WebMCP panel, or ChatGPT.

If native `document.modelContext` is missing, Stow loads the Chrome Labs polyfill so humans can still demo the same tools.

## WebMCP implementation

Native-first:

```js
await document.modelContext.registerTool({
  name: "search_products",
  description: "Search the product catalog",
  inputSchema: {
    /* ... */
  },
  execute: async (input) => {
    /* ... */
  },
});
```

Progressive tools (see `src/tools/register.ts`):

| Tool | Role |
|---|---|
| `get_trip` / `get_manifest` | Read shared state |
| `set_trip` | Declarative + imperative trip setup |
| `search_products` | Catalog search |
| `add_to_bag` / `remove_from_bag` | Pack / unpack |
| `pin_item` / `unpin_item` | Human veto |
| `explain_violations` | Recoverable rule errors |
| `propose_repack` | Veto-aware proposal (no mutation) |
| `accept_proposal` / `reject_proposal` | Handoff |
| `seal_bag` | Irreversible close when legal |

`propose_repack` never drops a pinned item. If pinned mass alone exceeds the limit, the tool says so in plain language.

## Presets

- **Ryanair weekend** — Lisbon, 10 kg, illegal lotion, too much mass. Pin the violin.
- **Family cabin** — toddler blanket vs diapers vs laptop.
- **Wildfire go-bag** — 72 hours. Documents and meds are required coverage.

## Tests

`npm test` covers bag invariants, airline/TSA/go-bag rules, veto-aware proposals, and progressive tool registration.

## License

Apache-2.0. The WebMCP polyfill in `public/webmcp-polyfill.js` is Copyright 2026 Google LLC, Apache-2.0, from [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools).
