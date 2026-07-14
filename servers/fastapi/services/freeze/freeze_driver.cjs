// Freeze driver: render a presentation once in headless Chromium, inject the
// freeze extractor, and dump one {html, scene} per slide to JSON. This is the
// single browser pass of the export pipeline; everything downstream (WeasyPrint
// PDF, python-pptx PPTX) is browser-free and reads this JSON.
//
// Usage:
//   node freeze_driver.js <presentationId> <outJson> [baseUrl] [fastapiUrl] [chromePath]
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const presentationId = process.argv[2];
const outJson = process.argv[3];
const baseUrl = process.argv[4] || "http://127.0.0.1:3000";
const fastapiUrl = process.argv[5] || "http://127.0.0.1:8000";
const chromePath =
  process.argv[6] ||
  process.env.CHROME_PATH ||
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const EXTRACTOR = fs.readFileSync(path.join(__dirname, "freeze_extractor.js"), "utf-8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "shell",
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-proxy-server",
      "--proxy-bypass-list=<-loopback>",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  // Deployments con auth: /pdf-maker necesita la cookie de sesión para poder
  // traer los datos de la presentación (mismo mecanismo #exportCookie que usa
  // el exportador bundled). Sin esto, la página monta 0 slides.
  const cookieHeader = (process.env.FREEZE_COOKIE_HEADER || "").trim();
  const authFragment = cookieHeader
    ? `#exportCookie=${encodeURIComponent(cookieHeader)}`
    : "";
  const url = `${baseUrl}/pdf-maker?id=${presentationId}&fastapiUrl=${fastapiUrl}${authFragment}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });

  // Wait until slides are mounted and stable.
  let count = 0;
  for (let i = 0; i < 90; i++) {
    const n = await page.$$eval(".main-slide", (els) => els.length).catch(() => 0);
    if (n > 0 && n === count) break;
    count = n;
    await sleep(1000);
  }
  if (count === 0) {
    // Fallar fuerte (antes seguía y escribía []): sin slides no hay export, y
    // el motivo típico es auth o base_url inalcanzable desde el contenedor.
    throw new Error(
      `no slides mounted at ${baseUrl}/pdf-maker (cookie ${cookieHeader ? "present" : "MISSING"}; check auth/base_url)`
    );
  }
  await sleep(3000);

  await page.evaluate(EXTRACTOR);
  const slides = await page.evaluate(() => window.__freezeSlides());

  // Capture a crisp PNG for every SVG block (charts + vector art) during this
  // single browser pass, so the PPTX builder stays browser-free.
  for (const slide of slides) {
    for (const block of slide.scene.blocks) {
      if (block.type !== "svg" || !block.freezeId) continue;
      const handle = await page.$(`[data-freeze-id="${block.freezeId}"]`);
      if (!handle) continue;
      try {
        block.png = await handle.screenshot({ encoding: "base64", omitBackground: true });
      } catch (e) {
        // leave block.png unset; PPTX falls back to a placeholder rect
      }
    }
  }

  fs.writeFileSync(outJson, JSON.stringify(slides));
  const svg = slides.reduce((a, s) => a + s.scene.blocks.filter((b) => b.type === "svg").length, 0);
  console.log(`froze ${slides.length} slides (${svg} charts) -> ${outJson}`);
  await browser.close();
})().catch((e) => {
  console.error("FREEZE FAIL:", e.message);
  process.exit(1);
});
