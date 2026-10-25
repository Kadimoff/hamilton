import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/sections/header.css";
import "../styles/sections/hero.css";
import "../styles/sections/tape.css";
import "../styles/sections/services.css";
import "../styles/sections/trio.css";
import "../styles/sections/flow.css";
import "../styles/sections/monitor.css";
import "../styles/sections/tools.css";
import "../styles/sections/faq.css";
import "../styles/sections/contact.css";
import "../styles/sections/footer.css";
import "../styles/motion.css";

import site from "../data/site.json";
import tax from "../data/tax.json";
import { $ } from "./lib/format.js";
import { initTaxCalendar } from "./tax-calendar.js";
import { initCalculators } from "./calculators.js";
import { initMonitor } from "./monitor.js";
import { initHeroCards } from "./hero-cards.js";
import { initHeroLedger } from "./hero-ledger.js";
import { initHeroVideo } from "./hero-video.js";
import { initForm } from "./form.js";

const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const vatRate = tax.rates.vat.value;

$("yr").textContent = new Date().getFullYear();

/* ---------- menyu ---------- */
const menuBtn = $("menuBtn"), nav = $("nav");
function closeNav() { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.textContent = "Menyu"; }
menuBtn.addEventListener("click", () => {
  const o = nav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", o); menuBtn.textContent = o ? "Bağla" : "Menyu";
});
nav.addEventListener("click", (e) => { if (e.target.closest("a")) closeNav(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav.classList.contains("open")) { closeNav(); menuBtn.focus(); }
});

/* ---------- kopyala ---------- */
document.querySelectorAll(".copy").forEach((b) =>
  b.addEventListener("click", () => {
    const el = $(b.dataset.copy), txt = el.textContent.trim();
    const sel = () => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Seçildi"; };
    try { navigator.clipboard.writeText(txt).then(() => { b.textContent = "Kopyalandı"; setTimeout(() => { b.textContent = "Kopyala"; }, 1600); }, sel); } catch { sel(); }
  })
);

initTaxCalendar(tax);
initCalculators(tax);
initMonitor({ reduce });
initHeroCards({ reduce, vatRate });
initForm(site);
const ledger = initHeroLedger({ reduce, vatRate });
initHeroVideo({ reduce, ledger });
