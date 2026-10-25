// HERO: perspektivdə ikili yazılış vərəqi (canvas) + "İkili yazılış" balans kartı
import { fmt, $ } from "./lib/format.js";

export function initHeroLedger({ reduce, vatRate }) {
  const cv = $("ledger");
  const stage = $("stage");
  if (!cv || !cv.getContext) return null;
  const ctx = cv.getContext("2d");
  const css = getComputedStyle(document.documentElement);
  const tok = (n) => css.getPropertyValue(n).trim();
  const COL = { ink: tok("--ink"), mute: tok("--mute"), line: tok("--line"), accent: tok("--accent"), gold: tok("--gold"), ok: tok("--ok"), surface: tok("--surface") };
  const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  const BODY = '"Plus Jakarta Sans", system-ui, sans-serif';
  let W = 0, H = 0, dpr = 1, offset = 0, rows = [], x0 = 0, cols = [];
  const rowH = 30;
  let D = 0, K = 0, shownD = 0, shownK = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const cents = (v) => Math.round(v * 100);

  // Azərbaycan hesablar planı üzrə real ikili yazılış nümunələri
  function entry() {
    const r = Math.random();
    let N, V, out;
    if (r < 0.3) {
      N = cents(rnd(800, 24000)); V = Math.round(N * vatRate);
      out = [{ op: "Satış", acc: "211", dt: N + V }, { op: "", acc: "601", kt: N }, { op: "", acc: "521", kt: V, vat: 1 }];
    } else if (r < 0.52) {
      N = cents(rnd(500, 16000)); V = Math.round(N * vatRate);
      out = [{ op: "Material alışı", acc: "201", dt: N }, { op: "", acc: "241", dt: V, vat: 1 }, { op: "", acc: "531", kt: N + V }];
    } else if (r < 0.72) {
      N = cents(rnd(1000, 30000)); out = [{ op: "Bankdan daxilolma", acc: "223", dt: N }, { op: "", acc: "211", kt: N }];
    } else if (r < 0.88) {
      N = cents(rnd(150, 6000)); out = [{ op: "İnzibati xərc", acc: "721", dt: N }, { op: "", acc: "531", kt: N }];
    } else {
      N = cents(rnd(400, 9000)); out = [{ op: "Vergi ödənişi", acc: "521", dt: N }, { op: "", acc: "223", kt: N }];
    }
    out.forEach((x, i) => { x.flash = 0; x.done = false; x.last = i === out.length - 1; });
    return out;
  }
  function fill() { while (rows.length < Math.ceil(H / rowH) + 6) rows = rows.concat(entry()); }
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.offsetWidth; H = cv.offsetHeight; if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const widths = [150, 64, 120, 120], total = widths.reduce((a, b) => a + b, 0);
    x0 = Math.max(24, (W - total) / 2);
    let x = x0; cols = widths.map((w) => { const c = { x, w }; x += w; return c; });
    fill();
  }
  const fmtC = (c) => fmt(c / 100);
  function draw(dt) {
    if (!W) return;
    offset += dt * 22;
    while (offset >= rowH) { offset -= rowH; rows.shift(); fill(); }
    ctx.clearRect(0, 0, W, H);
    const top = 70, endX = cols[3].x + cols[3].w, balY = Math.round(H * 0.56);

    ctx.globalAlpha = 1; ctx.fillStyle = COL.surface; ctx.strokeStyle = COL.line; ctx.lineWidth = 1;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0 - 18, 20, endX - x0 + 36, H - 20, 18); else ctx.rect(x0 - 18, 20, endX - x0 + 36, H - 20);
    ctx.fill(); ctx.stroke();
    cols.slice(1).forEach((c) => { ctx.beginPath(); ctx.moveTo(c.x + 0.5, top - 30); ctx.lineTo(c.x + 0.5, H); ctx.stroke(); });

    ctx.textBaseline = "middle";
    for (let i = 0; i < rows.length; i++) {
      const y = top + i * rowH - offset + rowH / 2; if (y < top + 4 || y > H + rowH) continue;
      const r = rows[i], fade = Math.min(1, (y - top) / 60) * Math.min(1, (H - y) / 80); if (fade <= 0) continue;
      if (!r.done && y <= balY) { r.done = true; r.flash = 1; if (r.dt) D += r.dt; if (r.kt) K += r.kt; }
      if (r.flash > 0) {
        ctx.globalAlpha = 0.14 * r.flash * fade; ctx.fillStyle = r.vat ? COL.gold : COL.accent;
        ctx.fillRect(x0 - 10, y - rowH / 2 + 2, endX - x0 + 20, rowH - 4);
      }
      if (r.last) { ctx.globalAlpha = 0.9 * fade; ctx.strokeStyle = COL.line; ctx.beginPath(); ctx.moveTo(x0 - 10, y + rowH / 2 + 0.5); ctx.lineTo(endX + 10, y + rowH / 2 + 0.5); ctx.stroke(); }
      ctx.globalAlpha = 0.88 * fade;
      ctx.font = "600 12px " + BODY; ctx.fillStyle = COL.ink; ctx.textAlign = "left";
      if (r.op) ctx.fillText(r.op, cols[0].x, y);
      ctx.font = "500 12px " + MONO; ctx.fillStyle = r.vat ? COL.gold : COL.mute;
      ctx.fillText((r.dt ? "Dt " : "Kt ") + r.acc, cols[1].x + 8, y);
      ctx.textAlign = "right"; ctx.fillStyle = r.flash > 0.3 ? (r.vat ? COL.gold : COL.accent) : COL.ink;
      if (r.dt) ctx.fillText(fmtC(r.dt), cols[2].x + cols[2].w - 10, y);
      if (r.kt) ctx.fillText(fmtC(r.kt), cols[3].x + cols[3].w - 10, y);
      if (r.done && r.last) { ctx.fillStyle = COL.ok; ctx.textAlign = "left"; ctx.font = "700 13px " + BODY; ctx.fillText("✓", endX + 16, y); }
      if (r.flash > 0) r.flash = Math.max(0, r.flash - dt * 1.2);
    }
    ctx.globalAlpha = 1; ctx.fillStyle = COL.surface; ctx.fillRect(x0 - 17, 21, endX - x0 + 34, top - 21);
    ctx.font = "600 11px " + BODY; ctx.fillStyle = COL.mute; ctx.textAlign = "left";
    ctx.fillText("ƏMƏLİYYAT", cols[0].x, top - 22); ctx.fillText("HESAB", cols[1].x + 8, top - 22);
    ctx.textAlign = "right"; ctx.fillText("DEBET", cols[2].x + cols[2].w - 10, top - 22); ctx.fillText("KREDİT", cols[3].x + cols[3].w - 10, top - 22);
    ctx.strokeStyle = COL.ink; ctx.beginPath(); ctx.moveTo(x0 - 10, top - 6.5); ctx.lineTo(endX + 10, top - 6.5); ctx.stroke();
    ctx.strokeStyle = COL.gold; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x0 - 30, balY); ctx.lineTo(endX + 30, balY); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    ctx.fillStyle = COL.gold; ctx.font = "700 11px " + BODY; ctx.textAlign = "left"; ctx.fillText("BALANS XƏTTİ", x0 - 28, balY - 12);

    shownD += (D - shownD) * Math.min(1, dt * 6); shownK += (K - shownK) * Math.min(1, dt * 6);
  }

  const bD = $("bD"), bK = $("bK"), box = $("bDiff"), bLbl = $("bLbl"), bVal = $("bVal");
  let lastUI = 0;
  function updateUI(t) {
    if (t - lastUI < 120) return; lastUI = t;
    bD.textContent = fmtC(Math.round(shownD)) + " ₼"; bK.textContent = fmtC(Math.round(shownK)) + " ₼";
    const diff = D - K;
    if (diff === 0) { box.className = "diff ok"; bLbl.textContent = "Balans tutur ✓"; bVal.textContent = "0,00 ₼"; }
    else { box.className = "diff open"; bLbl.textContent = "Yazılış davam edir"; bVal.textContent = fmtC(Math.abs(diff)) + " ₼"; }
  }

  let last = 0, running = false, raf = 0, visible = false, enabled = true;
  function loop(t) { if (!running) return; const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t; draw(dt); updateUI(t); raf = requestAnimationFrame(loop); }
  function start() { if (running || reduce || !enabled || !visible || document.hidden) return; running = true; last = 0; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  layout();
  // ilk kadr: vərəq artıq dolu və balansda görünsün
  for (let z = 0; z < 40; z++) draw(1 / 20);
  for (let g = 0; g < 200 && D !== K; g++) draw(1 / 20);
  shownD = D; shownK = K; updateUI(1e9); lastUI = 0;

  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layout(); draw(0); }, 120); });
  // ekrandan çıxanda və tab gizli olanda dayanır
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(stage);
  else { visible = true; start(); }
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => draw(0));

  return {
    // video hero oynayanda canvas tamamilə söndürülür
    disable() { enabled = false; stop(); },
    enable() { enabled = true; start(); }
  };
}
