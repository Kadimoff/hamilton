// Higgsfield hero videosu (istəyə bağlı). Video yalnız build zamanı public/assets/hero.mp4 + hero-poster.jpg
// tapılanda HTML-ə əlavə olunur. Oynamasa, reduced-motion və ya saveData aktivdirsə — canvas qalır.
import { $ } from "./lib/format.js";

export function initHeroVideo({ reduce, ledger }) {
  const video = $("heroVideo");
  if (!video) return;
  const saveData = navigator.connection && navigator.connection.saveData;
  // mobildə hero canlı panelə çevrilir — videonu yükləmirik (trafik)
  const small = window.matchMedia && matchMedia("(max-width:640px)").matches;
  if (reduce || saveData || small) { video.remove(); return; }

  const plane = document.querySelector(".plane-wrap");
  let ready = false, inView = false;
  const fail = () => { video.remove(); if (plane) plane.hidden = false; ledger && ledger.enable(); };

  video.querySelectorAll("source").forEach((s) => { s.src = s.dataset.src; });
  const lastSource = video.querySelector("source:last-of-type");
  lastSource && lastSource.addEventListener("error", fail); // bütün mənbələr uğursuz olanda
  video.addEventListener("error", fail);
  video.addEventListener(
    "canplay",
    () => {
      ready = true;
      video.hidden = false;
      if (plane) plane.hidden = true;
      ledger && ledger.disable();
      if (inView) video.play().catch(fail);
    },
    { once: true }
  );
  video.preload = "metadata";
  video.load();

  // yalnız hero görünəndə oynat
  const stage = $("stage");
  const toggle = () => { if (!ready) return; inView && !document.hidden ? video.play().catch(() => {}) : video.pause(); };
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { inView = es[0].isIntersecting; toggle(); }).observe(stage);
  else inView = true;
  document.addEventListener("visibilitychange", toggle);
}
