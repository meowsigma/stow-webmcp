import { getAirline } from "../data/airlines";
import { PRESETS } from "../data/presets";
import { CATALOG } from "../data/catalog";
import { totalGrams, totalMl } from "../engine/bag";
import { evaluate } from "../engine/rules";
import type { Store } from "../engine/store";
import type { Compartment, Item } from "../engine/types";
import { kg, liters } from "../tools/format";

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function needle(grams: number, limitGrams: number): number {
  const ratio = Math.min(grams / Math.max(limitGrams, 1), 1.15);
  return -90 + ratio * 180;
}

const TRAYS: { id: Compartment; label: string }[] = [
  { id: "cabin", label: "Cabin" },
  { id: "liquids", label: "Liquids pouch" },
  { id: "personal", label: "Under seat" },
  { id: "checked", label: "Checked" },
];

function itemButtons(item: Item, pinned: boolean, sealed: boolean): string {
  if (sealed) return "";
  const pin = pinned
    ? `<button data-act="unpin" data-id="${esc(item.id)}">Unpin</button>`
    : `<button data-act="pin" data-id="${esc(item.id)}">Pin</button>`;
  return `<menu>${pin}<button data-act="remove" data-id="${esc(item.id)}">Remove</button></menu>`;
}

export function render(store: Store, root: HTMLElement, native: boolean): void {
  const { trip, bag, pending, log } = store.state;
  const airline = trip ? getAirline(trip.airlineId) : null;
  const grams = totalGrams(bag);
  const limit = (airline?.cabinKg ?? 10) * 1000;
  const violations = trip ? evaluate(trip, bag) : [];
  const angle = needle(grams, limit);
  const query = (root.querySelector<HTMLInputElement>("[data-search]")?.value ?? "").trim().toLowerCase();
  const catalog = CATALOG.filter((item) => {
    if (bag.items.some((packed) => packed.id === item.id)) return false;
    if (!query) return true;
    return `${item.name} ${item.id}`.toLowerCase().includes(query);
  });

  root.innerHTML = `
    <div class="shell ${bag.sealed ? "sealed" : ""}">
      <div class="top">
        <div>
          <h1 class="brand">Stow</h1>
          <p class="tag">Pack with your agent. Keep the veto.</p>
        </div>
        <div class="status">
          <div class="pill">${native ? "WebMCP native" : "WebMCP polyfill"}</div>
          <div>${esc(trip ? `${trip.destination} · ${airline?.name ?? ""}` : "No trip")}</div>
        </div>
      </div>

      <div class="presets">
        ${PRESETS.map(
          (preset) =>
            `<button data-preset="${preset.id}" aria-pressed="${trip?.scenario === preset.id}">${esc(preset.label)}</button>`,
        ).join("")}
        <button class="ghost" data-demo>Watch a handoff</button>
      </div>

      ${
        pending
          ? `<div class="proposal" role="status"><strong>Agent proposal — pins are kept</strong><p>${esc(pending.rationale)}</p>
            <div class="actions">
              <button class="solid" data-act="accept">Accept</button>
              <button class="ghost" data-act="reject">Reject</button>
            </div></div>`
          : ""
      }

      <form id="trip-form" class="trip panel" toolname="set_trip" tooldescription="Set the trip destination, dates, airline, and bag class." toolautosubmit>
        <label>Destination
          <input name="destination" required toolparamdescription="City or place name" value="${esc(trip?.destination ?? "")}">
        </label>
        <label>Start
          <input type="date" name="start" required toolparamdescription="Start date YYYY-MM-DD" value="${esc(trip?.start ?? "")}">
        </label>
        <label>End
          <input type="date" name="end" required toolparamdescription="End date YYYY-MM-DD" value="${esc(trip?.end ?? "")}">
        </label>
        <label>Airline
          <select name="airlineId" required toolparamdescription="FR Ryanair 10kg, BA 23kg, GO 9kg go-bag">
            <option value="FR" ${trip?.airlineId === "FR" ? "selected" : ""}>FR · Ryanair 10kg</option>
            <option value="BA" ${trip?.airlineId === "BA" ? "selected" : ""}>BA · 23kg</option>
            <option value="GO" ${trip?.airlineId === "GO" ? "selected" : ""}>GO · go-bag 9kg</option>
          </select>
        </label>
        <label>Bag
          <select name="bagClass" toolparamdescription="cabin or cabin+personal">
            <option value="cabin">Cabin</option>
            <option value="cabin+personal">Cabin + personal</option>
          </select>
        </label>
        <button class="solid" type="submit">Set trip</button>
      </form>

      <div class="grid">
        <section class="panel">
          <h2>Scale</h2>
          <svg class="scale" viewBox="0 0 200 120" aria-hidden="true">
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(196,165,116,0.35)" stroke-width="10" />
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="${grams > limit ? "#c2410c" : "#c4a574"}" stroke-width="10" stroke-dasharray="${Math.min((grams / limit) * 251, 251)} 251" />
            <line x1="100" y1="100" x2="100" y2="32" stroke="#f4ede1" stroke-width="3" transform="rotate(${angle} 100 100)" />
            <circle cx="100" cy="100" r="6" fill="#c4a574" />
          </svg>
          <div class="metric"><span>${kg(grams)}</span><span>${airline ? `${airline.cabinKg} kg limit` : "—"}</span></div>
          <div class="metric"><span>${liters(totalMl(bag))}</span><span>${airline ? `${airline.cabinLiters} L` : "—"}</span></div>
          <div class="chips">
            ${
              violations.length === 0
                ? `<div class="chip ok">${bag.sealed ? "Sealed. The threshold will take it." : "No blocking violations. You may seal."}</div>`
                : violations
                    .map((violation) => `<div class="chip ${violation.severity}">${esc(violation.message)}</div>`)
                    .join("")
            }
          </div>
          <div class="actions">
            <button class="ghost" data-act="propose" ${trip && !bag.sealed ? "" : "disabled"}>Propose repack</button>
            <button class="solid" data-act="seal" ${trip && !bag.sealed ? "" : "disabled"}>Seal bag</button>
          </div>
        </section>

        <section class="panel bag">
          <h2>The bag</h2>
          <p class="hint">You pin what you cannot lose. The agent may not drop a pin. Both of you watch the same scale.</p>
          ${TRAYS.map((tray) => {
            const items = bag.items.filter((item) => item.compartment === tray.id);
            if (tray.id === "checked" && items.length === 0) return "";
            return `<div class="tray"><h3>${tray.label}</h3><div class="tags">${
              items.length === 0
                ? `<span>Empty</span>`
                : items
                    .map(
                      (item) => `<article class="tag-item ${bag.pins.includes(item.id) ? "pinned" : ""}">
                        <strong>${esc(item.name)}</strong>
                        <span>${kg(item.grams)}${bag.pins.includes(item.id) ? " · pinned" : ""}</span>
                        ${itemButtons(item, bag.pins.includes(item.id), bag.sealed)}
                      </article>`,
                    )
                    .join("")
            }</div></div>`;
          }).join("")}
        </section>

        <aside class="panel">
          <h2>Catalog</h2>
          <input class="search" data-search placeholder="Search items" value="${esc(query)}">
          <div>
            ${catalog
              .slice(0, 12)
              .map(
                (item) => `<div class="catalog-item"><span>${esc(item.name)}<br><span>${kg(item.grams)}</span></span>
                <button data-act="add" data-id="${esc(item.id)}" ${bag.sealed ? "disabled" : ""}>Add</button></div>`,
              )
              .join("")}
          </div>
          <h2 style="margin-top:18px">Agent tools</h2>
          <div class="console" data-console></div>
        </aside>
      </div>

      <section class="panel log">
        <h2>Manifest log</h2>
        ${
          log.length === 0
            ? `<div class="log-row">Nothing yet. Load a preset or ask an agent to set_trip.</div>`
            : [...log]
                .reverse()
                .map(
                  (entry) =>
                    `<div class="log-row"><b>${esc(entry.actor)}${entry.tool ? " · " + esc(entry.tool) : ""}</b><span>${esc(entry.message)}</span></div>`,
                )
                .join("")
        }
      </section>
    </div>
  `;
}
