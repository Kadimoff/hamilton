// Higgsfield hero videosunu hazırlayır.
//   npm run video -- yol/to/higgsfield.mp4 [poster.jpg]
// Nəticə: public/assets/hero.mp4 (+ hero.webm, hero-poster.jpg). Fayl 4 MB-dan böyükdürsə,
// H.264 (-crf 26 -preset veryfast), 1280px enə sıxılır və WebM versiyası yaradılır. Orijinal assets-src/-də saxlanılır.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "public/assets");
const SRC_DIR = resolve(ROOT, "assets-src");
const LIMIT = 4 * 1024 * 1024;
const [input, poster] = process.argv.slice(2);
if (!input || !existsSync(input)) { console.error("İstifadə: npm run video -- <video.mp4> [poster.jpg]"); process.exit(1); }

const ff = (...args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const mb = (f) => (statSync(f).size / 1048576).toFixed(2) + " MB";
mkdirSync(OUT, { recursive: true });
mkdirSync(SRC_DIR, { recursive: true });
const original = resolve(SRC_DIR, basename(input));
if (resolve(input) !== original) copyFileSync(input, original);

const mp4 = resolve(OUT, "hero.mp4"), webm = resolve(OUT, "hero.webm");
if (statSync(original).size > LIMIT) {
  console.log(`Orijinal ${mb(original)} — sıxılır…`);
  const scale = ["-vf", "scale='min(1280,iw)':-2"];
  ff("-i", original, ...scale, "-c:v", "libx264", "-crf", "26", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4);
  ff("-i", original, ...scale, "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-row-mt", "1", "-an", webm);
  console.log(`hero.mp4: ${mb(mp4)}, hero.webm: ${mb(webm)}`);
} else {
  // kiçik fayl: yalnız səsi çıxarıb faststart edirik
  ff("-i", original, "-c:v", "copy", "-an", "-movflags", "+faststart", mp4);
  console.log(`hero.mp4: ${mb(mp4)} (sıxılma lazım olmadı)`);
}

const posterOut = resolve(OUT, "hero-poster.jpg");
if (poster) ff("-i", poster, "-vf", "scale='min(1280,iw)':-2", "-q:v", "4", posterOut);
else ff("-i", mp4, "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", "-q:v", "4", posterOut);
console.log(`hero-poster.jpg: ${mb(posterOut)}. "npm run build" edin — video avtomatik qoşulacaq.`);
