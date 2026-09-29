import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    lang: z.string().optional(),
    translationKey: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
});

const blogEn = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/en/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    lang: z.string().optional(),
    translationKey: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
});

export const collections = { blog, blogEn };
