// Server monitorinq paneli və hero-dakı "1C serveri" kartı — nümunə məlumatla
import { $, fmt } from "./lib/format.js";

const LOGS = [
  ["ok", "Ehtiyat nüsxə tamamlandı · 1C bazası"],
  ["bl", "RDP: təkrarlanan uğursuz giriş cəhdi bloklandı"],
  ["in", "VPN: mühasib-02 qoşuldu"],
  ["ok", "1C serveri: yeniləmə yoxlanıldı"],
  ["in", "Disk: 62% dolu · xəbərdarlıq həddi 85%"],
  ["bl", "Firewall: xaricdən 3389 portuna sorğu rədd edildi"],
  ["ok", "SQL bazası: indekslər yeniləndi"],
  ["in", "VPN: direktor qoşuldu"]
];
const LV = { ok: "OK", bl: "BLOK", in: "INFO" };

export function initMonitor({ reduce }) {
  let uh = "";
  for (let u = 0; u < 30; u++) uh += "<i" + (u === 11 ? ' class="p" title="Planlı texniki iş"' : "") + ' style="animation-delay:' + u * 0.02 + 's"></i>';
  $("uptime").innerHTML = uh;

  const logEl = $("log");
  let li = 0;
  const hms = (d) => [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, "0")).join(":");
  function pushLog(t) {
    const l = LOGS[li++ % LOGS.length], el = document.createElement("li");
    el.innerHTML = "<time>" + hms(t) + '</time><span class="lv ' + l[0] + '">' + LV[l[0]] + "</span><span>" + l[1] + "</span>";
    logEl.insertBefore(el, logEl.firstChild);
    while (logEl.children.length > 6) logEl.removeChild(logEl.lastChild);
  }
  const nowMs = Date.now();
  for (let k = 5; k >= 0; k--) pushLog(new Date(nowMs - k * 47000));

  const sparkData = [];
  for (let s = 0; s < 24; s++) sparkData.push(30 + Math.sin(s / 2) * 8 + Math.random() * 8);
  function drawSpark() {
    const w = 200, h = 46, n = sparkData.length;
    const pts = sparkData.map((v, i) => [(i / (n - 1)) * w, h - 3 - (v / 80) * (h - 6)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    $("spL").setAttribute("d", d); $("spA").setAttribute("d", d + " L200 46 L0 46 Z");
    const cpu = Math.round(sparkData[n - 1]); $("cpuTxt").textContent = cpu + "%";
    $("gCpu").setAttribute("stroke-dashoffset", (251.3 * (1 - cpu / 100)).toFixed(1)); $("gCpuT").textContent = cpu + "%";
  }
  drawSpark();

  if (reduce) return;
  let blk = 1284;
  setInterval(() => {
    sparkData.shift(); sparkData.push(Math.max(8, Math.min(72, sparkData[sparkData.length - 1] + (Math.random() - 0.5) * 14))); drawSpark();
    const ram = 52 + Math.round(Math.random() * 10); $("gRam").setAttribute("stroke-dashoffset", (251.3 * (1 - ram / 100)).toFixed(1)); $("gRamT").textContent = ram + "%";
  }, 1800);
  setInterval(() => pushLog(new Date()), 2600);
  setInterval(() => { blk += 1 + ((Math.random() * 3) | 0); $("blk").textContent = fmt(blk, 0); }, 1500);
}
