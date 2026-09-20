# AI Learn Kun — Website

Situs profesional **AI Learn Kun**: optimasi operasional properti & bisnis, ditenagai sistem AI.

Bilingual (Indonesia di root, Inggris di `/en/`). Statis, cepat, tanpa backend.

## Stack

- **Eleventy (11ty) v3** — static site generator
- **Materialize v2.3.3** (`@materializecss/materialize`) + CSS kustom
- **Netlify** — hosting, Netlify Forms, HTTPS
- Node 26+, npm 11+

> Catatan: pakai paket `@materializecss/materialize` (fork aktif, update 2026).
> Paket lama `materialize-css` v1.0.0 sudah tidak dirawat sejak 2022.

## Perintah

```bash
npm install          # pasang dependensi
npm run serve        # preview lokal dengan live reload (http://localhost:8080)
npm run build        # build ke _site/
npm run test:build   # build + verifikasi semua halaman & link internal
npm run deploy:preview   # deploy draft (URL sementara, situs live tidak berubah)
npm run deploy:prod      # deploy ke https://ailearnkun.my.id
```

`test:build` wajib lulus sebelum deploy — ia memeriksa setiap halaman dan link
internal mengembalikan HTTP 200, dan kedua pohon bahasa lengkap.

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
│   └── partials/          → nav, footer
├── assets/
│   ├── css/style.css      → design system (tema biru, mobile-first)
│   ├── js/main.js         → nav mobile, penanda halaman aktif, reveal
│   ├── vendor/            → Materialize v2 (dari node_modules)
│   └── img/favicon.svg
├── index.njk              → /
├── layanan/  proyek/  blog/  tentang/  kontak/
└── en/                    → cermin struktur di atas (/en/)
```

Halaman detail layanan & proyek dibuat otomatis dari data via pagination —
menambah satu entri di `services.json` / `projects.json` langsung membuat
halaman baru di kedua bahasa.

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

## Deploy

Situs Netlify: `ailearnkun` (ID `e91e241e-13d2-4326-a48d-fc86da5d4bcf`)
Domain: `ailearnkun.my.id` (DNS di Netlify, HTTPS otomatis via Let's Encrypt)

Situs ini **tidak terhubung ke Git** — deploy lewat CLI:

```bash
npm run deploy:preview   # cek dulu di URL draft
npm run deploy:prod      # rilis ke domain utama
```

## Verifikasi (diuji)

- 32 halaman + 35 link internal → HTTP 200
- Kedua pohon bahasa lengkap (ID + EN)
- Ganti bahasa pada artikel menunjuk ke pasangannya
- `hreflang` + `canonical` benar untuk SEO
- Form kontak: `contact` (ID) dan `contact-en` (EN), dengan honeypot anti-spam
- Reveal-on-scroll fail-safe: konten tidak pernah tersembunyi permanen
  (tersembunyi hanya saat `html.js` aktif, ada timeout pengaman, dan
  menghormati `prefers-reduced-motion`)
