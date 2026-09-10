---
title: "From zero to first projection with an AI assistant"
date: 2026-09-10
authors: cratis-team
excerpt: The zero-to-first-projection walkthrough again — same store, same domain, same destination — but this time Claude Code does the typing, guided by the Cratis AI skills and connected to the live store through the Chronicle MCP server. Every step was executed against the versions it names.
tags:
  - chronicle
  - ai
---

A few weeks ago we published [a walkthrough](/event-sourcing-in-dotnet-with-chronicle/) that took a plain .NET console app from zero to a first projection: one Docker container, three events, a read model, a reactor. This post runs the same journey again with one difference — a human writes one prompt, and [Claude Code](https://claude.com/claude-code) does the typing.

That only works if the assistant knows the framework. Drop a general-purpose agent into a Cratis codebase and it guesses: invented handler classes, layered-style approximations, hand-written API clients nobody needs. [Cratis AI](https://cratis.io/ai/) closes that gap from two sides — skills that teach the assistant how to *build*, and operating tools that let it *inspect* a live store. This post uses both, and everything below was executed as written:

| Piece | Version |
| --- | --- |
| Claude Code | 2.1.220, with the `cratis` plugin (49 skills) from the `Cratis/AI` marketplace |
| Chronicle kernel container | `cratis/chronicle:18.1.0-development`, digest `sha256:71b70f7abb62cfbaeb30a08f8ffe7896731e381d89614ddfa67a51aff3c80fdf` (Chronicle Server 18.1.0.0) |
| Chronicle MCP server | `cratis/chronicle-mcp:1.2.0`, digest `sha256:32eae68fe2310e44b7d7ead97004873985689c86c3c0b2c077eac7c8e1fd546c` |
| Client package | [`Cratis.Chronicle`](https://www.nuget.org/packages/Cratis.Chronicle) 18.1.0 |
| Cratis CLI | 2.19.1 (Homebrew) |
| .NET SDK | 10.0.400 (`net10.0` target) |

## 1. Install the skills

The Cratis AI plugin is passive markdown: about fifty skills, each a `SKILL.md` your assistant loads when a task matches. No hooks, no executable code, nothing written into your project. For Claude Code, two commands:

```shell
claude plugin marketplace add Cratis/AI
claude plugin install cratis@cratis
```

`claude plugin details cratis@cratis` confirms what arrived: 49 skills with names like `cratis-chronicle-projection`, `cratis-chronicle-read-model`, and `cratis-chronicle-client-dotnet` — and zero hooks, agents, or MCP servers. The plugin declares a small always-on token cost for skill descriptions and loads a skill's full content only when a task matches it.

## 2. Run Chronicle and create the project

The store is the same one-container development image as [last time](/event-sourcing-in-dotnet-with-chronicle/):

```shell
docker run -d --name chronicle \
  -p 127.0.0.1:35000:35000 \
  cratis/chronicle:18.1.0-development
```

> **If port 35000 is busy.** On our machine another stack already owned 35000, so we ran this whole post against a remapped host port instead: `-p 127.0.0.1:35001:35000`, with `localhost:35001` in every connection string below. Nothing else changes.

The project is two commands — we deliberately kept the human's share of the work minimal:

```shell
dotnet new console --framework net10.0
dotnet add package Cratis.Chronicle --version 18.1.0
```

## 3. One prompt, one slice

Now the entire "build the feature" step, quoted verbatim as it was sent:

> A Cratis Chronicle development store is running locally (the development connection string points at localhost:35001). In this folder is a .NET 10 console project with the Cratis.Chronicle 18.1.0 package already referenced. Build the smallest complete event-sourced slice for a tiny library domain: events for a book being added, borrowed, and returned; a read model projected from those events with a boolean that flips on borrow/return and a borrower field that disappears when the book is returned; then a program that connects, registers everything, appends the three events for one book, and prints the read model. Follow the Cratis conventions. Build and run it, show me the actual output, and at the end list which Cratis skills you loaded for this task.

One prompt later, the slice existed — written, compiled, and already run against the store while you would still have been typing the first `using`. Three files, all conventionally Cratis-shaped:

```csharp
[EventType]
public record BookAdded(string Title, string Author);

[EventType]
public record BookBorrowed(string Borrower);

[EventType]
public record BookReturned;
```

```csharp
[FromEvent<BookAdded>]
[FromEvent<BookBorrowed>]
[FromEvent<BookReturned>]
public record Book(
    string Title = "",
    string Author = "",
    [property: SetValue<BookBorrowed>(true)]
    [property: SetValue<BookReturned>(false)]
    bool IsBorrowed = false,
    [property: SetFrom<BookBorrowed>(nameof(BookBorrowed.Borrower))]
    [property: ClearWith<BookReturned>]
    string? Borrower = default);
```

The details are what give the game away. `Borrower` is nullable *because `ClearWith` requires a nullable member* — a convention detail the model picked up from the skills, not something a generic agent tends to guess. Where our hand-written walkthrough used a fixed `Task.Delay` before querying, this program polls `GetInstanceById` until the projection catches up, and registers through `WaitForRegistration()` instead of assuming success. Asked afterward, it named the skills it loaded: `cratis-chronicle-client-dotnet`, `cratis-chronicle-read-model`, `cratis-chronicle-projection`, and `cratis-fundamentals-concept`.

Running it appends the three events and prints the read model flipping back and forth:

```text
Appended BookAdded + BookBorrowed (borrowed at sequence 7)
After borrow: The Hobbit by J.R.R. Tolkien, IsBorrowed=True, Borrower=Frodo Baggins
Appended BookReturned at sequence 8
After return: The Hobbit by J.R.R. Tolkien, IsBorrowed=False, Borrower=<none>
```

That is the build side: the assistant didn't just write code that looks right, it produced artifacts that follow the framework's actual contracts.

## 4. Teach the assistant your store

Building is half the loop. The other half is operating what you built, and Cratis ships two documented tools for that. The first is the Cratis CLI, made AI-aware:

```shell
cratis init
```

One command, and the project gains `CHRONICLE.md` — the CLI's whole command catalog in the assistant's context — plus instruction files and a `chronicle-diagnose` slash command. It configures the tools it detects (in our run, Claude Code got a `CLAUDE.md` and two slash commands; a second run in a Pi session generated `AGENTS.md` and a Pi skill instead). After a CLI upgrade, `cratis init --refresh` re-captures the catalog.

## 5. Ask the store questions

The second operating tool is the [Chronicle MCP server](https://cratis.io/chronicle-mcp/) — a containerized MCP endpoint straight into the running store. Adding it to Claude Code is one command:

```shell
claude mcp add chronicle -s project \
  -e Cratis__Chronicle__Mcp__ConnectionString="chronicle://chronicle-dev-client:chronicle-dev-secret@host.docker.internal:35000" \
  -- docker run -i --rm cratis/chronicle-mcp:1.2.0
```

Those are the development image's built-in client credentials; point the connection string at your server and swap in real credentials when you leave the development image.

Then, in plain language: *"list the event stores, show me what happened on the event source 'the-hobbit' in the Library store, and tell me the current state of that book."*

The answer is worth quoting, lightly abridged:

> - Event stores: **System, Library, default** (via the CLI — see the note below)
> - Observer `Library.Book` (Projection, Active, next event 9, last handled 8)
> - Read model `Library.Book` instance `the-hobbit`: `Title="The Hobbit", IsBorrowed=false`, last handled event 8
>
> **The Hobbit** is currently on the shelf — which I know from the `Library.Book` read model for key `the-hobbit`, whose observer has handled every event up to 8.

And now the honest wrinkle, because this is a blog post and not an ad: two of the MCP reads we tried failed with server-side errors against this exact version combination (MCP server 1.2.0, kernel 18.1.0). The useful part is what the assistant did next — it said so, and fell back to the Cratis CLI for those reads, because `CHRONICLE.md` had taught it the alternate path minutes earlier. Versions move and sometimes drift; an assistant that reports the gap and takes the documented second route is precisely the behavior you want when it happens. It is also why the operate-and-inspect boundary exists: the MCP server and the CLI read the log and manage observers and jobs, but changing application state still goes through commands and events. History stays honest.

## Other harnesses, same guidance

Nothing above is Claude-specific except the install command. The marketplace resolves the same canonical skill bytes for every host, so two tools on one team never see different guidance:

| Harness | Install |
| --- | --- |
| Claude Code | `claude plugin marketplace add Cratis/AI` → `claude plugin install cratis@cratis` |
| OpenAI Codex | `codex plugin marketplace add Cratis/AI` → `codex plugin install cratis@cratis` |
| GitHub Copilot | `copilot plugin marketplace add Cratis/AI` → `copilot plugin install cratis@cratis` |
| Cursor | resolves the same skills through its committed marketplace manifest |
| Pi (npm) | `pi install -l npm:@cratis/ai-fundamentals@0.10.0` — the Fundamentals subset today |

Kiro, Junie, and Gemini CLI are pending per-host review. The `cratis init` step writes instruction files for Claude Code, GitHub Copilot, Cursor, Windsurf, and Pi, so the operating half is harness-agnostic too.

## Teams and multiple harnesses

A solo developer with one tool can stop reading here — the plugin alone is the whole setup. For a repository shared by people *and* tools, the [team scenario](https://cratis.io/ai/scenarios/team-repository/) commits a three-file contract: `.cratis/PROJECT.md` (project facts, never credentials), `.cratis/ai.json` (which profiles, at which version, for which harnesses), and an `AGENTS.md` bootstrap pointing at them:

```json
{
    "schemaVersion": "1.0.0",
    "version": "1.0.0",
    "profiles": ["cratis/arc/csharp"],
    "harnesses": ["claude", "codex", "copilot", "pi"],
    "updatePolicy": "reviewed-pull-request",
    "projectContext": ".cratis/PROJECT.md"
}
```

The point of the neutral file is that nobody's editor settings become the source of truth: a new teammate — or a new AI tool — gets the same scope from the committed record, and an update is a reviewed pull request that bumps one pin. The [multiple-harnesses scenario](https://cratis.io/ai/scenarios/multiple-harnesses/) adds the rule that keeps tools from drifting apart: per-host locks stay in their own settings files, skills are passive, and no harness writes into another harness's configuration.

## Status, plainly

Every piece in this post is installable and runnable today, and everything above was executed against the pinned versions. Build with it, push on it, and tell us what breaks — that openness to feedback is deliberate, and it is how the workflow gets better.

## Clean up and where to go next

Remove the container and the scratch folder when you are done — event data lives in the container, so removing it removes the data:

```shell
docker rm -f chronicle
```

- [Cratis AI](https://cratis.io/ai/) — the overview, and the [getting-started](https://cratis.io/ai/getting-started/) page with one install block per host.
- The [agent harness guide](https://cratis.io/ai/harnesses/) — install, verify, and uninstall for every harness, including install commands for Claude Code, Codex, Copilot, Cursor, and Pi.
- [Chronicle MCP](https://cratis.io/chronicle-mcp/) — the operate-side capabilities, from observer recovery to causal traces.
- The original [hand-written walkthrough](/event-sourcing-in-dotnet-with-chronicle/) — same destination, and still the best way to see every moving part yourself.
