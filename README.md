# AI Learn Kun — Website

Situs profesional **AI Learn Kun**: optimasi operasional properti & bisnis, ditenagai sistem AI.

Bilingual (Indonesia di root, Inggris di `/en/`). Statis, cepat, tanpa backend.

**Repo:** https://github.com/ailearnkun/AILearningKun-site
**Live:** https://ailearnkun.my.id

## Stack

- **Eleventy (11ty) v3** — static site generator
- **CSS kustom** — design system sendiri (tema biru, mobile-first)
- **Netlify** — hosting, Netlify Forms, HTTPS
- Node 26+, npm 11+

> Tidak ada framework CSS/JS yang dikirim ke browser. Materialize dulu dipakai
> sebagai rujukan desain, tetapi setelah diaudit ternyata **nol kelasnya dipakai**
> di markup — 320 KB beban mati, lalu dibuang. Semua gaya sekarang di
> `src/assets/css/style.css`.

## Perintah

```bash
npm install          # pasang dependensi
npm run serve        # preview lokal dengan live reload (http://localhost:8080)
npm run build        # build produksi ke _site/ (minify + verifikasi bersih)
npm run build:dev    # build tanpa minify (untuk debug)
npm run test:build   # build + gerbang verifikasi lengkap (wajib lulus sebelum deploy)
npm run size         # laporkan berat hasil build
npm run deploy:preview   # deploy draft (URL sementara, situs live tidak berubah)
npm run deploy:prod      # deploy ke https://ailearnkun.my.id
```

`test:build` adalah gerbang deploy. Ia gagal (exit non-zero) jika ada halaman
atau link internal yang tidak HTTP 200, pohon bahasa tidak lengkap, ada inline
`style`/`<script>`, ada `target="_blank"` tanpa `rel="noopener"`, honeypot form
hilang, atau ada pola yang menyerupai kredensial di output.

## Struktur

```
src/
├── _data/
│   ├── site.json          → brand, kontak, navigasi (satu sumber kebenaran)
│   ├── i18n/id.json       → semua teks Indonesia
│   ├── i18n/en.json       → semua teks Inggris
│   ├── projects.json      → data proyek (judul, ringkas, stack — ID + EN)
│   └── services.json      → data layanan (ID + EN)
├── _includes/
│   ├── layouts/           → base, page, post
│   └── partials/          → nav, footer, icons, blog-search
├── assets/
│   ├── css/style.css      → design system (tema biru, mobile-first)
│   ├── js/main.js         → nav mobile, penanda halaman aktif, reveal, search
│   ├── fonts/             → Inter variable (self-hosted)
│   └── img/favicon.svg
├── index.njk              → /
├── layanan/  proyek/  blog/  tentang/  kontak/
└── en/                    → cermin struktur di atas (/en/)
```

Halaman detail layanan & proyek dibuat otomatis dari data via pagination —
menambah satu entri di `services.json` / `projects.json` langsung membuat
halaman baru di kedua bahasa.

## Ikon

Ikon adalah **SVG inline** dari makro di `src/_includes/partials/icons.njk` —
tanpa font ikon, tanpa file eksternal, tanpa permintaan jaringan tambahan.
Ikon mewarisi warna teks (`currentColor`).

```njk
{% from "partials/icons.njk" import icon %}
{{ icon("search") }}        {# ukuran bawaan 20px #}
{{ icon("arrow-right", 16) }}   {# ukuran kustom #}
```

Nama yang tersedia: `search`, `arrow-right`, `arrow-left`, `send`, `mail`,
`whatsapp`, `location`, `clock`, `globe`, `menu`, `github`, `settings`,
`chart`, `cpu`, `check`, `close`.

## Pencarian blog

Kotak pencarian di `/blog/` dan `/en/blog/` menyaring artikel **seketika**,
tanpa berkas indeks dan tanpa permintaan jaringan: teks yang bisa dicari
ditempelkan pada setiap kartu (`data-search-text`) saat build, lalu `main.js`
menyaring daftar itu sambil mengetik.

Tanpa JavaScript, seluruh daftar tetap terlihat (fail-safe, bukan halaman kosong).
Tekan `Esc` atau tombol silang untuk menghapus pencarian.

## Menulis artikel blog

Buat satu file Markdown:

