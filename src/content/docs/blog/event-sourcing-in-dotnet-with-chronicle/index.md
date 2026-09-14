---
title: "Event sourcing in .NET with Chronicle: from zero to first projection"
date: 2026-08-28T18:00:00Z
authors: cratis-team
excerpt: Scaffold a full-stack Cratis application from the official .NET templates, model a small library with Arc commands and a Chronicle read model, and see it live in a React UI — every command in this post was executed against the exact versions it names.
tags:
  - chronicle
  - arc
  - event-sourcing
---

Event sourcing has a reputation for heavy setup: a store, a bus, projections infrastructure, and a day of wiring before the first event lands. This post takes the shortest honest path instead: one Docker container, one scaffolded project, and enough C# and React to append events, project them into a read model, and see the result in a browser — backend and frontend, from one template.

Everything below was executed as written. The versions are pinned so you can reproduce the run exactly:

| Piece | Version |
| --- | --- |
| [Cratis.Templates](https://github.com/Cratis/Templates) | 1.2.2 — scaffolds with Arc/Chronicle client 22.14.0 |
| Chronicle kernel container | `cratis/chronicle`, digest `sha256:272021beedf334946c1de3aeec1928354e5acc183dac8561d942d2ad60f9f267` (Chronicle Server 18.2.0.0) |
| .NET SDK | 10.0.400 (`net10.0` target) |

[Chronicle](https://cratis.io/chronicle/) and its bundled local Workbench are MIT-licensed, self-hosted software — what you run here is yours to run.

## What you will build

A small library application: a book arrives, gets borrowed, and comes back. Each of those facts is an event appended to Chronicle's event log. One read model is projected from those events — declaratively, with no update code — and a React page built on [Arc](https://cratis.io/arc/) and [Components](https://cratis.io/components/) drives it end to end: add a book, borrow it, return it, watch the table update live.

## 1. Install the templates

The templates are an ordinary NuGet package — the [Cratis.Templates repository](https://github.com/Cratis/Templates) documents every template it ships; this post uses the full-stack `cratis` one:

```shell
dotnet new install Cratis.Templates
```

## 2. Scaffold the application

One command creates a complete full-stack application — ASP.NET Core with Arc, Chronicle for the event log, MongoDB for read models, and a React frontend with generated TypeScript proxies, arranged in vertical slices. [Build a full app](https://cratis.io/build-a-full-app/) walks the same shape by hand, slice by slice, if you want to see what the template scaffolds before you touch it:

```shell
dotnet new cratis -n Library
cd Library
```

The template ships a sample feature with two slices, a `docker-compose.yml` that starts a local Chronicle development container (MongoDB bundled), and a build that compiles clean — zero warnings under the Cratis analyzers — with the TypeScript proxies regenerated on every build:

```shell
docker compose up -d
dotnet build
```

The sample `SomeModule/SomeFeature` is there to be learned from and then replaced — that is what the rest of this post does.

## 3. Model the domain

Delete the sample module and start with the strongly-typed primitives: `BookTitle` and `BookAuthor` as `ConceptAs<T>` value types, and `BookId` as an event-source identity, so a raw `Guid` never travels through the system unlabeled:

```csharp
public record BookId(Guid Value) : EventSourceId<Guid>(Value)
{
    public static BookId New() => new(Guid.NewGuid());
}

public record BookTitle(string Value) : ConceptAs<string>(Value);
public record BookAuthor(string Value) : ConceptAs<string>(Value);
public record BorrowerName(string Value) : ConceptAs<string>(Value);
```

Three command slices follow — plain records with a `Handle()`, no controllers, no route tables, no handler classes. Adding a book decides on a new identity and produces the event; borrowing and returning operate on an existing book's stream:

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

[EventType]
public record BookBorrowed(BorrowerName Borrower);
```

```csharp
[Command]
public record ReturnBook(BookId Id)
{
    public BookReturned Handle() => new();
}

[EventType]
public record BookReturned;
```

The read model is one `Book`, projected from all three events, with the borrower set by the borrow event and cleared by the return:

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
{
    public static ISubject<IEnumerable<Book>> AllBooks(IMongoCollection<Book> collection) =>
        collection.Observe();
}
```

Eight files — four concepts and identities, three command-and-event pairs, one read model. Build it:

```shell
dotnet build
```

Zero warnings, and the TypeScript proxies for `AddBook`, `BorrowBook`, `ReturnBook`, and the `AllBooks` query regenerate under `Books/` alongside the C#, ready for the frontend to import.

## 4. Verify the backend with curl

Because the routes are generated from the slices, the full loop needs nothing but curl — add, borrow, and return a book over HTTP:

```bash
curl -X POST http://localhost:5000/api/books/add-book \
  -H "Content-Type: application/json" \
  -d '{"title":"The Pragmatic Programmer","author":"Andy Hunt and Dave Thomas"}'
# → {"isSuccess":true, "response":"199e74ea-…"}

curl -X POST http://localhost:5000/api/books/borrow-book \
  -H "Content-Type: application/json" \
  -d '{"id":"199e74ea-…","borrower":"Jane Doe"}'
# → {"isSuccess":true}

curl -X POST http://localhost:5000/api/books/return-book \
  -H "Content-Type: application/json" \
  -d '{"id":"199e74ea-…"}'
# → {"isSuccess":true}
```

After the borrow, the read model holds `borrowedBy: "Jane Doe"`; after the return, it is `null` again. Three events in the log, one read model that always agrees with them, and every request handled by the conventions the template put in place — no update statement anywhere in this post.

## 5. Build the page

The backend's proxies are typed contracts, not documentation to copy by hand — the frontend imports them directly. One file wires a dialog per command and a live table for the query, using [Components](https://cratis.io/components/)' `DataPage`:

```tsx
import { CommandDialog } from '@cratis/components/CommandDialog';
import { InputTextField } from '@cratis/components/CommandForm';
import { Column, DataPage, MenuItem } from '@cratis/components/DataPage';
import { useDialog } from '@cratis/arc.react/dialogs';
import { MdAdd, MdArrowBack, MdArrowForward } from 'react-icons/md';
import { AddBook } from './AddBook';
import { BorrowBook } from './BorrowBook';
import { ReturnBook } from './ReturnBook';
import { AllBooks } from './Book';

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

// BorrowBookDialog and ReturnBookDialog mirror AddBookDialog above, each wired to its own command.

export const Books = () => {
    const [AddDialog, showAddDialog] = useDialog(AddBookDialog);
    const [BorrowDialog, showBorrowDialog] = useDialog(BorrowBookDialog);
    const [ReturnDialog, showReturnDialog] = useDialog(ReturnBookDialog);

    return (
        <>
            <DataPage title='Books' query={AllBooks} dataKey='id' emptyMessage='No books added yet.'>
                <DataPage.MenuItems>
                    <MenuItem icon={MdAdd} label='Add' command={() => { void showAddDialog(); }} />
                    <MenuItem icon={MdArrowForward} label='Borrow' command={() => { void showBorrowDialog(); }} />
                    <MenuItem icon={MdArrowBack} label='Return' command={() => { void showReturnDialog(); }} />
                </DataPage.MenuItems>
                <DataPage.Columns>
                    <Column field='title' header='Title' />
                    <Column field='author' header='Author' />
                    <Column field='borrowedBy' header='Borrowed by' />
                </DataPage.Columns>
            </DataPage>
            <AddDialog />
            <BorrowDialog />
            <ReturnDialog />
        </>
    );
};
```

`CommandDialog` wires form fields straight to the generated `AddBook` proxy's properties — `c.title`, `c.author` — so a typo in a field name is a compile error, not a runtime surprise. `DataPage` picks the right table automatically for an observable query like `AllBooks` and subscribes to it over the same WebSocket the generated proxy opens, so the table updates the moment a projection writes a new state — no polling, no manual refetch after a command succeeds.

Add the route next to the template's own in `App.tsx`:

```tsx
<Route path='/books' element={<Books />} />
```

## 6. Run it

Start the backend, then the frontend dev server, in two terminals from the `Library` folder:

```shell
dotnet run
```

```shell
yarn dev
```

`yarn dev` starts Vite on `http://localhost:9000` and opens it in a browser — the feature lives at **`http://localhost:9000/books`**, not the template's own landing page. Its dev-server proxy forwards `/api` to the backend on port 5000, so the generated proxies behave exactly as they will in production. Add a book, borrow it, return it: the table updates live with no refresh, because the query is a subscription, not a snapshot.

## Clean up and where to go next

Remove the containers and the scratch folder when you are done — event data lives in the container, so removing it removes the data:

```shell
docker compose down
```

- [Build a full app](https://cratis.io/build-a-full-app/) — the same shape, walked by hand, one vertical slice at a time.
- The [C# templates](https://github.com/cratis/templates) — the four templates this post started from, with their documentation.
- [Arc](https://cratis.io/arc/) — the CQRS application framework: commands, queries, validation, and proxy generation.
- [Components](https://cratis.io/components/) — the React component library this post's `DataPage` and `CommandDialog` come from.
- [Chronicle](https://cratis.io/chronicle/) — the event store and processing runtime underneath the read model, including its bundled local Workbench for inspecting the raw event log.
