const PORT = 9223;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  return res.json();
}

function cdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.addEventListener("open", () => {
      resolve({
        call(method, params = {}) {
          const msgId = ++id;
          return new Promise((res, rej) => {
            pending.set(msgId, { res, rej });
            ws.send(JSON.stringify({ id: msgId, method, params }));
          });
        },
        close: () => ws.close(),
      });
    });
    ws.addEventListener("error", reject);
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    });
  });
}

async function main() {
  let page;
  for (let i = 0; i < 30; i++) {
    try {
      const targets = await listTargets();
      page = targets.find((t) => t.type === "page");
      if (page) break;
    } catch {
      /* chrome not up yet */
    }
    await sleep(200);
  }
  if (!page) throw new Error("No page target");
  const client = await cdp(page.webSocketDebuggerUrl);
  await client.call("Page.enable");
  await client.call("Runtime.enable");
  await sleep(1800);
  const fs = await import("node:fs/promises");
  async function shot(name) {
    const { data } = await client.call("Page.captureScreenshot", { format: "png" });
    await fs.writeFile(`/tmp/stow-frame-${name}.png`, Buffer.from(data, "base64"));
    console.log("wrote", name);
  }
  await shot("01-start");
  await client.call("Runtime.evaluate", {
    expression: `document.querySelector('[data-act="pin"][data-id="violin"]')?.click()`,
  });
  await sleep(900);
  await shot("02-pinned");
  await client.call("Runtime.evaluate", {
    expression: `document.querySelector('[data-demo]')?.click()`,
  });
  await sleep(1400);
  await shot("03-handoff");
  await client.call("Runtime.evaluate", {
    expression: `document.querySelector('[data-act="accept"]')?.click()`,
  });
  await sleep(1000);
  await shot("04-accepted");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
