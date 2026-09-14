---
applyTo: "**/*"
---

## Blog workflow

1. Write posts with the `.agents/skills/write-blog-post` skill; review drafts with `.agents/skills/review-blog-post`. For a revision, start from the published post and the author's feedback, not an intervening AI rewrite.
2. One post per folder in `src/content/docs/blog/<slug>/index.md`, frontmatter `authors` referencing keys in `src/data/authors.mjs` (`einar`, `sindre`, `cratis-team`, or a resolved GitHub author — see below). Posts carry the author's personal voice; the byline and signature block render automatically. Post-specific images live beside `index.md` in the same folder and are referenced with relative paths (`./cover.png`).
3. Claims about Cratis products must be true of released, public behavior and link to <https://cratis.io>. Links to the documentation site are absolute URLs — this is a separate site.
4. Build the evidence with the content: released public sources for product claims, compilation of the exact published snippets, and runtime assertions for the behavior demonstrated. Keep those evidence levels distinct — "it compiles" is not "it works", and one verified example does not verify a separate comparison page or every language client.
5. Review the whole resulting post, not only the diff, before calling it ready. A wording cleanup or a green build is not a review.
6. Verify locally: `npm install && npm run build` must pass; `npm run dev` to preview. RSS is at `/rss.xml`; sitemap and `robots.txt` ship with the build. Production pages are `/<slug>/`; the dev server still serves `/blog/...`.
7. Open a pull request. **Humans review and merge.** Merging to `main` deploys automatically; nothing else deploys.

### Preserve editorial intent

The author's thesis, opening, tone, emphasis and phrasing are the baseline. Fix factual errors and reader obstacles where they occur, and keep the rest.

- Do not swap in a different argument, a generic lesson, a caution-first stance or a scenario template because it reads more like a "proper" technical article. An accurate rewrite that changes the message is still a regression.
- Reader-focused review improves how the author's argument lands; it is not licence to replace that argument.
- Check every diff hunk against the original and revert changes that serve no request, defect or concrete reading obstacle. If a necessary correction would break the central argument, say so and ask.

### Resolve the author from the requester's GitHub identity

When the person requesting a post is not already a key in `src/data/authors.mjs` (`einar`, `sindre`, `cratis-team`), resolve them as an author rather than defaulting to `cratis-team`:

1. **Get their GitHub username.** Ask if it is not already known from the conversation or environment.
2. **Resolve it against the public GitHub API**: `GET https://api.github.com/users/<username>` (no auth required for a public lookup).
   - **200** — the account exists. Use the response's `name` field as the author's display name; if `name` is empty, fall back to the `login` (username). The profile picture is `https://github.com/<username>.png?size=160`, and the profile link is `https://github.com/<username>`.
   - **404** — no such account. Use the username (or whatever name the requester gives) as plain text. Do **not** set `url` or `picture` — an author entry with no `url` renders as plain, unlinked text everywhere (starlight-blog's byline, the landing-page card, and the footer signature all condition on `url` being present). Never invent or guess a GitHub username to make a link appear.
3. **Add the entry to `src/data/authors.mjs`**, keyed by the GitHub username (or a slug of the given name if there is no account): `name` and, only if the account exists, `url` and `picture`. Ask the author for `title` and a short personal `signature` the same way an unknown author is asked for today — do not invent either.
4. Reference that key in the post's frontmatter `authors` field, the same as the existing authors.

This keeps every author link honest: a name is a link only when it actually resolves to a GitHub profile a reader can visit, never a guess.

### Demonstrated stack

Every .NET example targets .NET 10 (`net10.0`) and is verified with the current .NET 10 SDK. Chronicle examples use the latest mutually compatible stable public packages and images available when the post is written or materially revised, resolved from their release sources rather than copied from an older post.

This is an implementation rule, not a prose-branding rule:

- Titles, excerpts and general explanations use plain product names — "Chronicle" and ".NET", not "Chronicle 18.1.5" and ".NET 10". Put exact versions in the setup commands and a short tested-environment note, and mention a version in prose only when a release-specific behavior is the subject.
- Pin packages and SDK selection, and pin the container by digest in the command a reader actually runs. A digest in a table next to a moving tag is not a pin.
- Check the running server's reported version against the baseline: packages and image variants can finish publishing at different times, and a mismatch is a failed verification, not a detail.
- Distinguish Microsoft's .NET SDK from Chronicle's client SDK for .NET, and do not treat version currency as evidence that independently versioned pieces work together.
