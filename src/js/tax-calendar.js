// Vergi təqvimi, son tarixlər siyahısı və hero-dakı "Növbəti son tarix" kartı
import { $, MONTHS, MONTHS_T, MON_S } from "./lib/format.js";
import { upcoming, deadlinesForMonth, daysLeft } from "./lib/tax.js";

export function initTaxCalendar(tax, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const up = upcoming(today, 4, tax);
  const first = up[0];
  if (!first) return;
  const dl0 = daysLeft(first.date, today);
  $("dDays").innerHTML = dl0 === 0 ? "Bu gün" : dl0 + "<small>gün qalıb</small>";
  $("dName").textContent = first.title + " · " + first.date.getDate() + " " + MONTHS[first.date.getMonth()];
  $("dBar").style.width = Math.max(6, 100 - (dl0 / 31) * 100).toFixed(0) + "%";

  const list = $("dlList");
  list.replaceChildren(
    ...up.map((x) => {
      const n = daysLeft(x.date, today);
      const li = document.createElement("li");
      li.innerHTML = `<span class="dt"><b></b><span></span></span><span class="nm"><small></small></span><span class="left"></span>`;
      li.querySelector(".dt b").textContent = x.date.getDate();
      li.querySelector(".dt span").textContent = MON_S[x.date.getMonth()];
      li.querySelector(".nm").prepend(x.title);
      li.querySelector(".nm small").textContent = x.note;
      li.querySelector(".left").textContent = n === 0 ? "bu gün" : n + " gün";
      return li;
    })
  );

  let calY = first.date.getFullYear(), calM = first.date.getMonth();
  const grid = $("calGrid");
  function renderCal() {
    $("calTitle").textContent = MONTHS_T[calM] + " " + calY;
    const frag = document.createDocumentFragment();
    const span = (cls, text) => { const s = document.createElement("span"); if (cls) s.className = cls; if (text != null) s.textContent = text; frag.append(s); return s; };
    ["B.e", "Ç.a", "Çər", "C.a", "Cüm", "Şən", "Baz"].forEach((w) => span("wd", w));
    const startDow = (new Date(calY, calM, 1).getDay() + 6) % 7, days = new Date(calY, calM + 1, 0).getDate(), map = {};
    for (const x of deadlinesForMonth(calY, calM, tax)) {
      const k = x.date.getDate();
      map[k] = map[k] ? { t: map[k].t + " · " + x.title, g: map[k].g || x.highlight } : { t: x.title, g: x.highlight };
    }
    for (let i = 0; i < startDow; i++) span("", null);
    for (let d = 1; d <= days; d++) {
      const dt = new Date(calY, calM, d);
      let cls = "dd";
      if (+dt === +today) cls += " today";
      if (dt < today) cls += " past";
      if (map[d]) cls += " dl" + (map[d].g ? " g" : "");
      const s = span(cls, d);
      if (map[d]) s.title = map[d].t;
    }
    grid.replaceChildren(frag);
  }
  renderCal();
  $("calPrev").addEventListener("click", () => { calM--; if (calM < 0) { calM = 11; calY--; } renderCal(); });
  $("calNext").addEventListener("click", () => { calM++; if (calM > 11) { calM = 0; calY++; } renderCal(); });
}
