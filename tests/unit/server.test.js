import { describe, it, expect, vi } from "vitest";
import { Readable } from "node:stream";
import { validateRequest } from "../../server/validate.js";
import { createRateLimiter } from "../../server/rate-limit.js";
import { createContactHandler } from "../../server/contact.js";
import { buildMessage } from "../../server/mailer.js";

const good = { service: "Mühasibatlıq", name: "Aysel Məmmədova", company: "", phone: "+994 50 123 45 67", email: "", message: "Salam", website: "" };

describe("validateRequest", () => {
  it("düzgün müraciəti qəbul edir", () => {
    const r = validateRequest(good);
    expect(r.ok).toBe(true);
    expect(r.value.name).toBe("Aysel Məmmədova");
  });
  it("ad məcburidir", () => {
    expect(validateRequest({ ...good, name: "   " })).toMatchObject({ ok: false, field: "name" });
  });
  it("telefon ən azı 9 rəqəm", () => {
    expect(validateRequest({ ...good, phone: "12-34-56" })).toMatchObject({ ok: false, field: "phone" });
    expect(validateRequest({ ...good, phone: "050 123 45 67" }).ok).toBe(true);
  });
  it("mətn maksimum 2000 simvol", () => {
    expect(validateRequest({ ...good, message: "a".repeat(2000) }).ok).toBe(true);
    expect(validateRequest({ ...good, message: "a".repeat(2001) })).toMatchObject({ ok: false, field: "message" });
  });
  it("yanlış e-poçtu rədd edir", () => {
    expect(validateRequest({ ...good, email: "yox" })).toMatchObject({ ok: false, field: "email" });
  });
  it("honeypot doldurulubsa spam sayılır", () => {
    expect(validateRequest({ ...good, website: "http://spam" })).toMatchObject({ ok: true, spam: true });
  });
  it("başlıq inyeksiyası üçün sətir keçidlərini təmizləyir", () => {
    const r = validateRequest({ ...good, name: "Ali\r\nBcc: x@y.z" });
    expect(r.value.name).not.toMatch(/[\r\n]/);
  });
  it("naməlum xidmət dəyəri qəbul edilmir", () => {
    expect(validateRequest({ ...good, service: "<script>" }).value.service).toBe("Göstərilməyib");
  });
});

describe("rate limit", () => {
  it("10 dəqiqədə 5 müraciət, sonra blok, pəncərə keçəndə yenidən icazə", () => {
    let t = 0;
    const rl = createRateLimiter({ max: 5, windowMs: 600000, now: () => t });
    for (let i = 0; i < 5; i++) expect(rl.hit("1.1.1.1").allowed).toBe(true);
    const blocked = rl.hit("1.1.1.1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBe(600);
    expect(rl.hit("2.2.2.2").allowed).toBe(true);
    t = 600001;
    expect(rl.hit("1.1.1.1").allowed).toBe(true);
  });
});

function call(handler, body, { method = "POST", type = "application/json", ip = "9.9.9.9" } = {}) {
  const req = Readable.from([Buffer.from(typeof body === "string" ? body : JSON.stringify(body))]);
  Object.assign(req, { method, headers: { "content-type": type }, socket: { remoteAddress: ip } });
  return new Promise((done) => {
    const res = {
      status: 0, headers: {},
      writeHead(s, h) { this.status = s; Object.assign(this.headers, h); },
      end(b) { done({ status: this.status, headers: this.headers, body: b ? JSON.parse(b) : null }); }
    };
    handler(req, res);
  });
}

describe("POST /api/muraciet", () => {
  const make = (mailer, max = 5) =>
    createContactHandler({ mailer, limiter: createRateLimiter({ max }), log: { warn() {}, error() {} } });

  it("uğurlu göndəriş", async () => {
    const send = vi.fn().mockResolvedValue({});
    const r = await call(make({ send }), good);
    expect(r).toMatchObject({ status: 200, body: { ok: true } });
    expect(send).toHaveBeenCalledOnce();
  });
  it("yoxlama xətası 400 və sahə adı qaytarır", async () => {
    const r = await call(make({ send: vi.fn() }), { ...good, phone: "1" });
    expect(r).toMatchObject({ status: 400, body: { ok: false, field: "phone" } });
  });
  it("honeypot: 200 qaytarır, amma məktub göndərmir", async () => {
    const send = vi.fn();
    const r = await call(make({ send }), { ...good, website: "x" });
    expect(r.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });
  it("limit aşılanda 429 və Retry-After", async () => {
    const h = make({ send: vi.fn().mockResolvedValue({}) }, 2);
    await call(h, good); await call(h, good);
    const r = await call(h, good);
    expect(r.status).toBe(429);
    expect(Number(r.headers["Retry-After"])).toBeGreaterThan(0);
  });
  it("SMTP xətasında 502 və istifadəçiyə aydın mesaj", async () => {
    const r = await call(make({ send: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) }), good);
    expect(r.status).toBe(502);
    expect(r.body.error).toMatch(/göndərmək mümkün olmadı/);
  });
  it("JSON olmayan sorğu 415, GET 405", async () => {
    expect((await call(make({ send: vi.fn() }), "a=b", { type: "application/x-www-form-urlencoded" })).status).toBe(415);
    expect((await call(make({ send: vi.fn() }), "", { method: "GET" })).status).toBe(405);
  });
});

describe("məktub", () => {
  it("HTML-i escape edir və cavab ünvanını qoyur", () => {
    const m = buildMessage({ ...good, email: "a@b.az", message: "<b>x</b>" }, { from: "f@x.az", to: "t@x.az" });
    expect(m.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(m.replyTo).toEqual({ name: good.name, address: "a@b.az" });
    expect(m.subject).toBe("Yeni müraciət: Mühasibatlıq — Aysel Məmmədova");
  });
});
