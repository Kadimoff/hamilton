// Müraciəti SMTP ilə göndərir (nodemailer). Parametrlər .env-dən oxunur.
import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function buildMessage(v, { from, to, ip, at = new Date() }) {
  const rows = [
    ["Xidmət", v.service],
    ["Ad, soyad", v.name],
    ["Şirkət", v.company || "—"],
    ["Telefon", v.phone],
    ["E-poçt", v.email || "—"],
    ["Qısa məlumat", v.message || "—"],
    ["Tarix", at.toISOString()],
    ["IP", ip || "—"]
  ];
  return {
    from,
    to,
    ...(v.email ? { replyTo: { name: v.name, address: v.email } } : {}),
    subject: `Yeni müraciət: ${v.service} — ${v.name}`.slice(0, 200),
    text: rows.map(([k, val]) => `${k}: ${val}`).join("\n"),
    html:
      `<table cellpadding="6" style="font-family:sans-serif;font-size:14px;border-collapse:collapse">` +
      rows.map(([k, val]) => `<tr><th align="left" valign="top" style="color:#5B6C7E">${esc(k)}</th><td style="white-space:pre-wrap">${esc(val)}</td></tr>`).join("") +
      `</table>`
  };
}

export class MailConfigError extends Error {}

/** env: process.env kimi obyekt. SMTP yoxdursa və istehsal deyilsə, məktublar .mail-outbox/-a yazılır. */
export function createMailer(env = process.env) {
  const prod = env.NODE_ENV === "production";
  const to = env.MAIL_TO;
  if (env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 465),
      secure: String(env.SMTP_SECURE ?? "true") === "true",
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    });
    const from = env.MAIL_FROM || env.SMTP_USER;
    return {
      mode: "smtp",
      verify: () => transport.verify(),
      async send(v, meta) {
        if (!to || !from) throw new MailConfigError("MAIL_TO və ya MAIL_FROM/SMTP_USER təyin edilməyib");
        return transport.sendMail(buildMessage(v, { ...meta, from, to }));
      }
    };
  }
  if (!prod && env.MAIL_DEV_OUTBOX !== "0") {
    const dir = resolve(env.MAIL_OUTBOX_DIR || ".mail-outbox");
    return {
      mode: "outbox",
      dir,
      verify: async () => true,
      async send(v, meta) {
        const msg = buildMessage(v, { ...meta, from: "dev@localhost", to: to || "dev@localhost" });
        await mkdir(dir, { recursive: true });
        const file = resolve(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
        await writeFile(file, JSON.stringify(msg, null, 2));
        return { file };
      }
    };
  }
  return {
    mode: "none",
    verify: async () => false,
    async send() { throw new MailConfigError("SMTP_HOST təyin edilməyib"); }
  };
}
