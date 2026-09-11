---
name: write-blog-post
description: Writes or substantially revises Cratis blog posts — technical tutorials, engineering explainers, comparisons, essays, and ecosystem tours. Requires a concrete reader outcome, source-backed claims, exact-snippet verification, honest limits, and per-author voice. Use review-blog-post for reviewing an existing draft.
---

# Write a Cratis blog post

## Inputs

Identify before writing:

- the genre: tutorial, mechanism explainer, comparison, essay, or ecosystem tour;
- the topic and the one central argument or mechanism the post explains;
- the primary reader (a developer evaluating or using event sourcing, CQRS, or Cratis) and the decision or mental model the post improves for them;
- the author: `einar`, `sindre`, or `cratis-team` (see per-author voice below);
- the evidence the post depends on: released, publicly verifiable behavior of Cratis products, public standards, or the author's own verifiable experience.

If the author is unknown, ask. Do not invent an author or attribute experience to a person who did not have it. Read `.cratis/PROJECT.md` for current repository conventions before drafting.

## 1. Establish the post contract

A post earns publication only when it has:

- **one** primary reader and **one** central argument — split multi-argument material into multiple posts;
- independent value: a reader who never adopts Cratis should still learn something useful;
- the strongest counterargument or trade-off addressed honestly, not strawmanned;
- a narrowly earned Cratis connection — Cratis appears where it genuinely answers the problem; a deliberately scoped ecosystem tour may map products, but must explain their boundaries and relationships rather than merely list them;
- a practical conclusion: what the reader can do next.

Write down the reader's concrete outcome before drafting: "After reading, you can ___ because you understand ___." Use the genre to deliver it:

| Genre | Required substance |
| --- | --- |
| Tutorial | A runnable outcome, explicit prerequisites and filenames, observable checkpoints, a failure path, and the boundary between a demo and production. |
| Mechanism explainer | Trace one concrete input through the components to its output. Explain responsibility, state, failure, and trade-offs; a list of APIs is not an explanation. |
| Comparison | A real decision scenario, equivalent evaluation criteria, specific strengths and limitations for each candidate, and sources at named versions. Separate a product from its ecosystem. |
| Essay | One defensible thesis, evidence, and the strongest plausible objection. Do not manufacture a failing "obvious approach" just to create an opening. |
| Ecosystem tour | A reader journey through the relevant products, what is optional, who owns which responsibility, and compatibility/release limits. |

Titles and excerpts must promise only what the body delivers. "How the contract works" needs a concrete contract example or interaction trace, not a file count and links. "An honest comparison" needs substantive, symmetric comparison, not repeated assurances of fairness.

## 2. Claim safety

Every factual claim about a Cratis product must be true of what is **released and public today**:

- Describe only shipped, documented behavior. Link to the page on <https://cratis.io> that documents it.
- Experimental or early-development surfaces (for example the model-first layer) must be labeled as such in the same sentence that introduces them.
- Omit unreleased products and roadmap asides unless they are necessary to the reader's decision. When relevant, state availability plainly (for example, "experimental" or "not yet published") without implying a release promise. Do not add boilerplate such as "no commitment implied".
- Licensing claims: everything Cratis publishes today is MIT licensed — do not promise future licensing.
- Never include customer names, private roadmap detail, internal metrics, security findings, or third-party proprietary material.
- Numbers need a source the reader can check; no source, no number.

### Establish evidence before prose

For consequential claims, record the claim, exact supporting passage or test, source URL/release, retrieval or execution date, and limitations. Small working evidence notes belong only under `.ai-work/`; reader-facing sources belong next to the relevant claim. A link to a homepage or a changing `main` branch is not release-specific evidence.

Keep these evidence levels separate:

- **Published:** a registry/release establishes that an artifact exists, not that all clients or providers interoperate with it.
- **Documented:** a cited passage establishes what the documentation says, not measured performance or behavior.
- **Compiled:** the exact reader-visible files built with named dependencies; this says nothing about runtime correctness.
- **Executed:** specific operations ran in a stated environment; console output alone is not an assertion of correctness.
- **Asserted:** observed state or behavior was checked against explicit expectations.

Never promote one level into another. Running a console quickstart does not re-verify a comparison matrix, test browser login, prove materialized database state, or establish every language client's compatibility. Do not write "everything was executed as written" unless the actual reader path was exercised, including setup and any claimed UI checks. Label output as illustrative or normalized when it is not a verbatim capture.

Read linked comparison tables and documentation, not just their titles. When a source and the proposed article refer to different versions, expose the mismatch and verify the new claims independently; do not relabel old evidence. Preserve original publication dates and add a visible revision/verification date when changing a release baseline.

When in doubt, weaken the claim until it is checkable, or cut it.

## 3. Keep the demonstrated stack current

Blog examples should show Cratis on the current platform, not preserve compatibility with an older baseline:

