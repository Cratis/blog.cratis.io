# cratis.github.io — Project Instructions

This repository is the **Cratis blog**, published at <https://blog.cratis.io>. It is a standalone Astro + Starlight site using the `starlight-blog` plugin, deliberately separate from the documentation site (<https://cratis.io>, built from the `Cratis/Documentation` repository) while mirroring its visual identity.

## Layout

- `astro.config.mjs` — site config; `site` is `https://blog.cratis.io`, the root redirects to `/blog`.
- `src/content/docs/blog/` — the posts (Markdown/MDX with `starlight-blog` frontmatter; `excerpt` feeds the landing cards).
- `src/data/authors.mjs` — author registry: byline data for `starlight-blog` plus each author's personal `signature` text and the `picture` used on landing cards.
- `src/routeData.ts` — route middleware that strips docs chrome everywhere: no sidebar, no table of contents, no docs-style footer pagination.
- `src/components/Head.astro` — brand-font loading (no cold-load swap reflow), mirrored from the documentation site.
- `src/components/Header.astro` — editorial masthead: logo, Blog/cratis.io links, social icons (GitHub, Discord, RSS), theme switch.
- `src/components/MarkdownContent.astro` — renders the blog landing as a hero plus large post cards; delegates other routes to `starlight-blog`.
- `src/components/PostCard.astro` — one landing card: date, reading time, title, excerpt, author byline with avatar, tag links.
- `src/components/Footer.astro` — renders the author signature block below each post.
- `src/styles/cratis.css` — the Cratis brand theme, adapted from the documentation site, plus the editorial layout (hero, cards, byline, tag pills); keep the brand pieces visually in sync.
- `public/CNAME` — the `blog.cratis.io` custom domain; must ship in the build output.
- `.github/workflows/pages.yml` — builds on pushes and pull requests; deploys to GitHub Pages from `main` only.

## Blog workflow

1. Write posts with the `.agents/skills/write-blog-post` skill; review drafts with `.agents/skills/review-blog-post`.
2. One post per file in `src/content/docs/blog/`, frontmatter `authors` referencing keys in `src/data/authors.mjs` (`einar`, `sindre`, `cratis-team`). Posts carry the author's personal voice; the byline and signature block render automatically.
3. Claims about Cratis products must be true of released, public behavior and link to <https://cratis.io>. Links to the documentation site are absolute URLs — this is a separate site.
4. Verify locally: `npm install && npm run build` must pass; `npm run dev` to preview. RSS is at `/blog/rss.xml`; sitemap and `robots.txt` ship with the build.
5. Open a pull request. **Humans review and merge.** Merging to `main` deploys automatically; nothing else deploys.

## Local AI work artifacts — `.ai-work/` only

AI-assisted sessions produce working artifacts: plans, handover documents, session notes, continuation prompts, status boards, scratch analyses, research dumps. These are **work records, not documentation**:

- Create every such artifact inside **`.ai-work/`** at the repository root — never at the repository root itself, never under documentation folders, never anywhere else.
- `.ai-work/` is gitignored and must stay untracked. Never commit anything inside it, never `git add -f` anything inside it, and never remove the ignore entry.
- These artifacts must never enter git history or reach GitHub — not on any branch. If you find an unrelated tracked work record, report its path and obtain explicit authorization before moving it into `.ai-work/`, removing it from tracking, or making a dedicated cleanup commit. Discovery alone does not authorize unrelated changes or a commit.
- A genuine follow-up that must survive the session is **not** a work record — suggest opening a GitHub issue for it (or open one when asked) so future work is tracked where everyone can see it, instead of leaving a planning file behind.
- Knowledge that must outlive the session belongs in the repository's documentation structure through normal review, not in a work record.
