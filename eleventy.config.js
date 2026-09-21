import { EleventyHtmlBasePlugin } from "@11ty/eleventy";
import { minify } from "html-minifier-terser";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

// ---------------------------------------------------------------------------
// Production optimizations.
// Minification runs only when NODE_ENV=production so `npm run serve` stays fast
// and readable while debugging.
// ---------------------------------------------------------------------------
const IS_PROD = process.env.NODE_ENV === "production";

// Conservative CSS minifier: strips comments, collapses whitespace, and removes
// the last semicolon before a closing brace. Deliberately avoids rewriting
// values or shorthand so the output stays semantically identical.
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")        // comments
    .replace(/\s*([{}:;,>~+])\s*/g, "$1")    // whitespace around punctuation
    .replace(/;}/g, "}")                     // trailing semicolons
    .replace(/\s+/g, " ")
    .replace(/\s*!\s*important/g, "!important")
    .trim();
}

// Whitespace-and-comment only. No identifier renaming: the markup wires
// behaviour through `data-*` hooks, so names must stay stable.
function minifyJs(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\])\/\/[^\n]*/g, "$1")  // line comments (not URLs)
    .replace(/\n\s*\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// SEO files.
//
// These are generated from the pages that actually exist on disk rather than
// from Eleventy's collections: a template using pagination only contributes
// its first page to `collections.all`, so a collection-driven sitemap silently
// drops every later detail page. Walking the output cannot miss a page.
// ---------------------------------------------------------------------------
async function walkHtml(dir, acc = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walkHtml(full, acc);
    else if (entry.name === "index.html") acc.push(full);
  }
  return acc;
}

async function writeSeoFiles(outDir) {
  const origin = "https://ailearnkun.my.id";
  const files = await walkHtml(outDir);

  const urls = [];
  for (const file of files) {
    const url = "/" + relative(outDir, file).split(sep).join("/").replace(/index\.html$/, "");
    const html = await readFile(file, "utf8");

    // Reuse the hreflang links the layouts already emit, so the sitemap and the
    // pages can never disagree about which translation pairs with which.
    const alternates = [];
    for (const m of html.matchAll(/<link[^>]*hreflang="([^"]+)"[^>]*>/g)) {
      const tag = m[0];
      const href = (tag.match(/href="([^"]+)"/) || [])[1];
      if (href) alternates.push({ lang: m[1], href });
    }

    urls.push({ url, alternates });
  }

  urls.sort((a, b) => a.url.localeCompare(b.url));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls.map(({ url, alternates }) => {
      const priority = url === "/" || url === "/en/" ? "1.0" : "0.7";
      const links = alternates
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.href}"/>`)
        .join("\n");
      return [
        "  <url>",
        `    <loc>${origin}${url}</loc>`,
        links,
        `    <priority>${priority}</priority>`,
        "  </url>",
      ].filter(Boolean).join("\n");
    }),
    "</urlset>",
    "",
  ].join("\n");

  await writeFile(join(outDir, "sitemap.xml"), xml);
  await writeFile(
    join(outDir, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
  );

  console.log(`[seo] sitemap.xml (${urls.length} urls) + robots.txt`);
}

export default function (eleventyConfig) {
  // Copy static assets straight through
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  // CMS admin interface (Sveltia / Decap CMS) — serves at /admin after build
  eleventyConfig.addPassthroughCopy({ "admin": "admin" });

  // Useful filters
  eleventyConfig.addFilter("readableDate", (dateObj, locale = "id-ID") => {
    const d = new Date(dateObj);
    return d.toLocaleDateString(locale === "en" ? "en-GB" : "id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  eleventyConfig.addFilter("isoDate", (dateObj) => new Date(dateObj).toISOString());

  // Keep only posts matching a language
  eleventyConfig.addFilter("byLang", (posts, lang) =>
    (posts || []).filter((p) => (p.data?.lang || "id") === lang)
  );

  eleventyConfig.addFilter("limit", (arr, n) => (arr || []).slice(0, n));

  // Sort newest first
  eleventyConfig.addFilter("newestFirst", (arr) =>
    (arr || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date))
  );

  // Year for the footer
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  if (IS_PROD) {
    // Minify generated HTML
    eleventyConfig.addTransform("htmlmin", async (content, outputPath) => {
      if (!outputPath || !outputPath.endsWith(".html")) return content;
      return await minify(content, {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
        removeRedundantAttributes: true,
        removeEmptyAttributes: false, // keep aria/alt semantics intact
        sortAttributes: true,
        sortClassName: false,         // preserve cascade order
        useShortDoctype: true,
        removeAttributeQuotes: false,
      });
    });

    // Minify the passthrough stylesheet and script after the build
    eleventyConfig.on("eleventy.after", async ({ dir }) => {
      const assets = join(dir.output, "assets");
      const targets = [
        { file: join(assets, "css", "style.css"), fn: minifyCss },
        { file: join(assets, "js", "main.js"), fn: minifyJs },
      ];
      for (const { file, fn } of targets) {
        try {
          const before = (await stat(file)).size;
          const out = fn(await readFile(file, "utf8"));
          await writeFile(file, out);
          const after = (await stat(file)).size;
          console.log(
            `[minify] ${file.split("/").slice(-2).join("/")} ${before}B → ${after}B`
          );
        } catch (err) {
          console.warn(`[minify] skipped ${file}: ${err.message}`);
        }
      }

      await writeSeoFiles(dir.output);
    });
  }

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html", "txt", "xml"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
