// OG şəkli (1200×630) və apple-touch-icon (180×180) yaradır: public/og-image.png, public/apple-touch-icon.png
// İşə salmaq: npm run assets  (Playwright Chromium lazımdır: npx playwright install chromium)
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const site = JSON.parse(readFileSync(resolve(ROOT, "src/data/site.json"), "utf8"));
const font = (pkg, file) => "data:font/woff2;base64," + readFileSync(require.resolve(`${pkg}/files/${file}`)).toString("base64");
const faces = [
  ["Geologica", 600, font("@fontsource/geologica", "geologica-latin-ext-600-normal.woff2"), "U+0100-02BA"],
  ["Geologica", 600, font("@fontsource/geologica", "geologica-latin-600-normal.woff2"), "U+0000-00FF"],
  ["Geologica", 700, font("@fontsource/geologica", "geologica-latin-700-normal.woff2"), "U+0000-00FF"],
  ["Plus Jakarta Sans", 500, font("@fontsource/plus-jakarta-sans", "plus-jakarta-sans-latin-500-normal.woff2"), "U+0000-00FF"],
  ["Plus Jakarta Sans", 500, font("@fontsource/plus-jakarta-sans", "plus-jakarta-sans-latin-ext-500-normal.woff2"), "U+0100-02BA"]
].map(([f, w, src, r]) => `@font-face{font-family:"${f}";font-weight:${w};src:url(${src}) format("woff2");unicode-range:${r}}`).join("\n");

const LOGO = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 20 20"><path d="M5 3v14M15 3v14M5 10h10" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M2 10h16" stroke="#D9981F" stroke-width="1.2" stroke-dasharray="1.5 2" fill="none"/></svg>`;

// slogan "balansda," sözü şablondakı kimi kobalt + qızılı xətlə
const [w1, w2, ...rest] = site.slogan.split(" ");
const og = `<!doctype html><meta charset="utf-8"><style>${faces}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#F3F6FA;font-family:"Plus Jakarta Sans",sans-serif;color:#0B1F33;position:relative;overflow:hidden}
body::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(11,31,51,.14) 1.5px,transparent 1.5px);background-size:30px 30px;-webkit-mask-image:linear-gradient(160deg,#000,transparent 75%)}
.glow{position:absolute;right:-180px;top:-120px;width:760px;height:760px;border-radius:50%;background:radial-gradient(closest-side,rgba(36,83,255,.16),transparent)}
.wrap{position:relative;padding:76px 84px;height:100%;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;align-items:center;gap:20px;font:700 44px/1 Geologica;letter-spacing:-.02em}
.brand em{font-style:normal;color:#2453FF}
.mk{width:76px;height:76px;border-radius:22px;background:#0B1F33;display:grid;place-items:center}
h1{font:600 76px/1.06 Geologica;letter-spacing:-.03em;max-width:980px}
h1 .hl{color:#2453FF;position:relative;white-space:nowrap}
h1 .hl::after{content:"";position:absolute;left:-1%;right:-1%;bottom:-6px;height:8px;border-radius:8px;background:#D9981F}
.foot{display:flex;gap:14px;font-weight:500;font-size:24px;color:#5B6C7E}
.foot span{background:#fff;border:1px solid #DCE4EC;border-radius:999px;padding:10px 20px}
</style>
<div class="glow"></div>
<div class="wrap">
  <div class="brand"><span class="mk">${LOGO(44)}</span><span>Hamilton<em>.az</em></span></div>
  <h1>${w1} <span class="hl">${w2}</span> ${rest.join(" ")}</h1>
  <div class="foot"><span>Mühasibatlıq</span><span>Vergi konsultasiyası</span><span>1C və server</span></div>
</div>`;

const icon = `<!doctype html><style>*{margin:0}body{width:180px;height:180px;background:#0B1F33;display:grid;place-items:center}</style>${LOGO(116)}`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(og);
await page.evaluate(() => document.fonts.ready);
writeFileSync(resolve(ROOT, "public/og-image.png"), await page.screenshot({ type: "png" }));
await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(icon);
writeFileSync(resolve(ROOT, "public/apple-touch-icon.png"), await page.screenshot({ type: "png" }));
await browser.close();
console.log("public/og-image.png və public/apple-touch-icon.png yaradıldı");
