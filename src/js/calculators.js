// ƏDV və mənfəət vergisi kalkulyatoru
import { $, fmt, parseNum } from "./lib/format.js";
import { calcVat, calcProfit } from "./lib/tax.js";

export function initCalculators(tax) {
  const vatRate = tax.rates.vat.value, profitRate = tax.rates.profit.value;
  const tabV = $("tabVat"), tabP = $("tabPro");
  function selTab(v) {
    tabV.setAttribute("aria-selected", v); tabP.setAttribute("aria-selected", !v);
    tabV.tabIndex = v ? 0 : -1; tabP.tabIndex = v ? -1 : 0;
    $("calcVat").hidden = !v; $("calcPro").hidden = v;
  }
  tabV.addEventListener("click", () => selTab(true));
  tabP.addEventListener("click", () => selTab(false));
  [tabV, tabP].forEach((t) =>
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const toVat = t === tabP; selTab(toVat); (toVat ? tabV : tabP).focus(); }
    })
  );

  function onVat() {
    const { net, vat, gross } = calcVat(parseNum($("vAmt").value), $("vMode").value, vatRate);
    $("rNet").textContent = fmt(net); $("rVat").textContent = fmt(vat); $("rGross").textContent = fmt(gross);
    const pa = gross ? (net / gross) * 100 : 100 / (1 + vatRate);
    $("sA").style.width = pa + "%"; $("sB").style.width = 100 - pa + "%";
  }
  function onProfit() {
    const { profit, tax: t, net } = calcProfit(parseNum($("pInc").value), parseNum($("pExp").value), profitRate);
    $("pPro").textContent = fmt(profit); $("pTax").textContent = fmt(t); $("pNet").textContent = fmt(net);
    const keep = (1 - profitRate) * 100;
    $("pA").style.width = profit ? keep + "%" : "100%"; $("pB").style.width = profit ? 100 - keep + "%" : "0%";
  }
  ["vAmt", "vMode"].forEach((id) => { $(id).addEventListener("input", onVat); $(id).addEventListener("change", onVat); });
  ["pInc", "pExp"].forEach((id) => $(id).addEventListener("input", onProfit));
  ["vAmt", "pInc", "pExp"].forEach((id) =>
    $(id).addEventListener("blur", function () { const n = parseNum(this.value); this.value = fmt(n, n % 1 ? 2 : 0); })
  );
  onVat(); onProfit();
}
