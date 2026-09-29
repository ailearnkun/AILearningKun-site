import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://ailearnkun.my.id',
  output: 'static',
  build: {
    assets: 'assets',
  },
  integrations: [mdx()],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
});
