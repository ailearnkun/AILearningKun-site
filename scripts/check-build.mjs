#!/usr/bin/env node
/**
 * Post-build verification.
 *
 * Serves _site on an ephemeral port and asserts that every page and asset
 * resolves with HTTP 200, that internal links point at files that exist,
 * and that both language trees are complete. Exits non-zero on any failure
 * so it is safe to gate a deploy on.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "_site");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = await walk(root);
const pages = files
  .filter((f) => f.endsWith("index.html"))
  .map((f) => "/" + f.slice(root.length + 1).replace(/index\.html$/, ""))
  .sort();

if (!pages.length) {
  console.error("✗ No pages found in _site — did the build run?");
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    let file = join(root, p);
    const s = await stat(file).catch(() => null);
    if (!s || s.isDirectory()) file = join(root, p, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const failures = [];
const checkedLinks = new Set();

for (const page of pages) {
  const res = await fetch(base + page);
  if (res.status !== 200) {
    failures.push(`page ${page} → HTTP ${res.status}`);
    continue;
  }
  const html = await res.text();

  // Collect internal hrefs and verify each resolves.
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1];
    if (checkedLinks.has(href)) continue;
    checkedLinks.add(href);
    const r = await fetch(base + href);
    if (r.status !== 200) failures.push(`broken link ${href} (found on ${page}) → HTTP ${r.status}`);
  }
}

// Both language trees must exist.
for (const required of ["/", "/en/", "/layanan/", "/en/services/", "/proyek/", "/en/work/", "/blog/", "/en/blog/", "/tentang/", "/en/about/", "/kontak/", "/en/contact/"]) {
  if (!pages.includes(required)) failures.push(`missing expected page: ${required}`);
}

// ---------------------------------------------------------------------------
// Static security / hygiene assertions.
// These mirror the Content-Security-Policy in netlify.toml: if a template ever
// reintroduces an inline style or script, the deploy gate fails instead of the
// policy silently breaking the page in production.
// ---------------------------------------------------------------------------
const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z_-]{35}/,            // Google API key
  /sk-[A-Za-z0-9]{20,}/,              // OpenAI-style key
  /\b\d{9,10}:AA[A-Za-z0-9_-]{33}\b/, // Telegram bot token
  /BEGIN [A-Z ]*PRIVATE KEY/,
  /(?:api[_-]?key|secret|password)\s*[:=]\s*["'][^"']{8,}/i,
];

let inlineStyles = 0;
let inlineScripts = 0;
let unsafeBlank = 0;

for (const page of pages) {
  const html = await readFile(join(root, page.slice(1), "index.html"), "utf8");

  // style="" attributes break `style-src 'self'` — all presentation must be in CSS.
  inlineStyles += (html.match(/\sstyle="/g) || []).length;

  // <script> with a body breaks `script-src 'self'` without a nonce/hash.
  // Exceptions: JSON-LD (application/ld+json) is data, not executable code.
  for (const tag of html.matchAll(/<script[\s\S]*?<\/script>/g)) {
    const s = tag[0];
    if (/src=/.test(s)) continue;            // external script, fine
    if (/type="application\/ld\+json"/.test(s)) continue;  // structured data
    if (/type="application\/json"/.test(s)) continue;       // structured data
    // Has a body that is not whitespace-only
    const body = s.replace(/<script[^>]*>/, "").replace(/<\/script>/, "").trim();
    if (body) inlineScripts++;
  }

  // target="_blank" without rel=noopener is a reverse-tabnabbing vector.
  for (const tag of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(tag[0])) unsafeBlank++;
  }

  for (const pattern of SECRET_PATTERNS) {
    const hit = html.match(pattern);
    if (hit) failures.push(`possible secret in ${page}: ${String(hit[0]).slice(0, 24)}…`);
  }

  // The contact form must keep its honeypot, or spam filtering is lost.
  if (page === "/kontak/" || page === "/en/contact/") {
    if (!/bot-field/.test(html)) failures.push(`honeypot field missing on ${page}`);
    if (!/data-netlify="true"/.test(html)) failures.push(`netlify form attribute missing on ${page}`);
  }
}

if (inlineStyles) failures.push(`${inlineStyles} inline style attribute(s) — breaks style-src 'self'`);
if (inlineScripts) failures.push(`${inlineScripts} inline <script> block(s) — breaks script-src 'self'`);
if (unsafeBlank) failures.push(`${unsafeBlank} target="_blank" link(s) without rel="noopener"`);

// Materialize is a design reference only; nothing may load it at runtime.
const vendorRefs = files.filter((f) => f.includes("/vendor/"));
if (vendorRefs.length) failures.push(`${vendorRefs.length} vendored framework file(s) still shipped`);

server.close();

console.log(`\nPages: ${pages.length}  |  Internal links checked: ${checkedLinks.size}`);
console.log(`Inline styles: ${inlineStyles}  |  Inline scripts: ${inlineScripts}  |  Vendored framework files: ${vendorRefs.length}\n`);

if (failures.length) {
  console.error(`✗ ${failures.length} problem(s):`);
  failures.forEach((f) => console.error("  - " + f));
  process.exit(1);
}

console.log("✓ All pages and internal links resolve (HTTP 200).");
console.log("✓ Language trees complete (id + en).");
console.log("✓ CSP-compatible (no inline styles or scripts).");
console.log("✓ No secrets, no unguarded target=\"_blank\", forms intact.");
