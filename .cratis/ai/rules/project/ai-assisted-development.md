---
applyTo: "**/*"
---

## AI-assisted development

This repository uses the managed Cratis AI corpus.

- `.cratis/ai.json` selects `cratis/documentation`, `cratis/application/chronicle-dotnet` for the Chronicle examples the blog demonstrates, and `cratis/engineering/typescript` for the Astro site code. Those profiles do not make this an application repository: load the guidance relevant to the post or code being changed. Shared guidance is guidance, not evidence that an API shipped — verify against released documentation and sources.
- `.cratis/ai/rules/project.md` and the files in this directory are project-owned guidance shared by every configured harness.
- `.cratis/ai.manifest.json` records only Cratis-managed files and integrations; project rules and custom skills remain user-owned.
- Run `cratis ai status` before updates and review conflicts before using `--force`.
