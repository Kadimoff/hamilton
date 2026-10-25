// "Yüklənir…" ekranı: şriftlər hazır olanda (ən çox MAX_WAIT ms) gizlənir ki, səhifə qırıq görünməsin
const MAX_WAIT = 2500;

export function hideLoaderWhenReady() {
  const el = document.getElementById("loader");
  if (!el) return;
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const timeout = new Promise((r) => setTimeout(r, MAX_WAIT));
  Promise.race([fonts, timeout]).then(() =>
    // bir kadr gözlə ki, JS-in doldurduğu rəqəmlər də ekrana düşsün
    requestAnimationFrame(() => {
      el.classList.add("done");
      el.setAttribute("aria-hidden", "true");
      setTimeout(() => el.remove(), 500);
    })
  );
}
