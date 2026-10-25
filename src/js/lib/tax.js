// Vergi hesablamaları və son tarixlər. DOM-dan asılı deyil, unit testlər bunu yoxlayır.
// Dərəcələr və qaydalar src/data/tax.json-dan ötürülür.

const r2 = (n) => Math.round(n * 100) / 100;

/** mode: "ex" — ƏDV məbləğə daxil deyil (üstünə gəlir), "in" — daxildir (içindən çıxarılır) */
export function calcVat(amount, mode, rate) {
  const a = Math.max(0, amount);
  if (mode === "in") {
    const net = r2(a / (1 + rate));
    return { net, vat: r2(a - net), gross: a };
  }
  const vat = r2(a * rate);
  return { net: a, vat, gross: r2(a + vat) };
}

export function calcProfit(income, expenses, rate) {
  const profit = Math.max(0, Math.max(0, income) - Math.max(0, expenses));
  const tax = r2(profit * rate);
  return { profit, tax, net: r2(profit - tax) };
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function isNonWorking(d, cal = {}) {
  const dow = d.getDay();
  if (cal.shiftWeekends !== false && (dow === 0 || dow === 6)) return true;
  return (cal.holidays || []).includes(iso(d));
}

/** Son gün qeyri-iş gününə düşərsə, növbəti iş günü tətbiq olunur */
export function shiftToWorkday(d, cal = {}) {
  const out = new Date(d);
  for (let i = 0; i < 14 && isNonWorking(out, cal); i++) out.setDate(out.getDate() + 1);
  return out;
}

// Gün ayın uzunluğundan böyükdürsə, ayın son gününə endirilir (məs. 31 → 30 aprel)
function dateIn(y, m, day) {
  return new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));
}

/** Ayın (m: 0–11) nominal son tarixləri — sürüşdürmədən əvvəl */
export function nominalDeadlines(y, m, deadlines) {
  const out = [];
  for (const d of deadlines) {
    const r = d.rule;
    const hit =
      r.type === "monthly" ||
      (r.type === "quarterly" && m % 3 === 0) || // rübdən sonrakı ay: yanvar, aprel, iyul, oktyabr
      (r.type === "yearly" && m === r.month - 1);
    if (hit) out.push({ ...d, nominal: dateIn(y, m, r.day) });
  }
  return out;
}

function resolved(y, m, tax) {
  return nominalDeadlines(y, m, tax.deadlines).map((x) => ({ ...x, date: shiftToWorkday(x.nominal, tax.nonWorkingDays) }));
}

/** Təqvimdə göstəriləcək tarixlər: sürüşmədən sonra bu aya düşənlər (əvvəlki aydan keçənlər də daxil) */
export function deadlinesForMonth(y, m, tax) {
  return [...resolved(m === 0 ? y - 1 : y, (m + 11) % 12, tax), ...resolved(y, m, tax)].filter(
    (x) => x.date.getFullYear() === y && x.date.getMonth() === m
  );
}

/** today-dən (daxil olmaqla) sonrakı n son tarix, tarixə görə sıralanmış */
export function upcoming(today, n, tax) {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const res = [];
  for (let i = -1; i < 15; i++) {
    const dt = new Date(t0.getFullYear(), t0.getMonth() + i, 1);
    for (const x of resolved(dt.getFullYear(), dt.getMonth(), tax)) if (x.date >= t0) res.push(x);
  }
  return res.sort((a, b) => a.date - b.date || a.nominal - b.nominal).slice(0, n);
}

export function daysLeft(date, today) {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((date - t0) / 86400000);
}
