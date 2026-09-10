---
name: review-blog-post
description: Reviews a draft Cratis blog post (blog.cratis.io) against independent gates — argument, technical accuracy, claim safety, voice authenticity, structure, and repository conventions. Use when reviewing an existing draft or pull request; use write-blog-post when authoring a new post.
---

# Review a Cratis blog post

Review each gate independently. A strong pass on one gate never compensates for a failure on another; report every gate's result.

## Gate 1 — Argument

- Exactly one primary reader and one central argument.
- The post has independent value for a reader who never adopts Cratis.
- The strongest counterargument or trade-off is engaged honestly.
- The middle of the post is not a product catalog.

## Gate 2 — Technical accuracy

- Mechanisms are described correctly; code and wire-contract details match released behavior.
- Counterexamples and anti-fit cases are correct, not strawmen.
- Nothing presented as fact is actually speculation.

## Gate 3 — Claim safety

- Every product claim is true of released, public behavior and links to public documentation on <https://cratis.io>.
- Experimental surfaces are labeled in the sentence that introduces them; "coming soon" items state no commitment.
- No customer names, private roadmap detail, internal metrics, security findings, or third-party proprietary material.
- Every number has a checkable source.

## Gate 4 — Voice and authorship

- The byline matches the voice described in `write-blog-post` (einar: personal, story-driven, first person singular; sindre: precise, evidence-led; cratis-team: plain, first person plural).
- No fabricated personal experience. Signed posts contain only the signer's own anecdotes.
- The `authors` key exists in `src/data/authors.mjs`.

## Gate 5 — Structure and mechanics

- Frontmatter is complete: `title`, `date`, `authors`, `excerpt`, `tags`.
- Descriptive headings, connected prose, working links; Cratis documentation links are absolute (`https://cratis.io/...`).
- No manual signature in the body (the signature block renders automatically).
- Tags reuse existing vocabulary where possible.
- `npm run build` passes; the post renders correctly in `/blog/`, tag pages, the author page, and `/blog/rss.xml`.

## Output

A review that lists, per gate: pass, or the exact failures with file/line references and a suggested fix. Blocking failures (Gates 2–4) must be resolved before merge; a human always performs the merge.