- Every .NET project and command targets .NET 10 (`net10.0`) and is verified with the current .NET 10 SDK. Do not present an older target framework as the default path.
- Immediately before publication, resolve every Chronicle package, image, and tool used by the post against its public registry or release page. Use the latest mutually compatible stable releases available at that time; do not copy version numbers from an older post or documentation example.
- Pin exact package versions in reproducible examples. Record the container manifest digest and observed server version, and use that digest in the executable command when claiming reproducibility. A digest in a table does not pin a command using a moving tag. Document and verify SDK selection as well.
- Keep the server and client on the same release where possible. Packages and container variants can finish publishing at different times: check the actual image's startup version against the recorded baseline, not just the newest release or tag name. Treat a mismatch as a failed verification. If versions must differ, explain and verify the compatibility rather than silently mixing them.
- If the example only works on an older or prerelease stack, stop and ask rather than weakening this rule without editorial approval.
- Keep titles, excerpts, and explanatory prose version-independent: write "Chronicle" and ".NET", not "Chronicle 18.1.3" and ".NET 10". Current software belongs in the implementation, not repetitive release branding. Put exact versions and a verification date in setup instructions or a compact tested-environment note. Only discuss versions in prose when a release-specific behavior or migration is the point. Avoid "latest stable when this post was revised" asides and incidental counts that age without helping the explanation. Release-pinned evidence links remain appropriate.
- Distinguish Microsoft's **.NET SDK** (compiler/build tools) from the **Chronicle client SDK for .NET**. A version number must never blur which product a sentence describes.
- Version currency does not establish integration compatibility. Independently versioned clients, tools, storage providers, and experimental products need their own evidence before claiming they work together.

## 4. Structure

Long-form posts follow this arc:

1. a specific problem or question the reader recognizes;
2. why the obvious approach persistently fails;
3. one mechanism, model, or decision frame that resolves it;
4. trade-offs, anti-fit cases, and the strongest counterargument;
5. evidence and its limits — say what you do not know;
6. the earned Cratis relationship;
7. a practical conclusion with next steps.

Use descriptive headings (`##`), connected paragraphs, and code or diagrams where they carry weight. Do not target an arbitrary length; the post is done when the argument is complete.

## 5. Per-author voice

Match the byline to the voice — a post signed by a person must sound like that person:

- **`einar`** — the personal twist. Writes from decades of building developer platforms; opens with a story, a contrarian observation, or an apparent tangent that turns out to be the point. Strong opinions, held loosely, and openly revised in the text ("I used to believe X; here is what changed my mind"). First person singular. Allowed more color and humor than the other voices — but the argument underneath must be as rigorous as any other post.
- **`sindre`** — precise and grounded. Leads with the mechanism, shows the code or the wire contract, and is explicit about evidence and its limits. Skeptical of hype, including Cratis' own. First person singular, sparing with adjectives.
- **`cratis-team`** — the shared voice: plain, warm, direct. First person plural. Used for ecosystem tours, announcements-adjacent explainers, and posts with no single author. No manufactured personality.

Never fabricate anecdotes or testing experience for any byline, including `cratis-team`. A verified experience may be described as a neutral observation with its source; changing the byline does not make an invented story acceptable.

Prefer concrete mechanisms to slogans. Replace "the shortest honest path", "no complexity", or "a non-issue" with the actual setup, remaining responsibilities, and limits. Address retry behavior, eventual consistency, and operational costs where they affect the example rather than hiding them behind reassuring language.

## 6. Author the file

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

## 7. Verify the reader's path

Follow the local artifact lifecycle instructions before creating disposable verification outputs. Keep evidence separate from disposable build files; do not delete failed-run evidence before diagnosis.

1. **Extract, do not reconstruct.** Build the C# blocks directly from the Markdown into the named files. Use the article's project-creation and package commands in a fresh project with the stated SDK. No hidden global imports, extra dependencies, reordered statements, or manually improved sample. If the extraction needs a repair, fix the article and re-extract. All runnable blocks must be covered; label pseudocode explicitly.
2. **Assert semantics separately from compilation.** For a stateful tutorial, check the demonstrated transitions (for example: added → borrowed → returned), all relevant fields, append failures, and repeat-run behavior. A successful exit or plausible log is insufficient. If claiming persisted read models, inspect that storage path rather than substituting an on-demand replay query.
3. **Verify asynchronous behavior deliberately.** Use an observable completion condition with a bounded timeout for test verification; a fixed sleep is not readiness. Explain eventual consistency, retries and idempotency for side effects. Do not turn one successful run into a timing guarantee.
4. **Check operations.** Verify container readiness, stated endpoint/authentication, UI actions if claimed, and cleanup ownership. Avoid broad deletes, removing shared images, or asserting data is deleted without inspecting mounts/volumes. Distinguish a log-only reactor from actual notification delivery.
5. **Reconcile prose with results.** Recheck version sources and compatibility. State exactly which paths ran, which states were asserted, and what remains unverified. Retain concise reproduction evidence; never present a larger verification scope than the evidence supports.
6. **Check rendering separately.** `npm run build` validates the site, not C# or product claims. Preview byline, signature, tags, code formatting and links. Production routes are `/<slug>/`, `/tags/...`, `/authors/...`, and `/rss.xml`; `npm run dev` still uses `/blog/...`. Check legacy redirects separately from the canonical pages.
7. **Run the review skill.** Re-read the final article against `review-blog-post`, including unchanged surrounding claims affected by an upgrade. Report blockers rather than concluding "ready" from build success.

## Output

The new or revised post under `src/content/docs/blog/`, plus an author entry only when needed. Report the checks performed, their exact scope, and unresolved findings. Keep session evidence under `.ai-work/`, untracked. Create commits or pull requests only when requested; a human reviews and merges, and deployment happens from `main`.

## Stop conditions

Stop and ask a human when: a required claim cannot be verified against released public behavior; the author's experience cannot be confirmed; the topic is a release announcement or customer case study requiring authorization; or the content depends on anything non-public. An unavailable runtime or UI check is an explicit verification gap, not permission to claim it passed.
