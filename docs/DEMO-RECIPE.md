# How to make a clean website demo video (the Stow way)

A repeatable recipe for turning any web app into a <3 minute narrated MP4 that judges, investors, or teammates can watch once and understand. Tested end-to-end on Stow for the OpenAI WebMCP Challenge.

**What you need:** a running web app, a Linux or macOS box with Chrome 149+, `ffmpeg`, Node 18+, and (optional) Python `uv` for the voice. No paid services. No GPU.

---

## 1. Plan the story first (5 minutes)

Write the narration as plain prose, then turn it into a shot list. Rule: every visual change must come from something the narrator is saying.

Template:

```
[SHOT 1 — 8s]  The home screen. State the problem.
[SHOT 2 — 8s]  A single user action that matters (pin / add / vote / sign).
[SHOT 3 — 12s] The agent's contribution. This is the money shot.
[SHOT 4 — 8s]  The result (sealed / approved / shipped).
[SHOT 5 — 4s]  Recap. Product name. URL.
```

Aim for **3–5 shots, 40–60 seconds total**. Shorter beats longer. The Devpost limit is 3 minutes but judges will only watch the first 90.

**Narration length check:** the TTS should land within ±2 seconds of the visuals, or you lose the lip-sync illusion (it's not lip-sync, it's timing).

---

## 2. Record a browser session (3 minutes)

### 2a. Start headless Chrome with remote debugging

```bash
PROFILE="/tmp/demo-$(date +%s)"
google-chrome \
  --headless=new \
  --disable-gpu \
  --window-size=1440,900 \
  --user-data-dir="$PROFILE" \
  --no-first-run --no-default-browser-check \
  --remote-debugging-port=9222 \
  "$LIVE_URL" &
sleep 3
curl -sf http://127.0.0.1:9222/json/version >/dev/null && echo "chrome up"
```

**Why headless:** no flash, no window manager noise, deterministic sizes, scripts can drive it via DevTools Protocol.

### 2b. Drive the page with a small CDP script

Save as `record.mjs`. The structure stays the same for any product — only the `evalExpr` calls change.

```js
const PORT = 9222;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  await new Promise((res) => ws.addEventListener("open", res));
  const call = (method, params = {}) => new Promise((res, rej) => {
    const msgId = ++id;
    pending.set(msgId, { res, rej });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) rej(new Error(JSON.stringify(m.error)));
      else res(m.result);
    }
  });

  const fs = await import("node:fs/promises");
  const shot = async (name) => {
    const { data } = await call("Page.captureScreenshot", { format: "png" });
    await fs.writeFile(`/tmp/frame-${name}.png`, Buffer.from(data, "base64"));
    console.log("wrote", name);
  };

  await call("Page.enable");
  await call("Runtime.enable");
  await sleep(2000); // let fonts, JS, polyfills load

  // === Edit the steps below to match your product ===
  await shot("01-start");
  await call("Runtime.evaluate", { expression: `document.querySelector('[data-act="pin"]')?.click()` });
  await sleep(900);
  await shot("02-pinned");
  await call("Runtime.evaluate", { expression: `document.querySelector('[data-demo]')?.click()` });
  await sleep(1200);
  await shot("03-handoff");
  // ... as many shots as your story needs
}

main().catch((e) => { console.error(e); process.exit(1); });
```

**Tip:** add `data-act`, `data-demo`, `[data-run]` attributes to the buttons you want to drive. That keeps the script decoupled from your DOM.

Run it: `node record.mjs`. Frames land in `/tmp/frame-*.png`.

### 2c. Verify the frames

```bash
google-chrome --headless=new --disable-gpu --screenshot=/tmp/sanity.png "$LIVE_URL"
```

Open `/tmp/frame-03-handoff.png` and confirm the screenshot is what you want, not a blank page. The most common failure is the script racing ahead of fonts or async data. Fix with longer `sleep`.

---

## 3. Record the voice (2 minutes)

Skip recording your own mic — the result sounds more "trust me, bro" than you want. Use Edge TTS, which is free and sounds human enough for product demos.

