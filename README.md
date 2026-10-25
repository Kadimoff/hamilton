# Hamilton.az

Hamilton.az vergi konsultasiyası şirkətinin saytıdır. Stack: Vite + vanilla JS (framework yoxdur). Müraciət forması üçün kiçik bir Node serveri işləyir (`node:http` + `nodemailer`).

Dizayn `hamilton-az-template.html` şablonundan götürülüb. Rəng, şrift, boşluq və animasiyalar ondan olduğu kimi köçürülüb.

## Quraşdırma

```bash
npm install
npx playwright install chromium   # testlər və OG şəkli üçün
cp .env.example .env              # dəyərləri doldurun
npm run dev                       # http://localhost:5173
```

Lokalda SMTP olmadan da işləmək olar. `SMTP_HOST` boş qalsa, göndərilən müraciətlər `.mail-outbox/` qovluğuna JSON fayl kimi yazılır. İstehsalda (`NODE_ENV=production`) bu rejim işləmir.

## Əmrlər

| Əmr | Nə edir |
|---|---|
| `npm run dev` | Dev server (forma API-si də işləyir) |
| `npm run build` | `dist/` qovluğuna istehsal build-i |
| `npm run preview` | `dist/`-i yoxlamaq üçün Vite preview |
| `npm start` | İstehsal serveri: `dist/` + `POST /api/muraciet` |
| `npm test` | Vitest (unit) + Playwright (390/768/1280 px) |
| `npm run assets` | `og-image.png` və `apple-touch-icon.png` faylını yenidən yaradır |
| `npm run video -- fayl.mp4 [poster.jpg]` | Higgsfield videosunu hazırlayır (aşağıya baxın) |

## Struktur

```
index.html                 ← şablon; {{...}} və <!-- render:... --> build zamanı JSON-dan doldurulur
build/site-data.js         ← həmin Vite plagini (+ sitemap.xml, robots.txt)
src/data/site.json         ← əlaqə, ünvan, iş saatı, sosial şəbəkələr, SEO mətnləri
src/data/services.json     ← 5 xidmət (başlıq, təsvir, xüsusiyyətlər)
src/data/tax.json          ← vergi dərəcələri, son tarixlər, qeyri-iş günləri (hər birində source + lastChecked)
src/partials/              ← xidmət kartlarının ikon və vizualları
src/styles/                ← tokens.css, fonts.css, base.css, sections/*.css, motion.css
src/js/                    ← main.js, hero-ledger.js, hero-cards.js, hero-video.js, calculators.js,
                             tax-calendar.js, monitor.js, form.js, lib/{tax,format}.js
server/                    ← index.js (server), contact.js (API), validate.js, rate-limit.js, mailer.js
tests/unit, tests/e2e      ← Vitest və Playwright
```

### Məlumatı dəyişmək

