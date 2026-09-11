---
name: review-blog-post
description: Reviews Cratis blog drafts and pull requests for technical correctness, reproducibility, evidence quality, reader value, author voice, and repository conventions. Distinguishes compilation from behavior and verifies findings before recommending publication. Use write-blog-post for authoring or substantial rewriting.
---

# Review a Cratis blog post

Review each gate independently. A passing build or a correct version number never compensates for a misleading claim or an article that fails to teach its subject.

## Review procedure

1. Read `.cratis/PROJECT.md`, the original posts before AI edits, the full affected posts, the user's editorial feedback, and the entire diff. Review the reader-visible result, not only changed lines. Mark findings as introduced by the PR or pre-existing but exposed by the revision. Check every hunk for unintended changes of message, tone, emphasis, or scope; an accurate rewrite can still be an editorial regression.
2. Identify each post's genre and promised reader outcome using [write-blog-post](../write-blog-post/SKILL.md). An essay, tutorial, comparison, and ecosystem tour need different evidence and structure. Perform the reader walkthrough below before grading the gates.
3. Inventory consequential claims and runnable blocks. Fetch the specific cited passages and release sources for the claims being checked. Follow version-dependent calls into released implementation where documentation is insufficient. Never infer compatibility from a package existing or a shared repository name.
4. For each suspected issue, try to refute it: check surrounding caveats, prerequisites, source semantics, and actual verification evidence. Report only substantiated findings as defects; report missing evidence as an open question, not proof of a bug.
5. Remain read-only unless fixes are requested. Reuse relevant recorded test results with their scope and date; do not run application builds for a prose-only review or treat another run of Astro as a content review. If execution is necessary to settle a technical question, explicitly state that scope first.

## Reader walkthrough — mandatory for each affected post

Read the complete final post in order as the intended reader, without relying on private session context. Judge the outcome the author actually promised, not a different article you would prefer to write. A companion post can legitimately direct readers to its comparison or documentation. Ask:

1. **Why am I reading this?** Can I state the question it answers and what I will be able to do or decide?
2. **What must I know or have first?** Are prerequisites, unfamiliar terms, product boundaries, and required versus optional pieces introduced before they are used?
3. **Can I follow the explanation?** Does the post explain its subject at the promised depth, with useful links for further detail? Would a targeted clarification help without replacing the argument or structure?
4. **Can I recognize success and failure?** Does the post explain the result, what is asynchronous, and the limits of a demo or comparison? For a tutorial, can I place the files, run the commands, interpret the checkpoints, and clean up without guessing?
5. **What should I do next?** Does the conclusion suit the author's purpose—trying a sample, exploring a product, reading the companion comparison, or reconsidering an idea?

For each gap, identify where the reader gets stuck and a concrete change that would unblock them. A correct API reference, compiling sample, or independent review receipt does not substitute for this walkthrough. After fixes, reread the revised path and recheck affected evidence before changing the verdict.

## Gate 1 — Reader value and argument

- One primary reader and one central question, with an outcome the article actually delivers.
- The title and excerpt match the body. Flag missing explanations with a specific reader consequence, not a mandatory structure. A small example may resolve the gap without rewriting the post.
- Tutorials explain why the code works, show observable checkpoints, and distinguish demo shortcuts from production responsibilities.
- Comparisons apply equivalent criteria at equivalent product boundaries. Give competitors their relevant strengths; do not compare one library against the entire Cratis ecosystem or claim absence because a landing page omits a feature.
- Ecosystem tours explain what each product contributes; a concise product overview is a valid format. Do not require every tour to become a worked application tutorial or an argument for adopting fewer products.
- Distinguish the author's point of view from technical claims requiring evidence. Do not invent objections or manufacture a failing alternative; do not erase an industry observation merely because it is opinionated.
- The conclusion follows the original argument. Further-reading links, a licensing section, or an invitation to evaluate the comparison may serve that purpose.

## Gate 2 — Technical accuracy, currency, and reproducibility

- Demonstrated .NET projects target `net10.0`; resolve the current .NET 10 SDK and Chronicle releases under the rule in `.cratis/PROJECT.md`.
- Version references have a check date and source. Server, client, tool, provider, and experimental integration compatibility is established separately from availability. A version upgrade requires rechecking semantics, not merely replacing literals.
- A reproducible command uses the recorded image digest and exact packages; a digest in prose alongside a moving `latest-development` command is not pinning. SDK-selection instructions match the claimed verification scope.
- Compile or execution evidence uses the relevant language's tools on the exact Markdown blocks assembled into the advertised files with the advertised setup commands. No hidden imports or dependencies and no hand-rewritten equivalent program. Pseudocode and non-runnable excerpts are clearly identified.
- Runtime evidence checks expected state transitions, failure handling, and repeat runs—not just console output or a zero exit code. All relevant fields are inspected; examples must not hide stale state by omitting fields from their output.
- Distinguish append acknowledgement, eventual processing, on-demand replay queries, persisted read models, reactor execution, and actual external side effects. Do not claim one was demonstrated by testing another.
- Fixed sleeps and startup banners are not readiness guarantees. Check that asynchronous verification uses bounded observable conditions and that prose acknowledges timing and retry limits.
- Side-effect examples state their demo scope and relevant retry/idempotency implications. A console log is not notification delivery or proof of exactly-once execution.
- Operational instructions have accurate TLS/authentication scope and safe, owned cleanup. Check container mounts/volumes before promising that deleting the container deletes all data.
- Technical nouns are precise: Microsoft's .NET SDK is not Chronicle's client SDK for .NET; language-neutral transport does not by itself establish client feature parity or absence of platform-specific wire encodings.
- Protocol explainers establish which definitions are authoritative, what is generated from what, and any language-specific packaging exceptions. Explain the actual compatibility acceptance rule (including permitted additive changes), not a guessed version-equality rule.

