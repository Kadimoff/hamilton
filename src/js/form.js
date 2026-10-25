// Müraciət forması: brauzerdə ilkin yoxlama, sonra /api/muraciet-ə göndəriş
import { $ } from "./lib/format.js";

export const MAX_MESSAGE = 2000;

/** Server tərəfindəki qaydaların eynisi (server/validate.js) — istifadəçiyə dərhal cavab üçün */
export function checkForm({ name, phone, message }) {
  if (!name.trim()) return { field: "name", msg: "Adınızı yazın." };
  if (phone.replace(/\D/g, "").length < 9) return { field: "phone", msg: "Telefon nömrəsini tam yazın (ən azı 9 rəqəm)." };
  if (message.length > MAX_MESSAGE) return { field: "message", msg: `Mətn ${MAX_MESSAGE} simvoldan uzun olmamalıdır (indi ${message.length}).` };
  return null;
}

export function initForm(site) {
  const form = $("reqForm"), st = $("formStatus");
  if (!form) return;
  const btn = form.querySelector('button[type="submit"]');
  const btnHtml = btn.innerHTML;

  document.querySelectorAll("[data-svc]").forEach((a) =>
    a.addEventListener("click", () => {
      document.querySelectorAll(".svc-pick input").forEach((r) => { if (r.value === a.dataset.svc) r.checked = true; });
    })
  );

  function show(kind, text, withPhone) {
    st.className = "status " + kind;
    st.textContent = text;
    if (withPhone) {
      const a = document.createElement("a");
      a.href = "tel:" + site.phone.e164;
      a.textContent = site.phone.display;
      st.append(" Təcili olarsa, zəng edin: ", a, ".");
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const el = form.elements;
    const data = {
      service: el.service.value,
      name: el.name.value,
      company: el.company.value,
      phone: el.phone.value,
      email: el.email.value,
      message: el.message.value,
      website: el.website.value // honeypot
    };
    const err = checkForm(data);
    if (err) { show("bad", err.msg); el[err.field].focus(); return; }

    btn.disabled = true;
    btn.textContent = "Göndərilir…";
    st.className = "status"; st.textContent = "";
    try {
      const res = await fetch("/api/muraciet", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        form.reset();
        show("good", "Müraciətiniz qəbul edildi. İş günü ərzində sizinlə əlaqə saxlayacağıq.");
      } else if (res.status === 400 && body.field && el[body.field]) {
        show("bad", body.error || "Məlumatları yoxlayın.");
        el[body.field].focus();
      } else {
        show("bad", body.error || "Müraciəti göndərmək alınmadı.", true);
      }
    } catch {
      show("bad", "Serverlə əlaqə qurulmadı. İnternet bağlantısını yoxlayın.", true);
    } finally {
      btn.disabled = false;
      btn.innerHTML = btnHtml;
    }
  });
}
