---
name: write-blog-post
description: Drafts a new post for the Cratis blog (blog.cratis.io) — essays, engineering explainers, and points of view about event sourcing, CQRS, and the Cratis stack. Covers structure, claim safety, per-author voice, frontmatter, and repository conventions. Use when writing or substantially rewriting a blog post; use review-blog-post for reviewing an existing draft.
---

# Write a Cratis blog post

## Inputs

Identify before writing:

- the topic and the one central argument or mechanism the post explains;
- the primary reader (a developer evaluating or using event sourcing, CQRS, or Cratis) and the decision or mental model the post improves for them;
- the author: `einar`, `sindre`, or `cratis-team` (see per-author voice below);
- the evidence the post depends on: released, publicly verifiable behavior of Cratis products, public standards, or the author's own verifiable experience.

If the author is unknown, ask. Do not invent an author or attribute experience to a person who did not have it.

## 1. Establish the post contract

A post earns publication only when it has:

- **one** primary reader and **one** central argument — split multi-argument material into multiple posts;
- independent value: a reader who never adopts Cratis should still learn something useful;
- the strongest counterargument or trade-off addressed honestly, not strawmanned;
- a narrowly earned Cratis connection — Cratis appears where it genuinely answers the problem, never as a catalog of everything Cratis ships;
- a practical conclusion: what the reader can do next.

## 2. Claim safety

Every factual claim about a Cratis product must be true of what is **released and public today**:

- Describe only shipped, documented behavior. Link to the page on <https://cratis.io> that documents it.
- Experimental or early-development surfaces (for example the model-first layer) must be labeled as such in the same sentence that introduces them.
- "Coming soon" items state that no commitment is implied.
- Licensing claims: everything Cratis publishes today is MIT licensed — do not promise future licensing.
- Never include customer names, private roadmap detail, internal metrics, security findings, or third-party proprietary material.
- Numbers need a source the reader can check; no source, no number.

When in doubt, weaken the claim until it is checkable, or cut it.

## 3. Structure

Long-form posts follow this arc:

1. a specific problem or question the reader recognizes;
2. why the obvious approach persistently fails;
3. one mechanism, model, or decision frame that resolves it;
4. trade-offs, anti-fit cases, and the strongest counterargument;
5. evidence and its limits — say what you do not know;
6. the earned Cratis relationship;
7. a practical conclusion with next steps.

Use descriptive headings (`##`), connected paragraphs, and code or diagrams where they carry weight. Do not target an arbitrary length; the post is done when the argument is complete.

## 4. Per-author voice

Match the byline to the voice — a post signed by a person must sound like that person:

- **`einar`** — the personal twist. Writes from decades of building developer platforms; opens with a story, a contrarian observation, or an apparent tangent that turns out to be the point. Strong opinions, held loosely, and openly revised in the text ("I used to believe X; here is what changed my mind"). First person singular. Allowed more color and humor than the other voices — but the argument underneath must be as rigorous as any other post.
- **`sindre`** — precise and grounded. Leads with the mechanism, shows the code or the wire contract, and is explicit about evidence and its limits. Skeptical of hype, including Cratis' own. First person singular, sparing with adjectives.
- **`cratis-team`** — the shared voice: plain, warm, direct. First person plural. Used for ecosystem tours, announcements-adjacent explainers, and posts with no single author. No manufactured personality.

Never fabricate personal anecdotes for a signed post. If the story is not the author's, it belongs in a `cratis-team` post as a neutral observation.

## 5. Author the file

Create `src/content/docs/blog/<kebab-case-slug>.md` (or `.mdx` when components are needed):

```markdown
---
title: The post title
date: YYYY-MM-DD
authors: einar # or sindre, cratis-team, or a YAML list for co-authored posts
excerpt: One or two sentences shown in the post list and RSS feed.
tags:
  - one-or-more-tags
---
```

Conventions:

- `authors` keys must exist in `src/data/authors.mjs`; add a new author there (with a signature) before referencing them.
- Reuse existing tags where possible (check other posts) before minting new ones.
- Links to Cratis documentation are absolute (`https://cratis.io/...`) — the blog is a separate site.
- The author signature block and byline render automatically; do not sign the post in the body text.

## 6. Verify

- `npm run build` passes with no warnings about this post.
- Preview with `npm run dev`: byline, signature block, tags, and reading time render; all links resolve.
- The post appears in `/blog/`, its tag pages, its author page, and `/blog/rss.xml`.

## Output

A single new file under `src/content/docs/blog/`, plus (only when adding an author) an entry in `src/data/authors.mjs`. Open a pull request; a human reviews and merges, and deployment happens from `main`.

## Stop conditions

Stop and ask a human when: the post needs a claim that cannot be verified against released public behavior; the author's experience cannot be confirmed; the topic is a release announcement, tutorial, or case study rather than an essay or explainer; or the content depends on anything non-public.
