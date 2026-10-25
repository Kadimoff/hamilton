// Mobil yapışan müraciət paneli: hero keçiləndən sonra görünür, əlaqə bölməsində və footer-də gizlənir
export function initMobileCta() {
  const bar = document.getElementById("mCta");
  if (!bar || !("IntersectionObserver" in window)) return;
  const watched = [document.querySelector(".hero"), document.getElementById("elaqe"), document.querySelector("footer")].filter(Boolean);
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
    bar.classList.toggle("show", visible.size === 0);
  });
  watched.forEach((el) => io.observe(el));
}
