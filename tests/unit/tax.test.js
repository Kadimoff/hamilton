import { describe, it, expect } from "vitest";
import tax from "../../src/data/tax.json";
import { calcVat, calcProfit, upcoming, deadlinesForMonth, shiftToWorkday, daysLeft } from "../../src/js/lib/tax.js";
import { fmt, parseNum } from "../../src/js/lib/format.js";

const VAT = tax.rates.vat.value;
const PROFIT = tax.rates.profit.value;
const d = (s) => { const [y, m, day] = s.split("-").map(Number); return new Date(y, m - 1, day); };
const ymd = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
const next = (today, n = 4, cfg = tax) => upcoming(d(today), n, cfg).map((x) => `${ymd(x.date)} ${x.id}`);

describe("tax.json", () => {
  it("hər dərəcə və son tarixin mənbəyi və yoxlanma tarixi var", () => {
    for (const r of Object.values(tax.rates)) {
      expect(r.source).toMatch(/^https:\/\//);
      expect(r.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const x of tax.deadlines) {
      expect(x.source).toMatch(/^https:\/\//);
      expect(x.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("ƏDV kalkulyatoru", () => {
  it("daxil deyil: məbləğin üstünə gəlir", () => {
    expect(calcVat(10000, "ex", VAT)).toEqual({ net: 10000, vat: 1800, gross: 11800 });
  });
  it("daxildir: içindən çıxarılır", () => {
    expect(calcVat(11800, "in", VAT)).toEqual({ net: 10000, vat: 1800, gross: 11800 });
  });
  it("qəpiklərlə düzgün yuvarlaqlaşdırır və cəmi tutur", () => {
    const r = calcVat(99.99, "in", VAT);
    expect(r.net).toBe(84.74);
    expect(r.vat).toBe(15.25);
    expect(+(r.net + r.vat).toFixed(2)).toBe(99.99);
    expect(calcVat(0.05, "ex", VAT)).toEqual({ net: 0.05, vat: 0.01, gross: 0.06 });
  });
  it("mənfi məbləğ sıfır sayılır", () => {
    expect(calcVat(-500, "ex", VAT)).toEqual({ net: 0, vat: 0, gross: 0 });
  });
});

describe("Mənfəət vergisi", () => {
  it("gəlir − xərc üzərindən hesablanır", () => {
    expect(calcProfit(250000, 180000, PROFIT)).toEqual({ profit: 70000, tax: 14000, net: 56000 });
  });
  it("zərər olduqda vergi sıfırdır", () => {
    expect(calcProfit(100000, 150000, PROFIT)).toEqual({ profit: 0, tax: 0, net: 0 });
  });
  it("qəpikləri yuvarlaqlaşdırır", () => {
    expect(calcProfit(1000.03, 0, PROFIT)).toEqual({ profit: 1000.03, tax: 200.01, net: 800.02 });
  });
});

describe("Son tarixlər", () => {
  it("ay sonu: növbəti ayın 20-si", () => {
    expect(next("2026-10-31", 1)).toEqual(["2026-11-20 vat"]);
  });
  it("son tarix günü özü 'bu gün' sayılır (0 gün)", () => {
    const [x] = upcoming(d("2026-11-20"), 1, tax);
    expect(ymd(x.date)).toBe("2026-11-20");
    expect(daysLeft(x.date, d("2026-11-20"))).toBe(0);
  });
  it("rüb: ödəmə mənbəyindən bəyannamə yalnız yanvar/aprel/iyul/oktyabr aylarında", () => {
    expect(next("2026-09-25", 2)).toEqual(["2026-10-20 vat", "2026-10-20 withholding"]);
    expect(next("2026-10-21", 3)).toEqual(["2026-11-20 vat", "2026-12-21 vat", "2027-01-20 vat"]);
  });
  it("31 mart: mənfəət vergisi illik bəyannaməsi", () => {
    // 20.03.2027 şənbədir → ƏDV 22.03-ə keçir; 23-dən sonra növbəti — 31 mart
    expect(next("2027-03-21", 2)).toEqual(["2027-03-22 vat", "2027-03-31 profit-annual"]);
    expect(next("2027-03-23", 3)).toEqual(["2027-03-31 profit-annual", "2027-04-20 vat", "2027-04-20 withholding"]);
  });
  it("il keçidi: dekabrdan yanvara", () => {
    expect(next("2026-12-22", 3)).toEqual(["2027-01-20 vat", "2027-01-20 withholding", "2027-02-22 vat"]);
  });
  it("şənbə/bazar növbəti iş gününə keçir", () => {
    // 20.12.2026 bazar → 21.12 bazar ertəsi; 20.02.2027 şənbə → 22.02
    expect(ymd(shiftToWorkday(d("2026-12-20"), tax.nonWorkingDays))).toBe("2026-12-21");
    expect(ymd(shiftToWorkday(d("2027-02-20"), tax.nonWorkingDays))).toBe("2027-02-22");
  });
  it("bayram siyahısındakı gün də keçirilir", () => {
    const cfg = { ...tax, nonWorkingDays: { shiftWeekends: true, holidays: ["2026-11-20"] } };
    expect(next("2026-11-01", 1, cfg)).toEqual(["2026-11-23 vat"]); // 20 cümə bayram → 21-22 həftəsonu → 23
  });
  it("ay sərhədini keçən sürüşmə təqvimdə növbəti ayda görünür", () => {
    // 31.03.2029 şənbədir → 02.04.2029
    const april = deadlinesForMonth(2029, 3, tax).map((x) => `${ymd(x.date)} ${x.id}`);
    expect(april).toContain("2029-04-02 profit-annual");
    expect(deadlinesForMonth(2029, 2, tax).map((x) => x.id)).not.toContain("profit-annual");
  });
});

describe("Format", () => {
  it("Azərbaycan formatı", () => {
    expect(fmt(11800)).toBe("11 800,00");
    expect(fmt(1234567.5, 0)).toBe("1 234 568");
    expect(fmt(-5)).toBe("−5,00");
  });
  it("istifadəçi daxiletməsini oxuyur", () => {
    expect(parseNum("10 000,50")).toBe(10000.5);
    expect(parseNum("abc")).toBe(0);
  });
});
