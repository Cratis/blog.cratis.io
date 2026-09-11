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

1. Author and revise with [write-blog-post](../.agents/skills/write-blog-post/SKILL.md). Identify the genre, reader, and intended message. For revisions, start from the original post and the user's feedback, not an intervening AI rewrite.
2. One post per file in `src/content/docs/blog/`, frontmatter `authors` referencing keys in `src/data/authors.mjs` (`einar`, `sindre`, `cratis-team`). Posts carry the author's personal voice; the byline and signature block render automatically.
3. Build the evidence alongside the content: released public sources for product claims, exact-snippet compilation for runnable examples, and runtime assertions for the behavior demonstrated. The writing skill defines these distinct evidence levels.
4. Review the **whole resulting post** with [review-blog-post](../.agents/skills/review-blog-post/SKILL.md), including a reader walkthrough. This is required after substantive revisions as well as for new posts; a diff-only review is insufficient.
5. For content changes, use the locked dependencies (`npm ci`) and `npm run build`; preview the relevant pages, code, and navigation. A site build does not compile embedded samples or verify product claims. Rules-only changes need relevant instruction/configuration checks, not an application build. Production RSS is at `/rss.xml`; the development server still uses `/blog/...`.
6. Report what was fixed, which checks actually ran, and any remaining findings. Commit, push, or open a pull request only when requested. **Humans review and merge.** Merging to `main` deploys automatically; nothing else deploys.

## Editorial foundation

These are the defaults for all blog content; the local skills turn them into authoring steps and review gates:

- **Preserve editorial intent.** The author's original thesis, opening, tone, emphasis, and recognizable phrasing are the baseline. Fix factual errors and reader obstacles locally. Do not substitute a different argument, generic lesson, caution-first stance, or scenario template without an explicit request. Review every diff hunk against the original; revert changes that have no purpose beyond rewriting in the assistant's preferred style.
- **Support the post's actual purpose.** A tutorial, mechanism explainer, opinionated comparison, and concise ecosystem showcase are different forms. Improve each on its own terms. A companion post can point to a separate comparison; an overview need not become an application walkthrough.
- **Help the intended reader.** Clarify unfamiliar terms and important steps where needed, with useful next steps and supporting links. Reader review should improve how the existing message comes across, not replace it. If a necessary technical correction conflicts with the central argument, raise it with the author.
- **Use evidence without turning it into boilerplate.** Product claims must match released, public behavior and link to the relevant documentation on <https://cratis.io>, supplemented by release sources where necessary. Keep evidence records under `.ai-work/`; put only useful sources and verification limits in the article. Never inflate "compiled" into "verified end-to-end".
- **Keep the author's voice.** Preserve personality, rhythm, and confident observations. Do not flatten the writing into generic instructional prose or add caveats to every paragraph. Correct specific misleading claims; do not treat expressive phrasing as a defect. Omit irrelevant roadmap asides and label experimental functionality plainly when it matters.
- **Keep prose version-independent.** Use product names without version numbers in titles, excerpts, and general explanations. Exact versions belong in setup and a compact tested-environment note, except when a release-specific change or migration is the subject. Release-pinned evidence links remain appropriate.
- **Make readiness an evidence-based decision.** A post is ready for human review only after its reader walkthrough and applicable technical, evidence, voice, and rendering checks have no unresolved blockers. A wording cleanup or successful build alone does not meet that threshold. State unavailable checks and distinguish non-blocking limitations from unresolved defects.

### Demonstrated stack

Every .NET example targets .NET 10 (`net10.0`) and is verified with the current .NET 10 SDK. Chronicle examples use the latest mutually compatible stable public packages and images available when written or materially revised. Resolve these from their release sources, not from an older article or an unverified local installation.

This is an implementation and verification rule, not a request to repeat release numbers in the prose. Pin packages, SDK selection, and executable container commands for reproduction. Record the image digest and **observed** server version; assert that it matches the stated baseline. Packages and image variants may finish publishing at different times. Do not silently mix releases or present a moving tag as an immutable pin.

## Local AI work artifacts — `.ai-work/` only

AI-assisted sessions produce working artifacts: plans, handover documents, session notes, continuation prompts, status boards, scratch analyses, research dumps. These are **work records, not documentation**:

- Create every such artifact inside **`.ai-work/`** at the repository root — never at the repository root itself, never under documentation folders, never anywhere else.
- `.ai-work/` is gitignored and must stay untracked. Never commit anything inside it, never `git add -f` anything inside it, and never remove the ignore entry.
- These artifacts must never enter git history or reach GitHub — not on any branch. If you find an unrelated tracked work record, report its path and obtain explicit authorization before moving it into `.ai-work/`, removing it from tracking, or making a dedicated cleanup commit. Discovery alone does not authorize unrelated changes or a commit.
- A genuine follow-up that must survive the session is **not** a work record — suggest opening a GitHub issue for it (or open one when asked) so future work is tracked where everyone can see it, instead of leaving a planning file behind.
- Knowledge that must outlive the session belongs in the repository's documentation structure through normal review, not in a work record.

## AI-assisted development

This repository uses the Cratis AI contract:

- **`.cratis/ai.json`** records the focused subscription:
  - `cratis/documentation` — shared documentation-writing guidance;
  - `cratis/application/chronicle-dotnet` — Chronicle's .NET client, event/projection/reactor modeling, concepts, and specification guidance for the runnable examples;
  - `cratis/engineering/typescript` — maintainer guidance for the Astro site code.
  These profiles do not make the blog an application repository. Load the guidance relevant to the post or code being changed; do not scaffold unrelated application layers or turn examples into framework catalogs.
- **`.cratis/PROJECT.md`** (this file) is the canonical project context; the root `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` are minimal bootstraps that point here and do nothing else.
- There is **no local AI corpus and no generated tool adapters** in this repository. Shared skills arrive through the Cratis AI marketplace plugins (Claude Code, Codex, GitHub Copilot, Cursor, and Pi are installable today — see the [harness guide](https://www.cratis.io/ai/harnesses/)).

For contributors:

1. Install the Cratis plugin for your harness once (per the harness guide); it uses the subscription to select shared guidance. The JSON declaration alone is not proof that a plugin is installed or that a running session has reloaded it. The local blog skills remain explicit entry points through the links above. If shared guidance is unavailable, report that gap and use released documentation, source inspection, and native verification rather than guessing APIs or installing a second setup as a side effect.
2. General, reusable improvements are proposed in [`Cratis/AI`](https://github.com/Cratis/AI) — never copied into, or synchronized from, this repository. Keep blog-specific editorial policy here and its procedures in the local blog skills; do not create a competing foundation or duplicate shared product guidance.
3. Repository-specific facts and conventions belong in this file; repository-local skills live under `.agents/skills/`.
4. AI session work records (plans, handovers, session notes, scratch analyses) stay in the untracked `.ai-work/` folder and never enter git; a durable follow-up becomes a GitHub issue.
