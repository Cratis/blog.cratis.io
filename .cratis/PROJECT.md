# blog.cratis.io — project context

This repository is the **Cratis blog**, published at <https://blog.cratis.io>. It is a standalone Astro + Starlight site using the `starlight-blog` plugin, deliberately separate from the documentation site (<https://cratis.io>, built from the `Cratis/Documentation` repository) while mirroring its visual identity.

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

## Blog workflow

1. Write posts with the `.agents/skills/write-blog-post` skill; review drafts with `.agents/skills/review-blog-post`.
2. One post per file in `src/content/docs/blog/`, frontmatter `authors` referencing keys in `src/data/authors.mjs` (`einar`, `sindre`, `cratis-team`). Posts carry the author's personal voice; the byline and signature block render automatically.
3. Claims about Cratis products must be true of released, public behavior and link to <https://cratis.io>. Links to the documentation site are absolute URLs — this is a separate site.
4. Keep the demonstrated stack current at publication: every .NET example targets .NET 10 (`net10.0`) and is verified with the current .NET 10 SDK, while every Chronicle package, image, or tool shown uses the latest compatible stable public release available when the post is written or materially revised. This is an implementation and verification rule, not a prose-branding rule: use unversioned product names in titles, excerpts, and general explanations. Put exact versions in reproducible setup commands and a compact tested-environment note; mention a version in prose only when a release-specific behavior or migration is the subject. Keep release-pinned source links where they support evidence. When a moving container tag is necessary, also record its digest and the resolved server version from the verified run.
5. Verify locally: `npm install && npm run build` must pass; `npm run dev` to preview. RSS is at `/rss.xml`; sitemap and `robots.txt` ship with the build.
6. Open a pull request. **Humans review and merge.** Merging to `main` deploys automatically; nothing else deploys.

## Local AI work artifacts — `.ai-work/` only

AI-assisted sessions produce working artifacts: plans, handover documents, session notes, continuation prompts, status boards, scratch analyses, research dumps. These are **work records, not documentation**:

- Create every such artifact inside **`.ai-work/`** at the repository root — never at the repository root itself, never under documentation folders, never anywhere else.
- `.ai-work/` is gitignored and must stay untracked. Never commit anything inside it, never `git add -f` anything inside it, and never remove the ignore entry.
- These artifacts must never enter git history or reach GitHub — not on any branch. If you find an unrelated tracked work record, report its path and obtain explicit authorization before moving it into `.ai-work/`, removing it from tracking, or making a dedicated cleanup commit. Discovery alone does not authorize unrelated changes or a commit.
- A genuine follow-up that must survive the session is **not** a work record — suggest opening a GitHub issue for it (or open one when asked) so future work is tracked where everyone can see it, instead of leaving a planning file behind.
- Knowledge that must outlive the session belongs in the repository's documentation structure through normal review, not in a work record.

## AI-assisted development

This repository uses the Cratis AI contract:

- **`.cratis/ai.json`** records the subscription — `cratis/documentation` plus the `cratis/engineering/typescript` maintainer cell for the Astro site code.
- **`.cratis/PROJECT.md`** (this file) is the canonical project context; the root `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` are minimal bootstraps that point here and do nothing else.
- There is **no local AI corpus and no generated tool adapters** in this repository. Shared skills arrive through the Cratis AI marketplace plugins (Claude Code, Codex, GitHub Copilot, Cursor, and Pi are installable today — see the [harness guide](https://www.cratis.io/ai/harnesses/)).

For contributors:

1. Install the Cratis plugin for your harness once (per the harness guide); the subscribed profiles' skills then load automatically when tasks match.
2. General, reusable improvements are proposed in [`Cratis/AI`](https://github.com/Cratis/AI) — never copied into, or synchronized from, this repository.
3. Repository-specific facts and conventions belong in this file; repository-local skills live under `.agents/skills/`.
4. AI session work records (plans, handovers, session notes, scratch analyses) stay in the untracked `.ai-work/` folder and never enter git; a durable follow-up becomes a GitHub issue.
