import { EleventyHtmlBasePlugin } from "@11ty/eleventy";

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
