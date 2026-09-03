import "./ui/styles.css";
import { Store } from "./engine/store";
import { legalToolNames, shouldLoadPolyfill, syncTools } from "./tools/register";
import { render } from "./ui/render";

const store = new Store();
const appNode = document.querySelector("#app");
if (!(appNode instanceof HTMLElement)) throw new Error("Missing #app");
const app: HTMLElement = appNode;

function nativeExists(): boolean {
  return typeof document.modelContext === "object" && document.modelContext !== null;
}

let usedNative = nativeExists();
let wired = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function host(): Promise<NonNullable<Document["modelContext"]>> {
  if (!document.modelContext) {
    throw new Error("document.modelContext is unavailable");
  }
  return document.modelContext;
}

function restoreSearch(value: string, caret: number): void {
  const next = app.querySelector<HTMLInputElement>("[data-search]");
  if (!next) return;
  next.value = value;
  next.focus();
  next.setSelectionRange(caret, caret);
}

async function refresh(): Promise<void> {
  const context = await host();
  await syncTools(store, context);
  render(store, app, usedNative);
  await paintConsole(app);
}

function wireOnce(): void {
  if (wired) return;
  wired = true;

  app.addEventListener("click", (event) => {
    const preset = (event.target as HTMLElement).closest<HTMLElement>("[data-preset]");
    if (preset?.dataset.preset === "ryanair" || preset?.dataset.preset === "family" || preset?.dataset.preset === "gobag") {
      store.loadPreset(preset.dataset.preset, "human");
      return;
    }
    if ((event.target as HTMLElement).closest("[data-demo]")) {
      void demoHandoff();
      return;
    }
    const run = (event.target as HTMLElement).closest<HTMLElement>("[data-run]");
    if (run?.dataset.run) {
      void runTool(run.dataset.run);
      return;
    }
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!target) return;
    const act = target.dataset.act;
    const id = target.dataset.id ?? "";
    if (act === "add") store.addToBag(id, "human");
    if (act === "remove") store.removeFromBag(id, "human");
    if (act === "pin") store.pin(id, "human");
    if (act === "unpin") store.unpin(id, "human");
    if (act === "propose") store.propose("human");
    if (act === "accept") store.acceptProposal("human");
    if (act === "reject") store.rejectProposal("human");
    if (act === "seal") store.seal("human");
  });

  app.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== "trip-form") return;
    event.preventDefault();
    const data = new FormData(form);
    const result = store.setTrip(
      {
        destination: String(data.get("destination") ?? ""),
        start: String(data.get("start") ?? ""),
        end: String(data.get("end") ?? ""),
        airlineId: String(data.get("airlineId") ?? "FR"),
        bagClass: data.get("bagClass") === "cabin+personal" ? "cabin+personal" : "cabin",
      },
      "human",
    );
    (event as SubmitEvent).respondWith?.(result);
  });

  app.addEventListener("input", (event) => {
    const search = event.target;
    if (!(search instanceof HTMLInputElement) || !search.matches("[data-search]")) return;
    const value = search.value;
    const caret = search.selectionStart ?? value.length;
    render(store, app, usedNative);
    void paintConsole(app).then(() => restoreSearch(value, caret));
  });
}

async function runTool(name: string): Promise<void> {
  if (!document.modelContext) return;
  const tools = await document.modelContext.getTools();
  const tool = tools.find((entry) => entry.name === name);
  const args = app.querySelector<HTMLTextAreaElement>("[data-args]")?.value || "{}";
  const out = app.querySelector("[data-out]");
  if (!tool) return;
  try {
    const result = await document.modelContext.executeTool(tool, args);
    if (out) out.textContent = String(result);
  } catch (error) {
    if (out) out.textContent = error instanceof Error ? error.message : String(error);
  }
}

async function paintConsole(root: HTMLElement): Promise<void> {
  const mount = root.querySelector("[data-console]");
  if (!mount || !document.modelContext) return;
  const names = legalToolNames(store);
  const tools = await document.modelContext.getTools();
  const previousArgs = (root.querySelector<HTMLTextAreaElement>("[data-args]")?.value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  mount.innerHTML = tools
    .map((tool) => {
      const enabled = names.includes(tool.name);
      return `<div class="tool-row"><span>${tool.name}${enabled ? "" : " (stale)"}</span>
        <button type="button" data-run="${tool.name}">Run</button></div>`;
    })
    .join("");
  mount.insertAdjacentHTML(
    "beforeend",
    `<textarea data-args placeholder='{"query":"liquid"}'>${previousArgs}</textarea>
     <pre data-out class="hint">getTools: ${tools.map((tool) => tool.name).join(", ") || "(none)"}</pre>`,
  );
}

async function demoHandoff(): Promise<void> {
  store.loadPreset("ryanair", "human");
  store.pin("violin", "human");
  await new Promise((resolve) => setTimeout(resolve, 80));
  const context = document.modelContext;
  if (!context) return;
  const tools = await context.getTools();
  const propose = tools.find((tool) => tool.name === "propose_repack");
  if (propose) await context.executeTool(propose, "{}");
}

async function boot(): Promise<void> {
  usedNative = nativeExists();
  if (shouldLoadPolyfill(usedNative)) {
    await loadScript("/webmcp-polyfill.js");
  }
  wireOnce();
  store.subscribe(() => {
    void refresh();
  });
  store.loadPreset("ryanair", "human");
}

void boot();
