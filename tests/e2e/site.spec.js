import { test, expect } from "@playwright/test";

const WIDTHS = [390, 768, 1280];

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("səhifə açılır, konsolda xəta yoxdur, üfüqi scroll yoxdur", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("requestfailed", (r) => errors.push(`${r.url()} ${r.failure()?.errorText}`));

      await page.goto("/");
      await expect(page).toHaveTitle(/Hamilton\.az/);
      await expect(page.locator("h1")).toContainText("Rəqəmləriniz");
      await expect(page.locator("#dDays")).not.toHaveText("—"); // JS işləyib
      await expect(page.locator(".card")).toHaveCount(5);
      // bütün səhifəni gəzək ki, lazy işlər də işə düşsün
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
      });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });

    test("menyu açılır və bağlanır", async ({ page }) => {
      await page.goto("/");
      const btn = page.locator("#menuBtn"), nav = page.locator("#nav");
      if (width > 980) {
        await expect(btn).toBeHidden();
        await expect(nav).toBeVisible();
        return;
      }
      await expect(nav).toBeHidden();
      await btn.click();
      await expect(nav).toBeVisible();
      await expect(btn).toHaveAttribute("aria-expanded", "true");
      await expect(btn).toHaveText("Bağla");
      await page.keyboard.press("Escape");
      await expect(nav).toBeHidden();
      await btn.click();
      await nav.getByRole("link", { name: "Xidmətlər" }).click();
      await expect(nav).toBeHidden();
      await expect(btn).toHaveAttribute("aria-expanded", "false");
    });

    test("forma validasiyası və göndəriş", async ({ page }) => {
      await page.goto("/#elaqe");
      const form = page.locator("#reqForm"), status = page.locator("#formStatus");
      await form.getByRole("button", { name: /Müraciəti göndər/ }).click();
      await expect(status).toHaveText("Adınızı yazın.");
      await expect(page.locator("#f-name")).toBeFocused();

      await page.fill("#f-name", "Test İstifadəçi");
      await page.fill("#f-tel", "12 34");
      await form.getByRole("button", { name: /Müraciəti göndər/ }).click();
      await expect(status).toContainText("ən azı 9 rəqəm");
      await expect(page.locator("#f-tel")).toBeFocused();

      await page.fill("#f-tel", "+994 50 123 45 67");
      await page.locator(".svc-pick label", { hasText: "Vergi konsultasiyası" }).click();
      await page.fill("#f-msg", "Playwright testi — ə ğ ı İ ö ü ç ş");
      await form.getByRole("button", { name: /Müraciəti göndər/ }).click();
      await expect(status).toHaveText(/Müraciətiniz qəbul edildi/);
      await expect(status).toHaveClass(/good/);
      await expect(page.locator("#f-name")).toHaveValue("");
    });
  });
}

test("server xətasında telefonla əlaqə variantı göstərilir", async ({ page }) => {
  await page.route("/api/muraciet", (r) => r.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ ok: false, error: "Müraciəti hazırda göndərmək mümkün olmadı." }) }));
  await page.goto("/#elaqe");
  await page.fill("#f-name", "Test");
  await page.fill("#f-tel", "+994501234567");
  await page.getByRole("button", { name: /Müraciəti göndər/ }).click();
  const status = page.locator("#formStatus");
  await expect(status).toContainText("göndərmək mümkün olmadı");
  await expect(status.locator('a[href^="tel:"]')).toBeVisible();
});

test("klaviatura: kalkulyator tabları oxlarla, fokus görünür", async ({ page }) => {
  await page.goto("/#aletler");
  const tabVat = page.locator("#tabVat");
  await tabVat.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tabPro")).toBeFocused();
  await expect(page.locator("#calcPro")).toBeVisible();
  const outline = await page.locator("#tabPro").evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
  await page.fill("#pInc", "100000");
  await page.fill("#pExp", "40000");
  await expect(page.locator("#pTax")).toHaveText("12 000,00");
});

test("reduced-motion: canvas statik qalır, səhifə işləyir", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("#ledger")).toBeVisible();
  await expect(page.locator("#bLbl")).toHaveText("Balans tutur ✓");
  await ctx.close();
});

test("SEO: meta, JSON-LD, sitemap, robots", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "az");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /og-image\.png$/);
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(ld["@type"]).toBe("AccountingService");
  expect(ld.telephone).toMatch(/^\+994/);
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
  for (const f of ["/favicon.svg", "/apple-touch-icon.png", "/og-image.png"]) expect((await request.get(f)).status(), f).toBe(200);
});

test.describe("mobil yapışan panel", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("hero-da gizli, aşağıda görünür, əlaqə bölməsində gizlənir", async ({ page }) => {
    await page.goto("/");
    const bar = page.locator("#mCta");
    await expect(bar).toBeHidden();
    await page.locator("#yanasma").scrollIntoViewIfNeeded();
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("link", { name: /Zəng edin/ })).toHaveAttribute("href", /^tel:\+994/);
    await page.locator("#reqForm").scrollIntoViewIfNeeded();
    await expect(bar).toBeHidden();
  });
});

test("desktopda yapışan panel yoxdur", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.locator("#yanasma").scrollIntoViewIfNeeded();
  await expect(page.locator("#mCta")).toBeHidden();
});
