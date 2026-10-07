---
title: "Event sourcing in .NET with Chronicle: from zero to first projection"
date: 2026-08-28T18:00:00Z
authors: cratis-team
excerpt: Scaffold a full-stack Cratis application from the official .NET templates, model a small library with Arc commands and a Chronicle read model, and see it live in a React UI.
tags:
  - chronicle
  - arc
  - event-sourcing
---

Event sourcing has a reputation for heavy setup: a store, a bus, projections infrastructure, and a day of wiring before the first event lands. This post takes the shortest honest path instead: one Docker container, one scaffolded project, and enough C# and React to append events, project them into a read model, and see the result in a browser — backend and frontend, from one template.

The versions are pinned so you can reproduce the run exactly:

| Piece | Version |
| --- | --- |
| [Cratis.Templates](https://github.com/Cratis/Templates) | 1.7.3 |
| `Cratis` and `Cratis.Arc.MongoDB` NuGet packages (Arc) | 22.51.0 — brings the Chronicle client for .NET 19.31.2 |
| `@cratis/arc`, `@cratis/arc.react`, `@cratis/arc.vite` npm packages | 22.51.0 |
| `@cratis/components` npm package | 4.26.1 |
| Chronicle container | `cratis/chronicle:19.33.3-development`, digest `sha256:9eab36c7ff1aa77d9fa10cea778d7ca38541e91e7f4a56074354e4cb3a3d4015` (Chronicle Server 19.33.3.0) |
| .NET SDK | 10.0.401 (`net10.0` target) |
| Yarn | 4.18.1 |

[Chronicle](https://cratis.io/chronicle/) and its bundled local Workbench are MIT-licensed, self-hosted software — what you run here is yours to run.

## What you will build

A small library application: a book arrives, gets borrowed, and comes back. Each of those facts is an event appended to Chronicle's event log. One read model is projected from those events — declaratively, with no update code — and a React page built on [Arc](https://cratis.io/arc/) and [Components](https://cratis.io/components/) drives it end to end: add a book, borrow it, return it, watch the table update live.

## 1. Install the templates

The templates are an ordinary NuGet package — the [Cratis.Templates repository](https://github.com/Cratis/Templates) documents every template it ships; this post uses the full-stack `cratis` one:

```shell
dotnet new install Cratis.Templates@1.7.3
```

## 2. Scaffold the application

One command creates a complete full-stack application — ASP.NET Core with Arc, Chronicle for the event log, MongoDB for read models, and a React frontend with generated TypeScript proxies, arranged in vertical slices. [Build a full app](https://cratis.io/build-a-full-app/) walks the same shape by hand, slice by slice, if you want to see what the template scaffolds before you touch it:

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

`corepack use` records Yarn 4.18.1 in `package.json` and installs the frontend dependencies with it. That also covers an older Yarn 4 (4.5.3, for example), on which the template's own `yarn install` fails to install the frontend's TypeScript alias.

The template ships a sample feature with two slices, a `docker-compose.yml` that starts a local Chronicle development container (MongoDB bundled), and a build that compiles clean — zero warnings under the Cratis analyzers — with the TypeScript proxies regenerated on every build. The compose file follows the moving `latest-development` tag, so point its `chronicle` service at the pinned image first — in `docker-compose.yml`, replace the `image:` line with:

```yaml
    image: cratis/chronicle:19.33.3-development@sha256:9eab36c7ff1aa77d9fa10cea778d7ca38541e91e7f4a56074354e4cb3a3d4015
```

Then start it and build:

```shell
docker compose up -d
dotnet build
```

Chronicle is ready when `curl --insecure https://localhost:35000/health` prints `Healthy`, and `docker compose logs chronicle` shows `Starting Cratis Chronicle Server - Version 19.33.3.0`.

The sample `SomeModule/SomeFeature` is there to be learned from and then replaced — that is what the rest of this post does.

## 3. Model the domain

Delete the sample `SomeModule` folder together with `LibraryDbContext.cs` — with MongoDB that file holds nothing but a `using` of the sample's namespace, so the build fails once the sample is gone. The new feature lives in a `Books` folder, with one file per concept, per command slice, and for the read model, each starting with `namespace Library.Books;`. The namespace decides the routes (`/api/books/...`), and each TypeScript proxy is generated next to the C# file it comes from.

Start with the strongly-typed primitives: `BookTitle` and `BookAuthor` as `ConceptAs<T>` value types, and `BookId` as an event-source identity, so a raw `Guid` never travels through the system unlabeled:

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

Eight files — four concepts and identities (`BookId.cs`, `BookTitle.cs`, `BookAuthor.cs`, `BorrowerName.cs`), three command-and-event pairs (`AddBook.cs`, `BorrowBook.cs`, `ReturnBook.cs`), one read model (`Book.cs`). Build it:

```shell
dotnet build
```

Zero warnings, and the TypeScript proxies for `AddBook`, `BorrowBook`, `ReturnBook`, and the `AllBooks` query regenerate under `Books/` alongside the C# — `Books/AddBook.ts`, `Books/BorrowBook.ts`, `Books/ReturnBook.ts`, and `Books/Book.ts`, plus an `index.ts` that re-exports them — ready for the frontend to import.

## 4. Verify the backend with curl

Because the routes are generated from the slices, the full loop needs nothing but curl. Start the backend with `dotnet run` (it listens on `http://localhost:5000`), then add, borrow, and return a book over HTTP — the add returns the new book's id, which the next two calls use:

```bash
curl -X POST http://localhost:5000/api/books/add-book \
  -H "Content-Type: application/json" \
  -d '{"title":"The Pragmatic Programmer","author":"Andy Hunt and Dave Thomas"}'
# → {"response":"7d558260-…","correlationId":"…","isSuccess":true,…}

curl -X POST http://localhost:5000/api/books/borrow-book \
  -H "Content-Type: application/json" \
  -d '{"id":"7d558260-…","borrower":"Jane Doe"}'
# → {"correlationId":"…","isSuccess":true,…}

curl -X POST http://localhost:5000/api/books/return-book \
  -H "Content-Type: application/json" \
  -d '{"id":"7d558260-…"}'
# → {"correlationId":"…","isSuccess":true,…}
```

The read model is a document in the `books` collection of the `Library` database, inside the Chronicle container's bundled MongoDB, so you can look at it directly:

```shell
docker compose exec chronicle mongosh --quiet Library --eval 'db.books.find().toArray()'
```

After the borrow, the document holds `borrowedBy: 'Jane Doe'`; after the return, it is `null` again. Projections run asynchronously, so a query fired in the same instant as a command can still see the previous state for a moment. Three events in the log, one read model that always agrees with them, and every request handled by the conventions the template put in place — no update statement anywhere in this post.

## 5. Build the page

The backend's proxies are typed contracts, not documentation to copy by hand — the frontend imports them directly. One file, `Books/Books.tsx`, wires a dialog per command and a live table for the query, using [Components](https://cratis.io/components/)' `DataPage` — the same component the template's sample feature uses:

```tsx
import { useState } from 'react';
import { CommandDialog } from '@cratis/components/CommandDialog';
import { InputTextField } from '@cratis/components/CommandForm';
import { Column, DataPage, MenuItem } from '@cratis/components/DataPage';
import { useDialog } from '@cratis/arc.react/dialogs';
import { MdAdd, MdArrowBack, MdArrowForward } from 'react-icons/md';
import { AddBook } from './AddBook';
import { BorrowBook } from './BorrowBook';
import { ReturnBook } from './ReturnBook';
import { AllBooks, Book } from './Book';

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

interface BookDialogProps {
    book: Book;
}

const BorrowBookDialog = ({ book }: BookDialogProps) => (
    <CommandDialog
        command={BorrowBook}
        initialValues={{ id: book.id }}
        title={`Borrow ${book.title}`}
        okLabel='Borrow'
        cancelLabel='Cancel'>
        <InputTextField<BorrowBook> value={c => c.borrower} title='Borrower' />
    </CommandDialog>
);

const ReturnBookDialog = ({ book }: BookDialogProps) => (
    <CommandDialog
        command={ReturnBook}
        initialValues={{ id: book.id }}
        title={`Return ${book.title}`}
        okLabel='Return'
        cancelLabel='Cancel' />
);

export const Books = () => {
    const [selected, setSelected] = useState<Book | null>(null);
    const [AddDialog, showAddDialog] = useDialog(AddBookDialog);
    const [BorrowDialog, showBorrowDialog] = useDialog(BorrowBookDialog);
    const [ReturnDialog, showReturnDialog] = useDialog(ReturnBookDialog);

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
                    <MenuItem icon={MdArrowForward} label='Borrow' disableOnUnselected
                        command={() => { if (selected) void showBorrowDialog({ book: selected }); }} />
                    <MenuItem icon={MdArrowBack} label='Return' disableOnUnselected
                        command={() => { if (selected) void showReturnDialog({ book: selected }); }} />
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

`CommandDialog` wires form fields straight to the generated `AddBook` proxy's properties — `c.title`, `c.author` — so a typo in a field name is a compile error, not a runtime surprise. Borrowing and returning act on the selected row: `disableOnUnselected` keeps those menu items greyed out until a book is selected, and the dialog seeds the command's `id` from that book through `initialValues`, so you only type the borrower. `DataPage` picks the right table automatically for an observable query like `AllBooks` and subscribes to it over the same WebSocket the generated proxy opens, so the table updates the moment a projection writes a new state — no polling, no manual refetch after a command succeeds.

In `App.tsx`, replace the template's `/demo` route and its `SomeFeature` import — that sample is gone — with the new page:

```tsx
import { Books } from './Books/Books';
```

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

`yarn dev` starts Vite on `http://localhost:9000` and opens it in a browser — the feature lives at **`http://localhost:9000/books`**, not the template's own landing page. Its dev-server proxy forwards `/api` and `/.cratis` to the backend on port 5000, so the generated proxies behave exactly as they will in production. Add a book, select it, then borrow and return it: the table updates live with no refresh, because the query is a subscription, not a snapshot.

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
