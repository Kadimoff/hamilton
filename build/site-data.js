// Vite plagini: index.html-i src/data/*.json və src/partials/* əsasında build zamanı statik HTML-ə çevirir.
// Səhifə JS-siz də tam məzmunla gəlir (SEO, LCP), JSON dəyişəndə dev server səhifəni yeniləyir.
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fmt } from "../src/js/lib/format.js";

const ROOT = resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const readJSON = (p) => JSON.parse(read(p));

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const pct = (v) => `${+(v * 100).toFixed(2)}%`;

export function loadData() {
  const site = readJSON("src/data/site.json");
  const services = readJSON("src/data/services.json");
  const tax = readJSON("src/data/tax.json");
  const vat = tax.rates.vat.value;
  const net = 10000;
  const vatAmt = Math.round(net * vat * 100) / 100;
  const CIRC = 2 * Math.PI * 32, frac = vatAmt / (net + vatAmt); // hero-dakı ƏDV donut-u
  const deadline = Object.fromEntries(tax.deadlines.map((d) => [d.id, d]));
  for (const id of ["vat", "profit-annual"]) if (!deadline[id]) throw new Error(`tax.json: "${id}" son tarixi yoxdur`);
  const video = heroVideo();
  return {
    site,
    services,
    tax: {
      vat: { ...tax.rates.vat, pct: pct(vat) },
      profit: { ...tax.rates.profit, pct: pct(tax.rates.profit.value) }
    },
    deadline: { ...deadline, profit: deadline["profit-annual"] },
    // statik HTML-dəki ilkin rəqəmlər (JS işə düşənə qədər) də dərəcədən hesablanır
    sample: {
      net: fmt(net), vat: fmt(vatAmt), gross: fmt(net + vatAmt),
      net0: fmt(net, 0), vat0: fmt(vatAmt, vatAmt % 1 ? 2 : 0), gross0: fmt(net + vatAmt, (net + vatAmt) % 1 ? 2 : 0),
      netPct: ((net / (net + vatAmt)) * 100).toFixed(1), vatPct: ((vatAmt / (net + vatAmt)) * 100).toFixed(1),
      arcDash: `${(CIRC * frac).toFixed(1)} ${CIRC.toFixed(1)}`, arcOffset: (-(CIRC * (1 - frac))).toFixed(1)
    },
    year: new Date().getFullYear(),
    video
  };
}

// public/assets/hero.mp4 + hero-poster.jpg olduqda video hero aktivləşir
function heroVideo() {
  const dir = resolve(ROOT, "public/assets");
  const has = (f) => existsSync(resolve(dir, f)) && statSync(resolve(dir, f)).size > 0;
  if (!has("hero.mp4") || !has("hero-poster.jpg")) return null;
  return { webm: has("hero.webm") };
}

function lookup(ctx, path) {
  const v = path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ctx);
  if (v == null || typeof v === "object") throw new Error(`index.html: "{{${path}}}" üçün məlumat tapılmadı`);
  return v;
}

const icon = (name) => read(`src/partials/icons/${name}.svg`).trim();
const viz = (name) => read(`src/partials/viz/${name}.html`).trim();

const BLOCKS = {
  "svc-chips": ({ services }) =>
    services
      .map((s) => `<a class="chip" href="#${s.id}"><i${s.chipColor ? ` style="background:${s.chipColor}"` : ""}></i>${esc(s.short)}</a>`)
      .join("\n          "),

  services: ({ services }) =>
    services
      .map(
        (s, i) => `<article class="card ${s.size} rv" id="${s.id}">
          <div class="card-h">
            <span class="ic${s.tone ? " " + s.tone : ""}">${icon(s.icon)}</span>
            <h3>${esc(s.title)}</h3><span class="idx">${String(i + 1).padStart(2, "0")} / ${String(services.length).padStart(2, "0")}</span>
          </div>
          ${viz(s.viz).replace(/\n/g, "\n          ")}
          <p class="d">${esc(s.description)}</p>
          <ul class="feats">${s.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
          <a class="more" href="#elaqe" data-svc="${esc(s.value)}">${esc(s.cta)} <span>→</span></a>
        </article>`
      )
      .join("\n\n        "),

  "svc-pick": ({ services }) =>
    services
      .map(
        (s, i) =>
          `<label><input type="radio" name="service" id="sv${i + 1}" value="${esc(s.value)}"${i === 0 ? " checked" : ""}><span>${esc(s.pickLabel)}</span></label>`
      )
      .join("\n            "),

  "footer-services": ({ services }) => services.map((s) => `<li><a href="#${s.id}">${esc(s.short)}</a></li>`).join(""),

  "hero-video": ({ video }) => {
    if (!video) return "";
    const src = [video.webm ? `<source data-src="/assets/hero.webm" type="video/webm">` : "", `<source data-src="/assets/hero.mp4" type="video/mp4">`].join("");
    return `<video class="hero-video" id="heroVideo" muted loop playsinline preload="none" poster="/assets/hero-poster.jpg" aria-hidden="true" hidden>${src}</video>`;
  },

  jsonld: ({ site, services }) => {
    const sameAs = Object.values(site.social).filter(Boolean);
    const data = {
      "@context": "https://schema.org",
      "@type": "AccountingService",
      "@id": `${site.url}/#org`,
      name: site.name,
      url: `${site.url}/`,
      description: site.description,
      logo: `${site.url}/favicon.svg`,
      image: `${site.url}/og-image.png`,
      email: site.email,
      telephone: site.phone.e164,
      address: {
        "@type": "PostalAddress",
        streetAddress: site.address.street,
        addressLocality: site.address.city,
        postalCode: site.address.postalCode,
        addressCountry: site.address.country
      },
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: site.hours.days, opens: site.hours.opens, closes: site.hours.closes }
      ],
      areaServed: site.areaServed.map((name) => ({ "@type": "Place", name })),
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Xidmətlər",
        itemListElement: services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.title, description: s.description } }))
      },
      ...(sameAs.length ? { sameAs } : {})
    };
    return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
  }
};

export function renderHtml(html, ctx = loadData()) {
  html = html.replace(/<!--\s*render:([\w-]+)\s*-->/g, (_, name) => {
    if (!BLOCKS[name]) throw new Error(`index.html: naməlum blok "${name}"`);
    return BLOCKS[name](ctx);
  });
  return html.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, path) => esc(lookup(ctx, path)));
}

export default function siteData() {
  let ctx;
  return {
    name: "hamilton-site-data",
    buildStart() {
      ctx = loadData();
      if (ctx.site.mock) this.warn("site.json: əlaqə məlumatları hələ nümunədir (mock: true).");
    },
    // JSON hər sorğuda yenidən oxunur ki, dev serverdə dəyişiklik dərhal görünsün
    transformIndexHtml: { order: "pre", handler: (html) => renderHtml(html, loadData()) },
    configureServer(server) {
      server.watcher.add([resolve(ROOT, "src/data"), resolve(ROOT, "src/partials")]);
      server.watcher.on("change", (file) => {
        if (/src[\\/](data|partials)[\\/]/.test(file)) server.ws.send({ type: "full-reload" });
      });
    },
    generateBundle() {
      const { site } = ctx;
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${site.url}/</loc>\n    <lastmod>${today}</lastmod>\n  </url>\n</urlset>\n`
      });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n` });
    }
  };
}
