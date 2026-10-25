// Müraciət formasının server tərəfində yoxlanması
import services from "../src/data/services.json" with { type: "json" };

export const LIMITS = { name: 120, company: 160, phone: 32, email: 160, message: 2000 };
const SERVICES = new Set(services.map((s) => s.value));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
// idarəedici simvolları təmizlə (sətir keçidi yalnız mətndə qalır)
const clean = (v, keepNewlines = false) =>
  str(v).replace(keepNewlines ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, keepNewlines ? "" : " ").trim();

/**
 * @returns {{ ok: true, spam?: true, value: object } | { ok: false, field: string, error: string }}
 */
export function validateRequest(input) {
  const body = input && typeof input === "object" ? input : {};
  if (clean(body.website)) return { ok: true, spam: true, value: {} }; // honeypot doldurulub

  const value = {
    service: clean(body.service),
    name: clean(body.name),
    company: clean(body.company),
    phone: clean(body.phone),
    email: clean(body.email),
    message: clean(body.message, true).replace(/\r\n?/g, "\n")
  };
  const fail = (field, error) => ({ ok: false, field, error });

  if (!value.name) return fail("name", "Adınızı yazın.");
  if (value.name.length > LIMITS.name) return fail("name", `Ad ${LIMITS.name} simvoldan uzun olmamalıdır.`);
  const digits = value.phone.replace(/\D/g, "");
  if (digits.length < 9) return fail("phone", "Telefon nömrəsini tam yazın (ən azı 9 rəqəm).");
  if (digits.length > 15 || value.phone.length > LIMITS.phone || !/^[\d\s()+\-.]+$/.test(value.phone))
    return fail("phone", "Telefon nömrəsi düzgün deyil.");
  if (value.email && (value.email.length > LIMITS.email || !EMAIL_RE.test(value.email))) return fail("email", "E-poçt ünvanı düzgün deyil.");
  if (value.company.length > LIMITS.company) return fail("company", `Şirkət adı ${LIMITS.company} simvoldan uzun olmamalıdır.`);
  if (value.message.length > LIMITS.message) return fail("message", `Mətn ${LIMITS.message} simvoldan uzun olmamalıdır.`);
  if (!SERVICES.has(value.service)) value.service = "Göstərilməyib";
  return { ok: true, value };
}