```bash
uvx edge-tts --voice en-US-GuyNeural --rate=-5% \
  --write-media /tmp/narration.mp3 \
  --text "$(cat script.txt)"
```

Pick a voice that matches the product. `en-US-GuyNeural` is neutral. Try `en-US-JennyNeural` for a friendlier product, `en-GB-RyanNeural` for something stiffer. `--rate=-10%` sounds like a real person who cares.

**Length check:** `ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/narration.mp3`. Aim for under 90 seconds.

---

## 4. Assemble the MP4 (2 minutes)

Concatenate stills with a duration per shot, then mux the audio. ffmpeg's `concat` demuxer + image2 is the boring, reliable path.

```bash
cat > concat.txt <<'EOF'
file '/tmp/frame-01-start.png'
duration 8
file '/tmp/frame-02-pinned.png'
duration 8
file '/tmp/frame-03-handoff.png'
duration 12
file '/tmp/frame-04-accepted.png'
duration 8
file '/tmp/frame-04-accepted.png'
EOF
```

The last frame listed twice with no duration before it = tail of the last shot, which is how you get the audio to win.

**Heights must be even** or x264 will fail. Use a scale filter:

```bash
ffmpeg -y -f concat -safe 0 -i concat.txt \
  -i /tmp/narration.mp3 \
  -vf "scale=1440:trunc(ih/2)*2" \
  -c:v libx264 -pix_fmt yuv420p -r 30 \
  -c:a aac -shortest -movflags +faststart \
  /tmp/demo.mp4
```

`+faststart` moves the moov atom to the front, which means YouTube upload starts without re-encoding.

**Smoke test:** `ffprobe /tmp/demo.mp4` — duration should match the narration.

---

## 5. Polish (5 minutes, optional)

### Social card

If the demo lives on GitHub, add a social preview image so the link looks alive:

```bash
gh api -X PATCH repos/meow/meow \
  -F "social_preview=/tmp/og.png" \
  -H "Content-Type: multipart/form-data"
```

### Stills for the submission

```bash
ffmpeg -i /tmp/demo.mp4 -ss 25 -frames:v 1 /tmp/hero.png
```

Use the middle frame as the Devpost hero. Pick a moment when the product looks most "alive."

---

## 6. Upload + submit

```bash
# YouTube (Data API v3, OAuth scope youtube.upload)
# Easier: hand off /tmp/demo.mp4 and do it in the browser.
```

Then Devpost: paste the live URL, repo URL, YouTube URL, and a 200-word description that names:
- what the user does,
- what the agent does,
- what they can do together that was hard before.

---

## 7. If you only have 10 minutes

Drop steps 2b and 2c. Manually click through the flow in a real browser window, hit your OS screen recorder (`ffmpeg -f x11grab -video_size 1440x900 -framerate 30 -i :1.0 screen.mp4` on Linux, QuickTime on macOS, or `wf-recorder` on Wayland), and add the TTS over the recording in any editor. The result is uglier but still works.

The CDP path is faster, cleaner, and reproducible — once you have the script template, you can do a new product in under 15 minutes.

---

## Appendix: problems you will hit

| Symptom | Cause | Fix |
|---|---|---|
| ffmpeg: "height not divisible by 2" | Stow screenshots are 1440x813 | `scale=1440:trunc(ih/2)*2` |
| Frame is blank | Script ran before fonts/polyfill loaded | Add `await sleep(2000)` after `Runtime.enable` |
| TTS sounds robotic at `--rate=0` | Default rate is too flat | `--rate=-5%` to `-10%` |
| YouTube re-encodes forever | MP4 doesn't have `+faststart` | Add `-movflags +faststart` |
| Frame is too small on the live page | Browser zoom != 100% | Pass `--force-device-scale-factor=1` |
| Tool button click does nothing | Polyfill wasn't loaded by the time the script ran | Trigger via a `data-demo` button instead of fetching tools directly |
| Capture is mid-animation | `transform` on hovers | Disable transitions in the demo CSS or use `prefers-reduced-motion` media query |

---

## Appendix: the script you actually save

A reusable `record.mjs` lives at `docs/record-template.mjs` in the Stow repo. The only product-specific lines are the `evalExpr` calls. Fork it.