**Indonesia** → `src/blog/posts/judul-artikel.md`
**Inggris**   → `src/en/blog/posts/article-title.md`

```yaml
---
title: "Judul Artikel"
date: 2026-09-20
lang: id
translationKey: judul-artikel        # samakan dengan versi EN untuk memasangkan
tags: [operasional, otomasi]
description: "Ringkasan satu baris untuk daftar blog dan SEO."
---

Isi artikel dalam Markdown...
```

Lalu `npm run build`. Artikel otomatis:
- muncul di index blog, terurut tanggal terbaru
- ikut terindeks pencarian blog
- muncul di bagian "Tulisan terbaru" di homepage
- dapat URL bersih (`/blog/judul-artikel/`)
- tombol ganti bahasa mengarah ke pasangannya (lewat `translationKey`)

`translationKey` yang sama di file ID dan EN memasangkan keduanya. Kalau tidak
ada pasangannya, tombol bahasa mengarah ke index blog bahasa tujuan.

## Mengubah kontak

Edit `src/_data/site.json`:

```json
{
  "email": "ai.learn.kun@gmail.com",
  "whatsapp": "",        ← isi kode negara tanpa + (mis. "6281234567890")
  "location": "Bali, Indonesia"
}
```

Jika `whatsapp` diisi, tombol WhatsApp otomatis muncul di halaman kontak
(kedua bahasa). Jika kosong, bagian itu disembunyikan.

## Performa

Diukur dengan Lighthouse (Chrome headless, build produksi):

- **Mobile:** Performance 100 · Accessibility 100 · Best Practices 100
- **Desktop:** Performance 100 · Accessibility 100 · Best Practices 100
- FCP 1,0 s · LCP 1,3 s · CLS 0 · TBT 0 ms (mobile)
- Kunjungan pertama (HTML + CSS + JS): **~28 KB**

Yang membuatnya cepat:
- tidak ada framework CSS/JS yang dikirim ke browser
- font self-hosted + `preload` → tidak ada perjalanan ke pihak ketiga
- HTML/CSS/JS diminifikasi saat build produksi
- aset di-cache `immutable` selama setahun; HTML selalu divalidasi ulang

## Keamanan

Header diatur di `netlify.toml`:

- `Content-Security-Policy` ketat — `default-src 'self'`, tanpa `unsafe-inline`,
  tanpa origin eksternal sama sekali
- `Strict-Transport-Security`, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, `Cross-Origin-Opener-Policy`
- Form kontak dilengkapi honeypot (`bot-field`) untuk menahan spam

CSP tanpa `unsafe-inline` hanya bisa dipertahankan karena tidak ada satu pun
inline `style`/`<script>` di output — dan `npm run test:build` gagal kalau ada
yang menyelinap masuk.

## Deploy

Situs Netlify: `ailearnkun` (ID `e91e241e-13d2-4326-a48d-fc86da5d4bcf`)
Domain: `ailearnkun.my.id` (DNS di Netlify, HTTPS otomatis via Let's Encrypt)

Repo GitHub: `ailearnkun/AILearningKun-site` (branch `master`)

```bash
npm run test:build       # pastikan lulus
git push origin master
npm run deploy:preview   # cek dulu di URL draft
npm run deploy:prod      # rilis ke domain utama
```

Situs ini **tidak terhubung ke Git di sisi Netlify** — deploy lewat CLI, jadi
`git push` tidak otomatis memicu deploy. Jalankan `deploy:prod` untuk merilis.

## Verifikasi (diuji)

- 32 halaman + 35 link internal → HTTP 200
- Kedua pohon bahasa lengkap (ID + EN)
- Ganti bahasa pada artikel menunjuk ke pasangannya
- `hreflang` + `canonical` benar untuk SEO
- Form kontak: `contact` (ID) dan `contact-en` (EN), dengan honeypot anti-spam
- Pencarian blog: cocok, nol hasil, dan tombol hapus — semua terverifikasi
- Reveal-on-scroll fail-safe: konten tidak pernah tersembunyi permanen
  (tersembunyi hanya saat `html.js` aktif, ada timeout pengaman, dan
  menghormati `prefers-reduced-motion`)
- Nol inline `style`/`<script>` → CSP ketat aman
- Kontras warna lolos WCAG AA
