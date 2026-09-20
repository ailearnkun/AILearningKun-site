// Directory data for English blog posts. Mirrors the Indonesian setup:
// clean URLs and article-aware language switching via `translationKey`.
module.exports = {
  layout: "layouts/post.njk",
  tags: ["posts"],
  lang: "en",
  permalink: "/en/blog/{{ page.fileSlug }}/",
  eleventyComputed: {
    altUrl: (data) => {
      const key = data.translationKey;
      if (!key) return "/blog/";
      const target = data.lang === "id" ? "en" : "id";
      const match = (data.collections?.posts || []).find(
        (p) => p.data?.translationKey === key && (p.data?.lang || "id") === target
      );
      return match ? match.url : target === "en" ? "/en/blog/" : "/blog/";
    },
  },
};
