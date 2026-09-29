# AI Learning Kun - Website (Astro)

Company profile + blog website untuk ailearnkun.my.id, dibangun dengan Astro + Decap CMS.

## Stack

- Astro v7 (static output)
- Decap CMS (admin di /admin)
- Deploy: GitHub Actions -> rsync ke VPS (Caddy serves static files)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## CMS Admin

CMS tersedia di /admin. Login dengan GitHub OAuth (Docker self-hosted OAuth2 proxy di VPS).

Konten blog ada di src/content/blog/ (ID) dan src/content/en/blog/ (EN).

## Struktur

- src/pages/ - Halaman ID + EN
- src/content/ - Blog posts (markdown)
- src/data/ - Data JSON (projects, services, site)
- src/layouts/ - BaseLayout + PostLayout
- public/admin/ - Decap CMS
- public/assets/ - CSS, JS, fonts, images
