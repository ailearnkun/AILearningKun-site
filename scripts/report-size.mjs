#!/usr/bin/env node
// Reports the weight of the built site so regressions are visible immediately.
// Usage: npm run size
import { readdir, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const OUT = "_site";

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

async function walk(dir, acc = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = await walk(OUT);
const rows = [];
for (const f of files) {
  rows.push({ path: relative(OUT, f), size: (await stat(f)).size });
}

const sum = (list) => list.reduce((a, b) => a + b.size, 0);
const pick = (ext) => rows.filter((r) => extname(r.path) === ext);

const html = pick(".html");
const css = pick(".css");
const js = pick(".js");
const other = rows.filter((r) => ![".html", ".css", ".js"].includes(extname(r.path)));

console.log(`\nBuilt output: ${OUT}`);
console.log("─".repeat(58));
console.log(`  HTML   ${String(html.length).padStart(3)} files   ${kb(sum(html)).padStart(9)}`);
console.log(`  CSS    ${String(css.length).padStart(3)} files   ${kb(sum(css)).padStart(9)}`);
console.log(`  JS     ${String(js.length).padStart(3)} files   ${kb(sum(js)).padStart(9)}`);
console.log(`  Other  ${String(other.length).padStart(3)} files   ${kb(sum(other)).padStart(9)}`);
console.log("─".repeat(58));
console.log(`  TOTAL  ${String(rows.length).padStart(3)} files   ${kb(sum(rows)).padStart(9)}\n`);

// What a single page visit actually costs: one document + the shared assets.
const home = rows.find((r) => r.path === "index.html");
const firstLoad = (home?.size || 0) + sum(css) + sum(js);
console.log(`First visit (home + shared CSS/JS): ${kb(firstLoad)}\n`);
