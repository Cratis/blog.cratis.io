---
applyTo: "**/*"
---

## Layout

- `astro.config.mjs` — site config; `site` is `https://blog.cratis.io`. The blog lives at the site root: starlight-blog still builds under its required `/blog` prefix, and `src/integrations/root-blog-urls.ts` relocates the output (`/blog/<slug>` → `/<slug>`, landing at `/`, RSS at `/rss.xml`) and emits permanent redirects for every old `/blog/*` URL.
- `src/content/docs/blog/` — the posts (Markdown/MDX with `starlight-blog` frontmatter; `excerpt` feeds the landing cards).
- `src/data/authors.mjs` — author registry: byline data for `starlight-blog` plus each author's personal `signature` text and the `picture` used on landing cards.
- `src/routeData.ts` — route middleware that strips docs chrome everywhere: no sidebar, no table of contents, no docs-style footer pagination.
- `src/integrations/root-blog-urls.ts` — build-time integration that moves the built blog from `/blog/*` to `/*` and permanently redirects the old URLs (instant meta refresh + canonical + noindex, the strongest signal GitHub Pages can serve). Runs only on builds; `npm run dev` still serves `/blog/*`.
- `src/components/Head.astro` — brand-font loading (no cold-load swap reflow), mirrored from the documentation site.
- `src/components/Header.astro` — editorial masthead: logo, Blog/cratis.io links, social icons (GitHub, Discord, RSS), theme switch.
- `src/components/MarkdownContent.astro` — renders the blog landing as a hero plus large post cards; delegates other routes to `starlight-blog`.
- `src/components/PostCard.astro` — one landing card: date, reading time, title, excerpt, author byline with avatar, tag links.
- `src/components/Footer.astro` — renders the author signature block below each post.
- `src/styles/cratis.css` — the Cratis brand theme, adapted from the documentation site, plus the editorial layout (hero, cards, byline, tag pills); keep the brand pieces visually in sync.
- `public/CNAME` — the `blog.cratis.io` custom domain; must ship in the build output.
- `.github/workflows/pages.yml` — builds on pushes and pull requests; deploys to GitHub Pages from `main` only.
