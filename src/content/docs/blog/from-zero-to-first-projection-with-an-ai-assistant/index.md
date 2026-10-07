---
title: "From zero to first projection with an AI assistant"
date: 2026-09-10
authors: einar
excerpt: The zero-to-first-projection walkthrough again — same store, same domain, same destination — but this time Claude Code does the typing, using the official .NET templates and the Cratis AI `cratis/application/csharp` profile installed with the Cratis CLI, with Arc commands carrying the full loop.
tags:
  - chronicle
  - ai
---

A few weeks ago we published [a walkthrough](/event-sourcing-in-dotnet-with-chronicle/) that scaffolded a full-stack Cratis application from the official .NET templates and built a small library feature by hand: three events, a read model, a React page. This post runs the same journey again with one difference — a human writes one short prompt, and [Claude Code](https://claude.com/claude-code) does the typing.

Like that walkthrough, this is .NET development: the slices here are C# on ASP.NET Core, with [Arc](https://cratis.io/arc/) carrying commands and queries and Chronicle carrying the event log. And this time we start from the official .NET templates rather than an empty folder, because the interesting question is not whether an assistant can write C# — it is whether it can write *your* conventions. [Cratis AI](https://cratis.io/ai/) closes that gap from two sides: skills that teach the assistant how to build, and operating tools that let it inspect a live store. This post uses both:

| Piece | Version |
| --- | --- |
| Claude Code | 2.1.274, with skills configured by `cratis ai update` (profile `cratis/application/csharp`) |
| [Cratis.Templates](https://github.com/Cratis/Templates) | 1.7.3 |
| `Cratis` and `Cratis.Arc.MongoDB` NuGet packages (Arc) | 22.51.0 — brings the Chronicle client for .NET 19.31.2 |
| `@cratis/arc`, `@cratis/arc.react`, `@cratis/arc.vite` npm packages | 22.51.0 |
| `@cratis/components` npm package | 4.26.1 |
| Chronicle container | `cratis/chronicle:19.33.3-development`, digest `sha256:9eab36c7ff1aa77d9fa10cea778d7ca38541e91e7f4a56074354e4cb3a3d4015` (Chronicle Server 19.33.3.0) |
| Chronicle MCP server | `cratis/chronicle-mcp:1.4.0`, digest `sha256:0aebbb8be2d0d48982f38f8de4ff787e2769273b5d0227d9c8d1f50996b60b23` |
| [Cratis CLI](https://cratis.io/cli/getting-started/) | 3.29.0 (Homebrew) |
| .NET SDK | 10.0.401 (`net10.0` target) |
| Yarn | 4.18.1 |

## 1. Install the skills and the templates

The skills are passive markdown — a `SKILL.md` your assistant loads when a task matches, plus rules for the conventions that are always on. The [Cratis CLI](https://cratis.io/cli/getting-started/) is the most reliable way to get them into a project, because it resolves the corpus once and configures every harness you name from the same source. [Profiles](https://cratis.io/ai/profiles/) pick the product guidance a repository needs — this is a full Arc-plus-Chronicle application with a React frontend, so the profile that matches is `cratis/application/csharp`, not the narrower `cratis/chronicle` and `cratis/arc` pair on their own.

The template already makes that choice for you: it ships a `.cratis/ai.json` selecting `cratis/application/csharp` for C# and TypeScript, with adapters for Claude Code and five other harnesses. So once the project exists, installing the skills is one command inside it, `cratis ai update`, which you will run in step 2.

It writes the resolved rules and skills into `.cratis/ai`, wires Claude Code's `.claude` folder to it, and records hashes in `.cratis/ai.manifest.json` so a later `cratis ai update` only touches what actually changed. In a repository without that selection, `cratis ai install --harnesses claude --profiles cratis/application/csharp --languages csharp,typescript` makes the same choice for Claude Code alone; run it without flags and it prompts for harnesses, profiles, and languages instead. Choosing `cratis/application/csharp` over the pair is what actually pulls in the frontend skills — `cratis-arc-react-page`, `cratis-components-styling`, and `cratis-application-react-specifications`, plus the dialog rules — the ones this post's React proxies and dialogs rely on.

> Prefer a single harness with no CLI in the loop? The native path still works: `/plugin marketplace add Cratis/AI` → `/plugin install cratis@cratis` for Claude Code, the equivalent `plugin marketplace`/`plugin install` pair for Codex and Copilot, Cursor's committed marketplace manifest, or `pi install -l npm:@cratis/pi` for Pi. It is the quicker on-ramp for one developer, one tool — see the [agent harness guide](https://cratis.io/ai/harnesses/) for the exact command per host. The CLI is what this post uses because it is the one tool that stays correct across every harness on a team.

The templates are an ordinary NuGet package — the [Cratis.Templates repository](https://github.com/Cratis/Templates) documents every template it ships, this post uses the full-stack `cratis` one:

```shell
dotnet new install Cratis.Templates@1.7.3
```

## 2. Scaffold the application

One command creates a complete full-stack application — ASP.NET Core with Arc, Chronicle for the event log, MongoDB for read models, and a React frontend with generated TypeScript proxies, arranged in vertical slices. [Build a full app](https://cratis.io/build-a-full-app/) walks the same shape by hand, slice by slice, if you want to see what the template scaffolds before an assistant touches it:

```shell
dotnet new cratis -n Library
cd Library
```

Answer yes when `dotnet new` asks to run `yarn install`. The template adds the newest `Cratis` packages at the moment you scaffold and lists its npm packages as version ranges, so pin them — and the SDK — to the versions in the table above:

```shell
dotnet new globaljson --sdk-version 10.0.401
dotnet add package Cratis --version 22.51.0
dotnet add package Cratis.Arc.MongoDB --version 22.51.0
corepack use yarn@4.18.1
yarn add @cratis/arc@22.51.0 @cratis/arc.react@22.51.0 @cratis/arc.vite@22.51.0 @cratis/components@4.26.1
```

`corepack use` records Yarn 4.18.1 in `package.json` and installs the frontend dependencies with it, which also covers an older Yarn 4 on which the template's own `yarn install` fails. Then install the skills the template selected:

```shell
cratis ai update
```

The template ships a sample feature with two slices, a `docker-compose.yml` that starts a local Chronicle development container (MongoDB bundled), and a build that compiles clean — zero warnings under the Cratis analyzers — with the TypeScript proxies regenerated on every build. The compose file follows the moving `latest-development` tag, so pin the `chronicle` service's `image:` line in `docker-compose.yml` first:

```yaml
    image: cratis/chronicle:19.33.3-development@sha256:9eab36c7ff1aa77d9fa10cea778d7ca38541e91e7f4a56074354e4cb3a3d4015
```

```shell
docker compose up -d
dotnet build
```

The sample `SomeModule/SomeFeature` is there to be learned from and then replaced. That replacement is the assistant's job. Replacing it also means deleting `LibraryDbContext.cs`: with MongoDB, that file holds nothing but a `using` of the sample's namespace, so the build fails once the sample is gone.

## 3. One prompt, a few slices

Now the entire "build the feature" step, quoted verbatim as it was sent:

> Let's create a few vertical slices in this project for a small library: adding a book to the shelves, borrowing it, and returning it. When borrowed, it should know who has it. Build the project and run the app to make sure it all works.

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

Because the routes are generated from the slices, the full loop needs nothing but curl — with the app running (`dotnet run`, on `http://localhost:5000`), add, borrow, and return a book over HTTP:

```bash
curl -X POST http://localhost:5000/api/books/add-book \
  -H "Content-Type: application/json" \
  -d '{"title":"The Hobbit","author":"J.R.R. Tolkien"}'
# → {"response":"5df009bb-…","correlationId":"…","isSuccess":true,…}

curl -X POST http://localhost:5000/api/books/borrow-book \
  -H "Content-Type: application/json" \
  -d '{"id":"5df009bb-…","borrower":"Frodo Baggins"}'
# → {"correlationId":"…","isSuccess":true,…}

curl -X POST http://localhost:5000/api/books/return-book \
  -H "Content-Type: application/json" \
  -d '{"id":"5df009bb-…"}'
# → {"correlationId":"…","isSuccess":true,…}
```

After the borrow, the read model — a document in the `books` collection of the `Library` database, in the Chronicle container's bundled MongoDB — holds `borrowedBy: 'Frodo Baggins'`; after the return, it is `null` again. Three events in the log, one read model that always agrees with them, and every request in between handled by the conventions the template put in place.

The prompt asked for slices, not just a backend, and the assistant treated the React side as part of the same slice rather than a separate task. The build had already regenerated typed TypeScript proxies for `AddBook`, `BorrowBook`, `ReturnBook`, and the `AllBooks` query the moment the C# compiled — `Books/AddBook.ts`, `Books/BorrowBook.ts`, `Books/ReturnBook.ts`, `Books/Book.ts`, all marked **DO NOT EDIT**, regenerated on every build. The assistant wrote one file against those proxies: a `Books` page with a dialog per command and a live data table for the query, using the same Components primitives the sample feature demonstrates — `CommandDialog` and `DataPage`:

```tsx
const AddBookDialog = () => (
    <CommandDialog
        command={AddBook}
        title='Add book'
        okLabel='Add'
        cancelLabel='Cancel'>
        <InputTextField<AddBook> value={c => c.title} title='Title' />
        <InputTextField<AddBook> value={c => c.author} title='Author' />
    </CommandDialog>
);

export const Books = () => {
    const [selected, setSelected] = useState<Book | null>(null);
    const [AddDialog, showAddDialog] = useDialog(AddBookDialog);
    // ...BorrowDialog and ReturnDialog follow the same shape, seeded with the selected book's id

    return (
        <>
            <DataPage
                title='Books'
                query={AllBooks}
                dataKey='id'
                emptyMessage='No books added yet.'
                selection={selected}
                onSelectionChange={e => setSelected(e.value)}>
                <DataPage.MenuItems>
                    <MenuItem icon={MdAdd} label='Add' command={() => { void showAddDialog(); }} />
                    {/* ...Borrow and Return menu items, disableOnUnselected */}
                </DataPage.MenuItems>
                <DataPage.Columns>
                    <Column field='title' header='Title' />
                    <Column field='author' header='Author' />
                    <Column field='borrowedBy' header='Borrowed by' />
                </DataPage.Columns>
            </DataPage>
            <AddDialog />
        </>
    );
};
```

`CommandDialog` wires form fields straight to the generated `AddBook` proxy's properties — `c.title`, `c.author` — so a typo in a field name is a compile error, not a runtime surprise. `DataPage` picks the observable table for `AllBooks` and subscribes over the same WebSocket the generated query proxy opens, so the table updates the moment a projection writes a new state — no polling, no manual refetch after a command succeeds. That is the full power of the stack, exercised entirely through one assistant-written feature: backend slice, generated contract, and UI, all from the same prompt.

## 4. Teach the assistant your store

Building is half the loop. The other half is operating what you built, and Cratis ships two documented tools for that. The first is the Cratis CLI, made AI-aware:

```shell
cratis init
```

One command, and the project gains `CHRONICLE.md` — the CLI's whole command catalog — plus a `chronicle-cli` command carrying that catalog and a `chronicle-diagnose` command for Claude Code, with matching prompts for the other tools it detects. Instruction files that already resolve into the managed `.cratis/ai` corpus, such as `CLAUDE.md`, are left to `cratis ai update`. After a CLI upgrade, `cratis init --refresh` re-captures the catalog.

## 5. Ask the store questions

The second operating tool is the [Chronicle MCP server](https://cratis.io/chronicle-mcp/) — a containerized MCP endpoint straight into the running store:

```shell
claude mcp add chronicle -s project \
  -- docker run -i --rm \
  -e Cratis__Chronicle__Mcp__ConnectionString=chronicle://chronicle-dev-client:chronicle-dev-secret@host.docker.internal:35000 \
  cratis/chronicle-mcp:1.4.0@sha256:0aebbb8be2d0d48982f38f8de4ff787e2769273b5d0227d9c8d1f50996b60b23
```

The connection string goes to `docker run -e`, after the `--`, so it reaches the container; Claude Code's own `-e` would only set it for the `docker` command.

Then, in plain language: *"how many event stores are there, and what is the current state of the book with id `5df009bb-…` — on the shelf or borrowed, and by whom?"*

What happened next was the most interesting part of the whole exercise. With only the MCP server connected, the assistant **declined to call it** — the `cratis-chronicle-mcp-inspection` skill it carried gates MCP tooling behind verified evidence, and the gate is closed: the skill is classification-only and admits no Chronicle MCP tool until upstream tool-effect evidence exists. That skill ships in the `cratis/chronicle/mcp` profile, not in `cratis/application/csharp`, so add that profile to `.cratis/ai.json` and run `cratis ai update` if you want the same guardrail. Governed skills that refuse rather than improvise are exactly what they are supposed to be.

After `cratis init` gave the project the CLI catalog, the same question got a complete answer through the CLI. `cratis chronicle event-stores list` reports two event stores, `System` and `Library`. `cratis chronicle read-models get "Library.Books.Book" <id> --event-store Library` returns an instance holding only `id`, `title`, and `author` — no borrower, so the book is **on the shelf**. `cratis chronicle observers list --event-store Library` shows the `Library.Books.Book` projection as Active, and `cratis chronicle failed-partitions list --event-store Library` comes back empty.

The assistant read the read model, checked the observer's health, and interpreted the state *against the source model it had written itself* — `BorrowedBy` absent means returned or never borrowed. It is also a fair demo of how these tools relate: the MCP server and the CLI are operate-and-inspect tools — they read the log, watch observers, and manage jobs — while changes to application state still go through commands and events. History stays honest.

## Other harnesses, same guidance

Nothing above is Claude-specific except the `claude mcp add` registration. `cratis ai install` resolves the identical corpus for every harness it supports, so a team never sees two tools disagree on the conventions:

```shell
cratis ai install \
  --harnesses claude,codex,copilot,cursor,opencode,pi \
  --profiles cratis/application/csharp \
  --languages csharp,typescript
```

That is exactly the selection the template's `.cratis/ai.json` already records, which is why the `cratis ai update` in step 2 configured all of them at once. One run configures `.claude`, `AGENTS.md` plus `.agents/skills` for Codex, `.github` for Copilot, `.cursor`, `.opencode`, and `AGENTS.md` plus `.pi` for Pi — all pointed back at the same `.cratis/ai`. The `cratis init` step from the previous section configures Claude Code, GitHub Copilot, Cursor, Windsurf, and Pi, so the operating half is harness-agnostic too.

> The native, plugin-per-harness path from the note above is still there if a repository only ever uses one tool — it just doesn't give you the shared `.cratis/ai` corpus, the multi-harness configuration in one command, or `cratis ai update`/`uninstall`'s hash-protected lifecycle.

## Teams and multiple harnesses

A solo developer with one tool can stop reading here — the templates and the Cratis CLI (or the native plugin, for a single harness) alone are the whole setup. For a repository shared by people *and* tools, the [team scenario](https://cratis.io/ai/scenarios/team-repository/) commits the same four things one selection produces: `.cratis/ai.json` (the chosen harnesses, profiles, and languages), the resolved `.cratis/ai/` corpus, `.cratis/ai.manifest.json` (which files are Cratis-managed and their installed hashes), and the harness adapters — symlinks or settings references — that point every tool back at that one corpus:

```json
{
    "schemaVersion": "1.0",
    "harnesses": ["claude", "codex", "copilot", "cursor", "opencode", "pi"],
    "profiles": ["cratis/application/csharp"],
    "languages": ["csharp", "typescript"]
}
```

The point of the shared file is that nobody's editor settings become the source of truth: a new teammate — or a new AI tool — gets the same scope from the committed record, and `cratis ai update` stops before touching anything a person has since hand-edited, so an update stays a reviewed diff instead of a silent overwrite. The [multiple-harnesses scenario](https://cratis.io/ai/scenarios/multiple-harnesses/) adds the rule that keeps tools from drifting apart: every adapter points back at `.cratis/ai` rather than a separately maintained copy, and native, single-harness plugins remain available alongside the managed path for anyone who wants one tool without the shared corpus.

## See it in the browser

Everything so far went through curl and the CLI, which is honest about what actually changed but doesn't show the UI the assistant wrote. Start the backend, then the frontend dev server, in two terminals from the `Library` folder:

```shell
dotnet run
```

```shell
yarn dev
```

`yarn dev` starts Vite on `http://localhost:9000` and opens it in a browser — but that lands on the template's own landing page, not the feature. The assistant added a route for the new page the same way the sample feature already had one, so the `Books` page it wrote lives at **`http://localhost:9000/books`**:

```tsx
<Route path='/books' element={<Books />} />
```

The dev-server proxy forwards `/api` and `/.cratis` to the backend on port 5000, so the generated `AddBook`, `BorrowBook`, and `ReturnBook` proxies work exactly as they will in production, and the `AllBooks` table's WebSocket subscription updates live as commands succeed — add a book and it appears in the table with no refresh, select it and borrow it and `Borrowed by` fills in immediately. The template's own `README.md` documents the same two commands for the sample feature; nothing about running it changed by replacing that feature with `Books` — only the route moved from the template's `/demo` to `/books`.

## Status, plainly

Every piece in this post is installable and runnable today. Build with it, push on it, and tell us what breaks — that openness to feedback is deliberate, and it is how the workflow gets better.

## Clean up and where to go next

Remove the containers and the scratch folder when you are done — event data lives in the container, so removing it removes the data:

```shell
docker compose down
```

- [Cratis AI](https://cratis.io/ai/) — the overview, and the [getting-started](https://cratis.io/ai/getting-started/) page for `cratis ai install` and the native plugin alternative.
- The [C# templates](https://github.com/cratis/templates) — the four templates this post started from, with their documentation.
- [Arc](https://cratis.io/arc/) — the CQRS application framework: commands, queries, validation, and proxy generation.
- The [agent harness guide](https://cratis.io/ai/harnesses/) — install, verify, and uninstall for every harness.
- The original [hand-written walkthrough](/event-sourcing-in-dotnet-with-chronicle/) — same destination, and still the best way to see every moving part yourself.
