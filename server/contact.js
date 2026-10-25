// POST /api/muraciet — node:http (req, res) üçün handler. Həm server/index.js, həm Vite dev/preview istifadə edir.
import { validateRequest } from "./validate.js";
import { MailConfigError } from "./mailer.js";

const MAX_BODY = 16 * 1024;

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { fail(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => ok(Buffer.concat(chunks).toString("utf8")));
    req.on("error", fail);
  });
}

export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const real = req.headers["x-real-ip"];
    if (typeof real === "string" && real) return real.trim();
  }
  return req.socket.remoteAddress || "unknown";
}

export function createContactHandler({ mailer, limiter, trustProxy = false, log = console }) {
  return async function handle(req, res) {
    if (req.method !== "POST") return send(res, 405, { ok: false, error: "Yalnız POST qəbul olunur." }, { Allow: "POST" });
    if (!String(req.headers["content-type"] || "").startsWith("application/json"))
      return send(res, 415, { ok: false, error: "Sorğu JSON formatında olmalıdır." });

    const ip = clientIp(req, trustProxy);
    const rl = limiter.hit(ip);
    if (!rl.allowed)
      return send(
        res,
        429,
        { ok: false, error: `Çox sayda müraciət göndərildi. ${Math.ceil(rl.retryAfter / 60)} dəqiqə sonra yenidən cəhd edin.` },
        { "Retry-After": String(rl.retryAfter) }
      );

    let data;
    try {
      data = JSON.parse(await readBody(req));
    } catch (e) {
      return send(res, e.status || 400, { ok: false, error: e.status === 413 ? "Müraciət çox böyükdür." : "Sorğu oxunmadı." });
    }

    const v = validateRequest(data);
    if (!v.ok) return send(res, 400, { ok: false, field: v.field, error: v.error });
    if (v.spam) {
      log.warn?.(`[muraciet] honeypot doldurulub, ip=${ip}`);
      return send(res, 200, { ok: true }); // bota xəta göstərmirik
    }

    try {
      await mailer.send(v.value, { ip });
      return send(res, 200, { ok: true });
    } catch (e) {
      log.error?.(`[muraciet] göndərilmədi: ${e.message}`);
      const cfg = e instanceof MailConfigError;
      return send(res, cfg ? 503 : 502, { ok: false, error: "Müraciəti hazırda göndərmək mümkün olmadı. Bir az sonra yenidən cəhd edin." });
    }
  };
}
