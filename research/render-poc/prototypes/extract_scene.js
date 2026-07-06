// Freeze-time "compiler": render slide once in headless Chromium, extract a
// browser-free structured scene (geometry + styles + semantics) as JSON.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const slidePath = process.argv[2];
const outPath = process.argv[3];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "shell",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto("file://" + path.resolve(slidePath), { waitUntil: "networkidle0" });

  const scene = await page.evaluate(() => {
    const toHex = (rgb) => {
      const m = (rgb || "").match(/\d+/g);
      if (!m) return null;
      return "#" + m.slice(0, 3).map((x) => (+x).toString(16).padStart(2, "0")).join("");
    };
    const blocks = [];
    document.querySelectorAll("[data-b]").forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const b = {
        type: el.dataset.b,
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
      };
      if (b.type === "text") {
        b.text = el.textContent.trim();
        b.fontSize = parseFloat(cs.fontSize);
        b.bold = +cs.fontWeight >= 600;
        b.color = toHex(cs.color);
        b.align = cs.textAlign;
      } else if (b.type === "rect") {
        b.fill = el.dataset.fill || toHex(cs.backgroundColor);
        b.radius = parseFloat(cs.borderTopLeftRadius) || 0;
        // features PPTX can't do faithfully -> flag for fallback
        b.gradient = cs.backgroundImage && cs.backgroundImage.includes("gradient");
        b.shadow = cs.boxShadow && cs.boxShadow !== "none";
      } else if (b.type === "chart") {
        b.chartType = el.dataset.charttype;
        b.data = JSON.parse(el.dataset.chart);
      } else if (b.type === "table") {
        b.table = JSON.parse(el.dataset.table);
      }
      blocks.push(b);
    });
    // also detect card backgrounds (gradient rects) that aren't data-b tagged
    document.querySelectorAll(".card").forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      blocks.push({
        type: "rect", x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
        fill: "#fbfaff", radius: parseFloat(cs.borderTopLeftRadius) || 0,
        gradient: cs.backgroundImage.includes("gradient"),
        shadow: cs.boxShadow !== "none",
      });
    });
    return { width: 1280, height: 720, blocks };
  });

  fs.writeFileSync(outPath, JSON.stringify(scene, null, 2));
  console.log(`scene: ${scene.blocks.length} blocks -> ${outPath}`);
  await browser.close();
})();