## Gate 3 — Claim safety and evidence

- Each consequential product claim has a supporting public documentation passage on <https://cratis.io>, supplemented by release-tagged source or registry evidence where necessary. A homepage link is not proof of a specific capability.
- Separate **published**, **documented**, **compiled**, **executed**, and **asserted** evidence. Use the definitions in `write-blog-post`; never upgrade one into another in the prose or review summary.
- "We verified", "executed as written", "current", and "rechecked" statements are supported at precisely that scope. One successful quickstart does not validate a comparison matrix, browser workflow, or all language clients.
- Sources and the article use compatible baselines. If a live comparison page still pins an older release, the post must not imply that page validates the newer one. Read the page, not just the link label.
- Output is labeled illustrative/normalized when it is not a verbatim capture. Revision and verification dates distinguish new evidence from the original publication date.
- Experimental surfaces are labeled at introduction. Omit irrelevant roadmap asides; where necessary, describe availability plainly without promises or "no commitment implied" boilerplate. Check idiomatic client availability separately from generated contracts.
- No private customer details, roadmap commitments, internal metrics, security findings, or proprietary third-party material.
- Numbers have checkable sources and a reason to be present. A correct file count is not evidence of interoperability or an explanation of a mechanism.

## Gate 4 — Voice and authorship

- The byline matches `write-blog-post`: einar is personal and story-driven; sindre is precise and evidence-led; cratis-team is plain and direct.
- No fabricated anecdotes or test experience, including under `cratis-team`. Changing the byline does not legitimize invented experience.
- The `authors` key exists in `src/data/authors.mjs`.
- Titles, excerpts, and general explanations use unversioned product names. Exact versions belong in reproducible setup and tested-environment notes, not product introductions or "latest stable when revised" asides. Allow version-specific prose only when explaining a release-specific behavior or migration; retain release-pinned evidence links. Verify the demonstrated stack is current separately from this prose check.
- Preserve the original thesis, opening, tone, rhythm, and recognizable phrasing unless a requested change or a verified defect requires an edit. Do not replace an industry observation with a generic prescription, or confident writing with repetitive caveats. A phrase is not a defect just because it would not appear in your own draft.
- Every rewrite hunk has a concrete justification. Technical fixes do not authorize new framing, scenarios, titles, or conclusions. If the central argument cannot survive a necessary factual correction, flag that conflict for the author rather than silently choosing a new one.

## Gate 5 — Structure and repository mechanics

- Frontmatter includes `title`, `date`, `authors`, `excerpt`, and `tags`; preserve original publication dates and make substantive revision dates visible.
- Descriptive headings, connected prose, clear code filenames, and links whose destinations support the linked text. Documentation links use absolute `https://cratis.io/...` URLs.
- No manual signature; author blocks render automatically. Reuse existing tags.
- Record site-build/render evidence separately from sample and claim evidence. Report existing warnings accurately; do not say "no warnings" when the gate only passed.
- Production pages are `/<slug>/`, `/tags/...`, `/authors/...`, and `/rss.xml`. The development server uses `/blog/...`; legacy `/blog/*` redirects are not the canonical production content.

## Output and publication decision

Lead with the most consequential findings, not a build-success summary. Each finding needs:

- severity and whether it was introduced or retained;
- exact file/line references and the problematic claim or code;
- evidence, reader consequence, and a concrete suggested correction;
- a way to verify the correction.

Then list each gate as **pass**, **fail**, or **unverified**, with the reason. Within a gate, mark a check **not applicable** only with an explicit reason (for example, a conceptual essay with no runnable sample needs no compilation); do not skip reader value or claim accuracy on that basis. Report checked and unchecked scope, including whether verification was a source inspection, compilation, runtime assertion, or browser check. Do not manufacture failures merely to fill every gate or issue a pass for work not inspected.

Distinguish **findings identified**, **fixes applied**, and **fixes verified** in the final status. A review report is not a repair, and a narrower follow-up must not silently close unrelated blockers. Reserve "ready for human review" for the threshold in `.cratis/PROJECT.md`; otherwise name the remaining blockers or verification gaps.

Technical/evidence failures block publication. So do fabricated authorship and a materially misleading title or central argument. Smaller style issues may remain non-blocking; name them as such. A human performs the merge. Reviewing does not authorize editing posts, committing changes, posting a PR review, or merging.
