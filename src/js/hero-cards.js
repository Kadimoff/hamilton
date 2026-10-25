// Hero-da süzülən kartlar: ƏDV donut-u, bildiriş (toast) və parallax
import { $, fmt } from "./lib/format.js";

const VAT_SAMPLES = [10000, 2450, 38600, 7125];
const CIRC = 2 * Math.PI * 32;
const DOC_ICO = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2h6l3 3v9H4z"/><path d="M10 2v3h3"/></svg>';
const OK_ICO = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3 3 7-7"/></svg>';
const TOASTS = [["Məlumatlar 1C ilə tutuşdurulur…", 0], ["Bəyannamə e-taxes.gov.az-a göndərildi", 1], ["Bank çıxarışı uçota alındı", 1], ["ƏDV bəyannaməsi hazırlanır…", 0]];

export function initHeroCards({ reduce, vatRate }) {
  let vi = 0, ti = 0;
  function showVat() {
    const n = VAT_SAMPLES[vi++ % VAT_SAMPLES.length], v = Math.round(n * vatRate * 100) / 100, g = n + v, frac = v / g;
    $("vN").textContent = fmt(n, n % 1 ? 2 : 0); $("vV").textContent = fmt(v, v % 1 ? 2 : 0); $("vG").textContent = fmt(g, g % 1 ? 2 : 0);
    const arc = $("vatArc");
    arc.setAttribute("stroke-dasharray", (CIRC * frac).toFixed(1) + " " + CIRC.toFixed(1));
    arc.setAttribute("stroke-dashoffset", (-(CIRC * (1 - frac))).toFixed(1));
  }
  function nextToast() {
    const t = TOASTS[ti++ % TOASTS.length], txt = $("toastTxt"), ico = $("toastIco");
    txt.textContent = t[0]; ico.classList.toggle("done", !!t[1]); ico.innerHTML = t[1] ? OK_ICO : DOC_ICO;
    if (txt.animate) txt.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 400, easing: "ease-out" });
  }
  showVat();
  if (!reduce) {
    setInterval(showVat, 4200);
    setInterval(nextToast, 3200);
  }

  const stage = $("stage");
  if (!reduce && matchMedia("(pointer:fine)").matches) {
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      stage.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      stage.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    stage.addEventListener("pointerleave", () => { stage.style.setProperty("--px", 0); stage.style.setProperty("--py", 0); });
  }
}