- **Əlaqə məlumatları:** `src/data/site.json`. Hazırda `"mock": true` qoyulub, yəni dəyərlər nümunədir və build zamanı xəbərdarlıq çıxır. Real dəyərləri yazandan sonra `false` edin.
- **Vergi dərəcəsi və ya son tarix:** `src/data/tax.json`. Kalkulyator, təqvim, lent, kartlar və hero animasiyası rəqəmləri buradan oxuyur. Dəyəri dəyişəndə `source` və `lastChecked` sahələrini də yeniləyin.
- **Bayram günləri:** `tax.json` → `nonWorkingDays.holidays` (`"YYYY-MM-DD"`). Son tarix şənbə, bazar və ya bu siyahıdakı günə düşərsə, təqvim onu növbəti iş gününə keçirir. Nazirlər Kabinetinin hər il verdiyi qərara görə yeniləyin.
- **ƏDV qeydiyyat həddi** (200 000 ₼; 2026-dan pərakəndə ticarət və istehlak xidmətləri üçün 400 000 ₼): `tax.json` → `vatRegistrationThreshold`. Saytda hələ göstərilmir. Göstəriləcəksə, mənbə linki ilə birlikdə göstərin: [taxes.gov.az/az/post/4509](https://www.taxes.gov.az/az/post/4509).

## Higgsfield hero videosu (istəyə bağlı)

```bash
npm run video -- ~/Downloads/higgsfield.mp4      # poster videonun ilk kadrından götürülür
npm run build
```

`public/assets/hero.mp4` və `hero-poster.jpg` faylları olduqda build videonu hero-ya əlavə edir. Video yalnız hero ekranda görünəndə oynayır. Video yüklənməsə, istifadəçidə `prefers-reduced-motion` və ya `saveData` aktiv olsa, canvas animasiyası göstərilir. Fayl 4 MB-dan böyükdürsə, H.264 (crf 26, 1280px) və WebM (VP9) versiyalarına sıxılır, orijinalı isə `assets-src/`-də qalır. Videonu söndürmək üçün `public/assets/hero.*` fayllarını silib yenidən build edin.

## `.env` dəyişənləri

| Dəyişən | Təsvir |
|---|---|
| `PORT` | Node serverinin portu (standart `8787`) |
| `HOST` | Dinlənən ünvan (standart `127.0.0.1`; nginx arxasında belə qalmalıdır) |
| `TRUST_PROXY` | nginx arxasında `1`: rate limit IP-ni `X-Real-IP` başlığından oxuyur |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP server (465 → `true`, 587 → `false`) |
| `SMTP_USER`, `SMTP_PASS` | SMTP girişi |
| `MAIL_FROM` | Göndərən ünvan (boş qalsa `SMTP_USER` istifadə olunur) |
| `MAIL_TO` | Müraciətlərin çatacağı ünvan |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MIN` | Bir IP-dən pəncərə ərzində ən çox müraciət (standart 10 dəqiqədə 5) |
| `MAIL_DEV_OUTBOX` | Yalnız lokalda: SMTP yoxdursa məktubları `.mail-outbox/`-a yazır |

Spama qarşı forma iki qoruma işlədir: gizli `website` sahəsi (honeypot) və IP üzrə rate limit. Rate limit Node prosesinin yaddaşında saxlanılır, ona görə server bir prosesdə işləməlidir (aşağıdakı systemd kimi).

## Deploy

### A. Öz serveriniz (VPS: nginx + Node) — tövsiyə olunur

Serverdə Node 22+ və nginx olmalıdır.

1. Kodu serverə köçürün (məs. `/var/www/hamilton.az`) və build edin:
   ```bash
   npm ci && npm run build
   cp .env.example .env && nano .env      # SMTP_*, MAIL_TO; TRUST_PROXY=1
   ```
2. systemd xidməti yaradın, `/etc/systemd/system/hamilton.service`:
   ```ini
   [Unit]
   Description=Hamilton.az
   After=network.target

   [Service]
   WorkingDirectory=/var/www/hamilton.az
   ExecStart=/usr/bin/node server/index.js
   Environment=NODE_ENV=production
   Restart=always
   User=www-data

   [Install]
   WantedBy=multi-user.target
   ```
   ```bash
   sudo systemctl enable --now hamilton
   curl http://127.0.0.1:8787/api/health   # {"ok":true,"mail":"smtp"}
   ```
3. nginx, `/etc/nginx/sites-available/hamilton.az`:
   ```nginx
   server {
     listen 80;
     server_name hamilton.az www.hamilton.az;
     root /var/www/hamilton.az/dist;

     add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
     add_header X-Content-Type-Options nosniff always;
     add_header Referrer-Policy strict-origin-when-cross-origin always;
     add_header X-Frame-Options DENY always;

     gzip on;
     gzip_types text/css application/javascript image/svg+xml application/xml;

     location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; try_files $uri =404; }
     location / { add_header Cache-Control "no-cache"; try_files $uri $uri/ =404; }

     location /api/ {
       proxy_pass http://127.0.0.1:8787;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       client_max_body_size 32k;
     }
   }
   ```
   ```bash
   sudo ln -s /etc/nginx/sites-available/hamilton.az /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d hamilton.az -d www.hamilton.az   # HTTPS
   ```
   HTTPS işə düşəndən sonra nginx-ə `add_header Strict-Transport-Security "max-age=31536000" always;` əlavə edin.

   Qeyd: nginx-də `location` blokunun içində `add_header` yazılanda server səviyyəsindəki başlıqlar həmin blokda tətbiq olunmur. Təhlükəsizlik başlıqlarını `location /assets/` və `location /` bloklarında da təkrarlayın, ya da `include snippets/security-headers.conf;` istifadə edin.

4. Yeniləmə: `git pull && npm ci && npm run build && sudo systemctl restart hamilton`.

nginx istifadə etmədən də işlədə bilərsiniz: `npm start` həm `dist/`-i, həm də API-ni verir (gzip, keş və təhlükəsizlik başlıqları ilə). HTTPS üçün yenə də qarşısında nginx/Caddy olmalıdır.

### B. Vercel / Netlify

Statik hissə `npm run build` → `dist/` ilə işləyir. Forma isə `server/contact.js`-in həmin platformanın funksiya formatına (`api/muraciet.js` və ya `netlify/functions/`) köçürülməsini tələb edir. Yaddaşdakı rate limit serverless-də soyuq başlanğıcda sıfırlanır. Hazırda bu variant qurulmayıb.

### C. Adi hostinq / cPanel (yalnız statik)

`npm run build` edin və `dist/` qovluğunun **içindəkiləri** `public_html/`-ə yükləyin. cPanel-də "Setup Node.js App" varsa, `server/index.js`-i orada işə salın. Yoxdursa, forma işləməyəcək, çünki `/api/muraciet` üçün Node lazımdır.

## Testlər

```bash
npm test             # hamısı
npm run test:unit    # ƏDV, mənfəət vergisi, son tarixlər, server validasiyası, rate limit
npm run test:e2e     # build + istehsal serveri; 390/768/1280 px
```

## Yoxlama siyahısı (deploy-dan əvvəl)

- [ ] `site.json`-da real əlaqə məlumatları yazılıb, `mock: false`
- [ ] `.env`-də SMTP doldurulub; `/api/health` → `"mail":"smtp"`; test müraciəti `MAIL_TO`-ya çatır
- [ ] `tax.json` → `holidays` cari il üçün doldurulub
- [ ] `npm test` keçir
