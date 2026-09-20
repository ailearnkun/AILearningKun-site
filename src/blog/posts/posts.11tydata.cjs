// Directory data for Indonesian blog posts.
// Drops the /posts/ segment from URLs and pairs each article with its
// translation (same `translationKey`) so the language switch is article-aware.
module.exports = {
  layout: "layouts/post.njk",
  tags: ["posts"],
  lang: "id",
  permalink: "/blog/{{ page.fileSlug }}/",
  eleventyComputed: {
    altUrl: (data) => {
      const key = data.translationKey;
      if (!key) return "/en/blog/";
      const target = data.lang === "id" ? "en" : "id";
      const match = (data.collections?.posts || []).find(
        (p) => p.data?.translationKey === key && (p.data?.lang || "id") === target
      );
      return match ? match.url : target === "en" ? "/en/blog/" : "/blog/";
    },
  },
};
