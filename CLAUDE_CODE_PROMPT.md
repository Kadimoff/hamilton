# Claude Code tapşırığı: Hamilton.az saytını istehsala hazırla

> Bu mətni olduğu kimi Claude Code-a yapışdırın. `hamilton-az-template.html` faylı layihə qovluğunun kökündə olmalıdır.

---

## Rol və kontekst

Sən təcrübəli frontend mühəndisisən. Hamilton.az — Bakıda fəaliyyət göstərən vergi konsultasiyası şirkətidir. Xidmətləri: mühasibatlıq, vergi konsultasiyası, server və 1C xidmətləri, server təhlükəsizliyi, şirkətə özəl mühasibat sistemlərinin hazırlanması.

Layihə kökündə `hamilton-az-template.html` var. Bu, təsdiqlənmiş dizayndır: açıq palitra (kobalt `#2453FF` vurğu, qızılı `#D9981F` balans xətti), Geologica + Plus Jakarta Sans + IBM Plex Mono şriftləri, hero-da perspektivdə canlı "ikili yazılış" canvas animasiyası, bento xidmət kartları, server monitorinq paneli, ƏDV/mənfəət vergisi kalkulyatoru, vergi təqvimi, FAQ və müraciət forması.

**Əsas qayda: vizual dizaynı dəyişmə.** Rəngləri, şriftləri, boşluqları, animasiyaları və mətnləri qoru. Sənin işin bu şablonu saxlanıla bilən, sürətli, təhlükəsiz istehsal layihəsinə çevirməkdir.

## İş qaydası

1. Əvvəlcə `hamilton-az-template.html` faylını tam oxu və qısa plan yaz (hansı fayllar yaranacaq, hansı addımlar). Planı mənə göstər, sonra işə başla.
2. Hər addımı ayrıca git commit ilə bitir (`feat:`, `fix:`, `chore:` prefiksləri ilə).
3. Faylları silmək, `git push`, deploy və ya ödənişli xidmət qoşmaq kimi geri qaytarılmaz addımlardan əvvəl məndən təsdiq al.
4. Heç bir parol, API açarı və ya token-i koda yazma. Hamısı `.env`-də olsun, `.env.example` yarat, `.env`-i `.gitignore`-a əlavə et.
5. Hər addımın sonunda nə etdiyini 2–3 cümlə ilə bildir. Bir şey alınmasa, səbəbini açıq yaz.
6. Bütün istifadəçiyə görünən mətnlər Azərbaycan dilində qalsın (ə, ğ, ı, İ, ö, ü, ç, ş hərfləri düzgün görünməlidir).

## Addımlar

### 1. Layihə strukturu
- **Vite + vanilla JS** (framework yoxdur) ilə layihə qur.
- Struktur:
  ```
  index.html
  src/
    styles/tokens.css        ← :root dəyişənləri (şablondan olduğu kimi)
    styles/base.css
    styles/sections/*.css    ← hero, services, monitor, tools, faq, contact, footer
    js/main.js
    js/hero-ledger.js        ← canvas animasiyası
    js/calculators.js
    js/tax-calendar.js
    js/monitor.js
    js/form.js
    data/site.json           ← əlaqə məlumatları, sosial şəbəkələr
    data/services.json       ← 5 xidmət (başlıq, təsvir, xüsusiyyətlər)
    data/tax.json            ← vergi dərəcələri və son tarixlər
  public/assets/
  ```
- Şablondakı inline CSS və JS-i bu fayllara böl. Nəticə vizual olaraq şablonla eyni olmalıdır.

### 2. Şriftlər
- Google Fonts linkini `@fontsource/geologica`, `@fontsource/plus-jakarta-sans`, `@fontsource/ibm-plex-mono` paketləri ilə əvəz et (self-host). `latin` və `latin-ext` subsetlərini qoş.
- Yalnız istifadə olunan çəkiləri yüklə (400, 500, 600, 700). `font-display: swap`.

### 3. Məlumatı koddan ayır
- Əlaqə (e-poçt, telefon, ünvan, iş saatı) `site.json`-dan gəlsin. Şablondakı `info@hamilton.az` və `+994 12 000 00 00` yer tutucudur — mənə real dəyərləri soruş.
- `tax.json` belə olsun: hər dərəcə və son tarix üçün `value`, `source` (URL) və `lastChecked` (tarix) sahələri. Kalkulyator və təqvim dərəcələri buradan oxusun, kodda sabit rəqəm qalmasın.
- Qeyd: ƏDV qeydiyyat həddi 2026-dan pərakəndə ticarət və istehlak xidmətləri üçün dəyişdirilib (taxes.gov.az/az/post/4509). Saytda hədd göstəriləcəksə, mənbə ilə birlikdə göstər.

