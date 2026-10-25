// İstehsal serveri: dist/ statik faylları + POST /api/muraciet.
// nginx arxasında işlədiləndə statik faylları nginx verə bilər, bu proses isə yalnız /api/ üçün qalır (README).
import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { createGzip } from "node:zlib";
import { createMailer } from "./mailer.js";
import { createRateLimiter } from "./rate-limit.js";
import { createContactHandler } from "./contact.js";

try { process.loadEnvFile(); } catch { /* .env yoxdursa mühit dəyişənləri istifadə olunur */ }
const env = process.env;

const DIST = resolve(import.meta.dirname, "..", env.DIST_DIR || "dist");
const PORT = Number(env.PORT || 8787);
const HOST = env.HOST || "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".woff": "font/woff", ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".mp4": "video/mp4", ".webm": "video/webm", ".ico": "image/x-icon"
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".svg", ".xml", ".txt"]);

export const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; " +
    "connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-Frame-Options": "DENY"
};

const mailer = createMailer(env);
const limiter = createRateLimiter({ max: Number(env.RATE_LIMIT_MAX || 5), windowMs: Number(env.RATE_LIMIT_WINDOW_MIN || 10) * 60 * 1000 });
const contact = createContactHandler({ mailer, limiter, trustProxy: env.TRUST_PROXY === "1" });

async function serveStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); return res.end(); }
  let path;
  try { path = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); return res.end(); }
  if (path.endsWith("/")) path += "index.html";
  const file = resolve(DIST, "." + path);
  if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403); return res.end(); }

  let st;
  try { st = await stat(file); } catch { st = null; }
  if (!st || !st.isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS });
    return res.end("Səhifə tapılmadı");
  }
  const ext = extname(file);
  const headers = {
    "Content-Type": TYPES[ext] || "application/octet-stream",
    // Vite adında hash olan fayllar dəyişmir — uzun keş; qalanları hər dəfə yoxlanılır
    "Cache-Control": path.startsWith("/assets/") && /-[\w-]{8,}\.\w+$/.test(path) ? "public, max-age=31536000, immutable" : "no-cache",
    "Last-Modified": st.mtime.toUTCString(),
    ...SECURITY_HEADERS
  };
  if (req.headers["if-modified-since"] && new Date(req.headers["if-modified-since"]) >= new Date(st.mtime.toUTCString())) {
    res.writeHead(304, headers); return res.end();
  }
  const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] || "");
  if (gzip) { headers["Content-Encoding"] = "gzip"; headers.Vary = "Accept-Encoding"; }
  else headers["Content-Length"] = st.size;
  res.writeHead(200, headers);
  if (req.method === "HEAD") return res.end();
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
}

const server = createServer((req, res) => {
  const url = req.url || "/";
  if (url === "/api/muraciet" || url.startsWith("/api/muraciet?")) {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    return contact(req, res).catch((e) => { console.error(e); if (!res.headersSent) res.writeHead(500); res.end(); });
  }
  if (url === "/api/health") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ ok: true, mail: mailer.mode })); }
  serveStatic(req, res).catch((e) => { console.error(e); if (!res.headersSent) res.writeHead(500); res.end(); });
});

if (!existsSync(resolve(DIST, "index.html"))) console.warn(`[server] ${DIST}/index.html tapılmadı — əvvəlcə "npm run build" edin.`);
if (env.NODE_ENV === "production" && mailer.mode !== "smtp") console.warn("[server] DİQQƏT: SMTP_HOST təyin edilməyib, müraciətlər göndərilməyəcək.");
if (mailer.mode === "outbox") console.log(`[server] SMTP yoxdur — məktublar ${mailer.dir} qovluğuna yazılır (yalnız lokal).`);

server.listen(PORT, HOST, () => console.log(`[server] http://${HOST}:${PORT} (mail: ${mailer.mode})`));
