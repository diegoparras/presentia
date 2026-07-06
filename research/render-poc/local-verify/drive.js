// Headless driver to load a seeded presentation in the running editor and
// report render health (slide count, console errors) + a screenshot.
//
// Usage:
//   PRESENTATION_ID=<uuid> node drive.js
//   PRESENTATION_ID=<uuid> BASE_URL=http://127.0.0.1:3000 \
//     FASTAPI_URL=http://127.0.0.1:8000 SCREENSHOT=editor_loaded.png node drive.js
//
// Notes:
//   - Run with HTTPS_PROXY="" so localhost isn't tunnelled through the agent proxy.
//   - `?fastapiUrl=` makes the client hit the backend origin directly (the FastAPI
//     CORSMiddleware allows the dev origin), avoiding the need for an nginx proxy.
const puppeteer = require("puppeteer-core");

const CHROME = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
const ID = process.env.PRESENTATION_ID;
const OUT = process.env.SCREENSHOT || "editor_loaded.png";

if (!ID) {
  console.error("Set PRESENTATION_ID=<uuid> (printed by seed.py).");
  process.exit(2);
}

const URL = `${BASE_URL}/presentation?id=${ID}&fastapiUrl=${encodeURIComponent(FASTAPI_URL)}`;

(async () => {
  const b = await puppeteer.launch({
    executablePath: CHROME,
    headless: "shell",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
           "--no-proxy-server", "--proxy-bypass-list=<-loopback>"],
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const errs = [];
  p.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
  console.log("navigating (dev compile may take a while)...");
  await p.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });

  let count = 0;
  for (let i = 0; i < 60; i++) {
    count = await p.$$eval('[id^="slide-"]',
      els => els.filter(e => /^slide-\d+$/.test(e.id)).length).catch(() => 0);
    if (count > 0) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("final url:", p.url());
  console.log("slide elements (#slide-N):", count);
  console.log("console errors:", errs.length);
  errs.slice(0, 6).forEach(e => console.log("  ERR:", e));
  await p.screenshot({ path: OUT });
  console.log("screenshot saved:", OUT);
  await b.close();
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
