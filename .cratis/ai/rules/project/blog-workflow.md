---
applyTo: "**/*"
---

## Blog workflow

1. Write posts with the `.agents/skills/write-blog-post` skill; review drafts with `.agents/skills/review-blog-post`.
2. One post per file in `src/content/docs/blog/`, frontmatter `authors` referencing keys in `src/data/authors.mjs` (`einar`, `sindre`, `cratis-team`). Posts carry the author's personal voice; the byline and signature block render automatically.
3. Claims about Cratis products must be true of released, public behavior and link to <https://cratis.io>. Links to the documentation site are absolute URLs — this is a separate site.
4. Verify locally: `npm install && npm run build` must pass; `npm run dev` to preview. RSS is at `/rss.xml`; sitemap and `robots.txt` ship with the build.
5. Open a pull request. **Humans review and merge.** Merging to `main` deploys automatically; nothing else deploys.