### 4. Higgsfield hero videosu (istəyə bağlı)
- `public/assets/hero.mp4` və `hero-poster.jpg` faylları olduqda hero-da `.plane-wrap` (canvas) yerinə video göstər: `autoplay muted loop playsinline`, `preload="metadata"`.
- Video yoxdursa, yüklənmirsə, istifadəçidə `prefers-reduced-motion: reduce` və ya `navigator.connection.saveData` aktivdirsə — canvas animasiyası qalsın.
- Videonu yalnız hero görünəndə oynat (IntersectionObserver), görünməyəndə dayandır.
- Fayl 4 MB-dan böyükdürsə, `ffmpeg` ilə H.264, `-crf 26 -preset veryfast`, 1280px enə sıxışdır və WebM versiyasını da yarat.

### 5. Müraciət forması — backend
- Formanı serverless funksiyaya qoş (Vercel və ya Netlify funksiyası; hansını seçəcəyimizi məndən soruş).
- Funksiya müraciəti **e-poçtla** (SMTP, `nodemailer`) və istəyə bağlı **Telegram bot** ilə göndərsin. Parametrlər `.env`-dən: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- Server tərəfində yoxlama: ad məcburi, telefon ən azı 9 rəqəm, mətn maksimum 2000 simvol.
- Spama qarşı: gizli honeypot sahəsi + IP üzrə sadə rate limit (məs. 10 dəqiqədə 5 müraciət).
- Uğurlu göndərişdən sonra formada "Müraciətiniz qəbul edildi" yazısı, xəta olduqda nəyin səhv getdiyini və telefonla əlaqə variantını göstər.
- Şablondakı "Şablon rejimində…" mesajını sil.

### 6. SEO
- `<html lang="az">`, unikal `<title>` və `meta description`.
- Open Graph və Twitter kartı; 1200×630 OG şəkli yarat (logo + "Rəqəmləriniz balansda, sistemləriniz qorunur.").
- JSON-LD: `AccountingService` tipi (ad, ünvan, telefon, iş saatı, xidmət sahəsi — `site.json`-dan).
- `sitemap.xml`, `robots.txt`, `favicon.svg` (şablondakı "H" loqosundan) və `apple-touch-icon.png`.

### 7. Performans və əlçatanlıq
- Hero canvas ekrandan çıxanda və tab gizli olanda dayansın (şablonda var — qoru).
- `prefers-reduced-motion` dəstəyini qoru.
- Lighthouse (mobil): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- Bütün interaktiv elementlər klaviatura ilə işləsin, fokus görünsün.

### 8. Testlər
- **Vitest**: ƏDV kalkulyatoru (daxil / daxil deyil), mənfəət vergisi, növbəti son tarix hesablaması (ay sonu, rüb, 31 mart, il keçidi) üçün unit testlər.
- **Playwright**: 390, 768, 1280 px enlərdə səhifə açılır, konsolda xəta yoxdur, üfüqi scroll yoxdur, menyu açılıb bağlanır, forma validasiyası işləyir.
- `npm test` hamısını işə salsın.

### 9. Build və deploy
- `npm run build` → `dist/`. `npm run preview` ilə yoxla.
- Deploy üçün `README.md`-də addım-addım təlimat yaz (Vercel/Netlify və adi hostinq/cPanel üçün statik yükləmə). Deploy-u özün etmə — əvvəlcə məndən soruş.

## Hazır sayılma meyarları

- [ ] Sayt vizual olaraq `hamilton-az-template.html` ilə eynidir
- [ ] Bütün mətn, əlaqə və vergi məlumatları JSON fayllarından gəlir
- [ ] Forma real olaraq e-poçta (və seçilibsə Telegram-a) çatır
- [ ] Higgsfield videosu qoşulanda işləyir, olmayanda canvas göstərilir
- [ ] Testlər keçir, Lighthouse hədləri ödənilir
- [ ] `README.md`-də quraşdırma, `.env` dəyişənləri və deploy təlimatı var
- [ ] Kodda heç bir gizli açar yoxdur

Başlamaq üçün: faylı oxu, planı göstər və mənə bu suallar ver — (1) Vercel, yoxsa Netlify? (2) Real e-poçt, telefon və ünvan; (3) Telegram bildirişi lazımdırmı?
