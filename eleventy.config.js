import { EleventyHtmlBasePlugin } from "@11ty/eleventy";
import { minify } from "html-minifier-terser";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

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

export default function (eleventyConfig) {
  // Copy static assets straight through
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

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
    });
  }

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
