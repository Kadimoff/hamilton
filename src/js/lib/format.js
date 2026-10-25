// Azərbaycan formatı: minliklər boşluqla, onluq hissə vergüllə ("11 800,00")
export function fmt(n, dec = 2) {
  const neg = n < 0;
  const s = Math.abs(n).toFixed(dec).split(".");
  const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (neg ? "−" : "") + i + (dec ? "," + s[1] : "");
}

export function parseNum(v) {
  const n = parseFloat(String(v).replace(/[\s ]/g, "").replace(",", "."));
  return isFinite(n) ? n : 0;
}

export const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
export const MONTHS_T = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
export const MON_S = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];

export const $ = (id) => document.getElementById(id);
