---
title: "From zero to first projection with an AI assistant"
date: 2026-09-10
authors: cratis-team
excerpt: The zero-to-first-projection walkthrough again — same store, same domain, same destination — but this time Claude Code does the typing, using the official .NET templates and the Cratis AI skills, with Arc commands carrying the full loop. Every step was executed against the versions it names.
tags:
  - chronicle
  - ai
---

A few weeks ago we published [a walkthrough](/event-sourcing-in-dotnet-with-chronicle/) that took a plain .NET console app from zero to a first projection: one Docker container, three events, a read model, a reactor. This post runs the same journey again with one difference — a human writes one short prompt, and [Claude Code](https://claude.com/claude-code) does the typing.

Like that walkthrough, this is .NET development: the slices here are C# on ASP.NET Core, with [Arc](https://cratis.io/arc/) carrying commands and queries and Chronicle carrying the event log. And this time we start from the official .NET templates rather than an empty folder, because the interesting question is not whether an assistant can write C# — it is whether it can write *your* conventions. [Cratis AI](https://cratis.io/ai/) closes that gap from two sides: skills that teach the assistant how to build, and operating tools that let it inspect a live store. This post uses both, and everything below was executed as written:

| Piece | Version |
| --- | --- |
| Claude Code | 2.1.220, with the `cratis` plugin (49 skills) from the `Cratis/AI` marketplace |
| Cratis.Templates | 1.2.0 — scaffolds with Arc 22.13.1 and Chronicle 18.1.0 |
| Chronicle kernel container | `cratis/chronicle:18.1.0-development`, digest `sha256:71b70f7abb62cfbaeb30a08f8ffe7896731e381d89614ddfa67a51aff3c80fdf` (Chronicle Server 18.1.0.0) |
| Chronicle MCP server | `cratis/chronicle-mcp:1.2.0`, digest `sha256:32eae68fe2310e44b7d7ead97004873985689c86c3c0b2c077eac7c8e1fd546c` |
| Cratis CLI | 2.19.1 (Homebrew) |
| .NET SDK | 10.0.400 (`net10.0` target) |

## 1. Install the skills and the templates

The Cratis AI plugin is passive markdown: about fifty skills, each a `SKILL.md` your assistant loads when a task matches. No hooks, no executable code, nothing written into your project:

```shell
claude plugin marketplace add Cratis/AI
claude plugin install cratis@cratis
```

The templates are an ordinary NuGet package:

```shell
dotnet new install Cratis.Templates
```

## 2. Scaffold the application

One command creates a complete full-stack application — ASP.NET Core with Arc, Chronicle for the event log, MongoDB for read models, and a React frontend with generated TypeScript proxies, arranged in vertical slices:

```shell
dotnet new cratis -n Library
cd Library
```

The template ships a sample feature with two slices, a `docker-compose.yml` that starts a local Chronicle development container (MongoDB bundled), and a build that compiles clean — zero warnings under the Cratis analyzers — with the TypeScript proxies regenerated on every build:

```shell
docker compose up -d
dotnet build
```

The sample `SomeModule/SomeFeature` is there to be learned from and then replaced. That replacement is the assistant's job.

## 3. One prompt, a few slices

Now the entire "build the feature" step, quoted verbatim as it was sent:

> Using Chronicle, let's create a few vertical slices in this project for a small library: adding a book to the shelves, borrowing it, and returning it. When borrowed, it should know who has it. Build the project and run the app to make sure it all works.

No package versions, no file paths, no architecture instructions — the assistant is expected to already know the conventions, because the skills carry them. It removed the sample module and replaced it with a `Books` feature containing exactly the slices the domain asked for: **AddBook**, **BorrowBook**, and **ReturnBook** — three command slices, one per behavior — plus a fourth, the **Book** read model projected from all three. It introduced the strongly-typed primitives first, the way the convention prescribes: `BookTitle` and `BookAuthor` as `ConceptAs<T>` value types, and `BookId` as an event-source identity:

```csharp
public record BookId(Guid Value) : EventSourceId<Guid>(Value)
```

The three command slices are plain records with a `Handle()` — no controllers, no route tables, no handler classes. Adding a book decides on a new identity and produces the event; borrowing and returning operate on an existing book's stream:

```csharp
[Command]
public record AddBook(BookTitle Title, BookAuthor Author)
{
    public (BookId, BookAdded) Handle()
    {
        var bookId = BookId.New();
        return (bookId, new(Title, Author));
    }
}

[EventType]
public record BookAdded(BookTitle Title, BookAuthor Author);
```

```csharp
[Command]
public record BorrowBook(BookId Id, BorrowerName Borrower)
{
    public BookBorrowed Handle() => new(Borrower);
}
```

The fourth slice is the read model — one Book, projected from the events of its stream, with the borrower set by the borrow event and cleared by the return:

```csharp
[ReadModel]
[FromEvent<BookAdded>]
public record Book(
    BookId Id,
    BookTitle Title,
    BookAuthor Author,
    [property: SetFrom<BookBorrowed>("Borrower")]
    [property: SetValue<BookReturned>(null)]
    BorrowerName? BorrowedBy)
```

Because the routes are generated from the slices, the full loop needs nothing but curl — add, borrow, and return a book over HTTP:

```bash
curl -X POST http://localhost:5000/api/books/add-book \
  -H "Content-Type: application/json" \
  -d '{"title":"The Hobbit","author":"J.R.R. Tolkien"}'
# → {"isSuccess":true, "response":"60e1a0c1-…"}

curl -X POST http://localhost:5000/api/books/borrow-book \
  -H "Content-Type: application/json" \
  -d '{"id":"60e1a0c1-…","borrower":"Frodo Baggins"}'
# → {"isSuccess":true}

curl -X POST http://localhost:5000/api/books/return-book \
  -H "Content-Type: application/json" \
  -d '{"id":"60e1a0c1-…"}'
# → {"isSuccess":true}
```

After the borrow, the read model holds `borrowedBy: "Frodo Baggins"`; after the return, it is `null` again. Three events in the log, one read model that always agrees with them, and every request in between handled by the conventions the template put in place — that is the full power of the stack, exercised entirely through one assistant-written feature. The frontend got its share too: the build regenerated typed TypeScript proxies and React dialogs for each command, so a UI can call `AddBook` with compile-time safety without a hand-written API client.

## 4. Teach the assistant your store

Building is half the loop. The other half is operating what you built, and Cratis ships two documented tools for that. The first is the Cratis CLI, made AI-aware:

```shell
cratis init
```

One command, and the project gains `CHRONICLE.md` — the CLI's whole command catalog in the assistant's context — plus instruction files and a `chronicle-diagnose` slash command for the tools it detects. After a CLI upgrade, `cratis init --refresh` re-captures the catalog.

## 5. Ask the store questions

The second operating tool is the [Chronicle MCP server](https://cratis.io/chronicle-mcp/) — a containerized MCP endpoint straight into the running store:

```shell
claude mcp add chronicle -s project \
  -e Cratis__Chronicle__Mcp__ConnectionString="chronicle://chronicle-dev-client:chronicle-dev-secret@host.docker.internal:35000" \
  -- docker run -i --rm cratis/chronicle-mcp:1.2.0
```

Then, in plain language: *"how many event stores are there, and what is the current state of the book with id `60e1a0c1-…` — on the shelf or borrowed, and by whom?"*

What happened next was the most interesting part of the whole exercise. With only the MCP server connected, the assistant **declined to call it** — the `cratis-chronicle-mcp-inspection` skill it carries gates MCP tooling behind verified evidence, and on this version combination the gate is closed. Governed skills that refuse rather than improvise are exactly what they are supposed to be.

After `cratis init` gave the project the CLI catalog, the same question got a complete answer through the CLI — lightly abridged from the actual reply:

> Three event stores: System, Library, default.
>
> The book `60e1a0c1-…` is **on the shelf**. From `cratis chronicle read-models get "Library.Books.Book" …`: the instance holds only `id`, `title`, `author` — no borrower. The observer `Library.Books.Book` is Active, has handled both events, 0 failed partitions.

The assistant read the read model, checked the observer's health, and interpreted the state *against the source model it had written itself* — `BorrowedBy` absent means returned or never borrowed. It is also a fair demo of how these tools relate: the MCP server and the CLI are operate-and-inspect tools — they read the log, watch observers, and manage jobs — while changes to application state still go through commands and events. History stays honest.

## Other harnesses, same guidance

Nothing above is Claude-specific except the install command. The marketplace resolves the same canonical skill bytes for every host, so two tools on one team never see different guidance:

| Harness | Install |
| --- | --- |
| Claude Code | `claude plugin marketplace add Cratis/AI` → `claude plugin install cratis@cratis` |
| OpenAI Codex | `codex plugin marketplace add Cratis/AI` → `codex plugin install cratis@cratis` |
| GitHub Copilot | `copilot plugin marketplace add Cratis/AI` → `copilot plugin install cratis@cratis` |
| Cursor | resolves the same skills through its committed marketplace manifest |
| Pi (npm) | `pi install -l npm:@cratis/ai-fundamentals` — the Fundamentals subset today |

Kiro, Junie, and Gemini CLI are pending per-host review. The `cratis init` step writes instruction files for Claude Code, GitHub Copilot, Cursor, Windsurf, and Pi, so the operating half is harness-agnostic too.

## Teams and multiple harnesses

A solo developer with one tool can stop reading here — the plugin and the templates alone are the whole setup. For a repository shared by people *and* tools, the [team scenario](https://cratis.io/ai/scenarios/team-repository/) commits a three-file contract: `.cratis/PROJECT.md` (project facts, never credentials), `.cratis/ai.json` (which profiles, at which version, for which harnesses), and an `AGENTS.md` bootstrap pointing at them:

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

Remove the containers and the scratch folder when you are done — event data lives in the container, so removing it removes the data:

```shell
docker compose down
```

- [Cratis AI](https://cratis.io/ai/) — the overview, and the [getting-started](https://cratis.io/ai/getting-started/) page with one install block per host.
- The [C# templates](https://github.com/cratis/templates) — the four templates this post started from, with their documentation.
- [Arc](https://cratis.io/arc/) — the CQRS application framework: commands, queries, validation, and proxy generation.
- The [agent harness guide](https://cratis.io/ai/harnesses/) — install, verify, and uninstall for every harness.
- The original [hand-written walkthrough](/event-sourcing-in-dotnet-with-chronicle/) — same destination, and still the best way to see every moving part yourself.
