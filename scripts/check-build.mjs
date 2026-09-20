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

server.close();

console.log(`\nPages: ${pages.length}  |  Internal links checked: ${checkedLinks.size}\n`);

if (failures.length) {
  console.error(`✗ ${failures.length} problem(s):`);
  failures.forEach((f) => console.error("  - " + f));
  process.exit(1);
}

console.log("✓ All pages and internal links resolve (HTTP 200).");
console.log(`✓ Language trees complete (id + en).`);
