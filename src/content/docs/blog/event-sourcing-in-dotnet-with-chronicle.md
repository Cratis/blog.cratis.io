---
title: "Event sourcing in .NET 10 with Chronicle: from zero to first projection"
date: 2026-08-28T18:00:00Z
authors: cratis-team
excerpt: Run Chronicle 18.1.3 locally in one container, append your first events from a plain .NET 10 console app, and watch them become read models — every command in this post was executed against the exact versions it names.
tags:
  - chronicle
  - event-sourcing
---

Event sourcing has a reputation for heavy setup: a store, a bus, projections infrastructure, and a day of wiring before the first event lands. This post takes the shortest honest path instead: one Docker container, one console project, and about ninety lines of C# that append events, project them into read models, and react to them — with the full event history inspectable in a browser at the end.

Everything below was executed as written. The versions are pinned so you can reproduce the run exactly:

| Piece | Version |
| --- | --- |
| Chronicle kernel container | `cratis/chronicle:latest-development`, digest `sha256:5f24b51803ada5f959a3fd401fd0d7a96d67b9c387ddbf04d5e0a6e23085c1a7` (Chronicle Server 18.1.3) |
| Client package | [`Cratis.Chronicle`](https://www.nuget.org/packages/Cratis.Chronicle) 18.1.3 |
| .NET SDK | 10.0.400 (`net10.0` target) |

`latest-development` is a moving tag; if you pull it later you may get a newer kernel. The digest above is the exact image this post was verified against. [Chronicle](https://cratis.io/chronicle/) and its bundled local Workbench are MIT-licensed, self-hosted software — what you run here is yours to run.

## What you will build

A minimal .NET 10 console application for a tiny library domain: a book arrives, gets borrowed, and comes back. Each of those facts is an event appended to Chronicle's event log. Two read models are projected from those events — declaratively, with no update code — and a reactor performs a side effect when a book is returned. At the end you open the bundled Workbench and see the whole history.

## 1. Run Chronicle

The development image bundles the Chronicle kernel and its MongoDB storage in a single container — no separate database setup. Start it bound to loopback only, so nothing outside your machine can reach it:

```shell
docker run -d --name chronicle \
  -p 127.0.0.1:35000:35000 \
  cratis/chronicle:latest-development
```

Port `35000` carries gRPC, the REST API, and the Workbench on a single TLS port, using a self-signed development certificate the container generates at startup. Give it a few seconds, then confirm it is up:

```shell
docker logs chronicle 2>&1 | grep "Starting Cratis Chronicle Server"
```

```text
Starting Cratis Chronicle Server - Version 18.1.3.0
```

## 2. Create the application

Create a console project and add the Chronicle client at the pinned version:

```shell
mkdir Quickstart && cd Quickstart
dotnet new console --framework net10.0
dotnet add package Cratis.Chronicle --version 18.1.3
```

The example targets .NET 10 and uses the matching current Chronicle client without compatibility-only package additions.

## 3. Define the events

Events are immutable facts, modeled as records marked with `[EventType]`. The attribute is how Chronicle discovers the type — the type name is the identity, so there is nothing else to configure. Save this as `Events.cs`:

```csharp
using Cratis.Chronicle.Events;

[EventType]
public record BookAdded(string Title, string Isbn);

[EventType]
public record BookBorrowed(string MemberName);

[EventType]
public record BookReturned;
```

`BookReturned` carries no data at all. That it happened, on a particular book's stream, is the whole story — not every fact needs a payload.

## 4. Declare the read models

Events are the write side. To read current state, you declare the shape you want and which events feed each field, and Chronicle keeps it in sync — you never write an `UPDATE`. Save this as `Book.cs`:

```csharp
using Cratis.Chronicle.Keys;
using Cratis.Chronicle.Projections.ModelBound;

[FromEvent<BookAdded>]
public record Book(
    [Key]
    Guid Id,

    string Title,

    string Isbn,

    [SetValue<BookAdded>(false)]
    [SetValue<BookBorrowed>(true)]
    [SetValue<BookReturned>(false)]
    bool OnLoan,

    [SetFrom<BookBorrowed>(nameof(BookBorrowed.MemberName))]
    string? BorrowedBy);
```

Read the attributes as a sentence: a book enters the view from `BookAdded`; `OnLoan` flips with each borrow and return; `BorrowedBy` is whoever borrowed it. `Title` and `Isbn` map from the event by naming convention — no per-property attributes needed when the names match.

The second read model answers "what is out on loan right now?" by existing only while a loan is active. Save this as `BorrowedBook.cs`:

```csharp
using Cratis.Chronicle.Keys;
using Cratis.Chronicle.Projections.ModelBound;

[FromEvent<BookBorrowed>]
[RemovedWith<BookReturned>]
public record BorrowedBook(
    [Key]
    Guid Id,

    string MemberName);
```

When a `BookBorrowed` lands, a `BorrowedBook` appears; when the matching `BookReturned` arrives, it is removed. No flag to maintain, no filter to remember.

## 5. React to an event

When you need to do something the moment a fact lands — notify someone, call another system — you write a reactor. `IReactor` is a marker interface; add a method whose first parameter is the event you care about, and Chronicle routes matching events to it. Save this as `BookReturnedNotifier.cs`:

```csharp
using Cratis.Chronicle.Events;
using Cratis.Chronicle.Reactors;

public class BookReturnedNotifier : IReactor
{
    public Task Returned(BookReturned @event, EventContext context)
    {
        Console.WriteLine($"Reactor: book {context.EventSourceId} was returned — notify the next member in line.");
        return Task.CompletedTask;
    }
}
```

## 6. Connect, append, and query

Now the program that ties it together. Replace the generated `Program.cs` with this code. In this .NET 10 console app there is no host or DI container, so you create the `ChronicleClient` yourself, open an event store, and explicitly ask Chronicle to discover and register the artifacts you just defined:

```csharp
using Cratis.Chronicle;
using Cratis.Chronicle.Connections;

using var client = new ChronicleClient(ChronicleConnectionString.Development);
var eventStore = await client.GetEventStore("Quickstart");
Console.WriteLine($"Connected to event store: {eventStore.Name}");

await eventStore.DiscoverAll();
await eventStore.RegisterAll();

var bookId = Guid.NewGuid();

var appendResult = await eventStore.EventLog.Append(
    bookId,
    new BookAdded("The Pragmatic Programmer", "978-0135957059"));
Console.WriteLine($"Appended BookAdded at sequence {appendResult.SequenceNumber} (success: {appendResult.IsSuccess})");

appendResult = await eventStore.EventLog.Append(bookId, new BookBorrowed("Jane Doe"));
Console.WriteLine($"Appended BookBorrowed at sequence {appendResult.SequenceNumber} (success: {appendResult.IsSuccess})");

// Give the freshly registered read models a moment to come online before the first query.
await Task.Delay(TimeSpan.FromSeconds(5));

var books = await eventStore.ReadModels.GetInstances<Book>();
foreach (var book in books)
{
    Console.WriteLine($"Book read model: {book.Title} ({book.Isbn}) OnLoan={book.OnLoan} BorrowedBy={book.BorrowedBy}");
}

var borrowed = await eventStore.ReadModels.GetInstances<BorrowedBook>();
foreach (var loan in borrowed)
{
    Console.WriteLine($"BorrowedBook read model: {loan.Id} borrowed by {loan.MemberName}");
}

appendResult = await eventStore.EventLog.Append(bookId, new BookReturned());
Console.WriteLine($"Appended BookReturned at sequence {appendResult.SequenceNumber} (success: {appendResult.IsSuccess})");

// Give the reactor a moment to observe the event.
await Task.Delay(TimeSpan.FromSeconds(5));

books = await eventStore.ReadModels.GetInstances<Book>();
foreach (var book in books)
{
    Console.WriteLine($"Book read model after return: {book.Title} OnLoan={book.OnLoan}");
}

borrowed = await eventStore.ReadModels.GetInstances<BorrowedBook>();
Console.WriteLine($"BorrowedBook read models after return: {borrowed.Count()}");
```

`ChronicleConnectionString.Development` points at the local development kernel on `chronicle://localhost:35000` with the built-in development credentials — the same connection `new ChronicleClient()` uses with no arguments. The event source id (`bookId`) is the identity of the thing each fact is about; every event appended against it becomes part of that book's stream of history.

The two `Task.Delay` calls deserve honesty: `GetInstances` replays events on demand, but registration of freshly declared read models and delivery to reactors are asynchronous. On our machine, querying immediately after the very first registration returned empty results; five seconds was comfortably enough. In a long-running application this is a non-issue — registration happens once at startup.

With `Events.cs`, `Book.cs`, `BorrowedBook.cs`, `BookReturnedNotifier.cs`, and `Program.cs` in the project, run it:

```shell
dotnet run
```

```text
Connected to event store: Quickstart
Appended BookAdded at sequence 0 (success: True)
Appended BookBorrowed at sequence 1 (success: True)
Book read model: The Pragmatic Programmer (978-0135957059) OnLoan=True BorrowedBy=Jane Doe
BorrowedBook read model: c6dc1472-3d85-4dd9-97bf-60e009e29caf borrowed by Jane Doe
Appended BookReturned at sequence 2 (success: True)
Reactor: book c6dc1472-3d85-4dd9-97bf-60e009e29caf was returned — notify the next member in line.
Book read model after return: The Pragmatic Programmer OnLoan=False
BorrowedBook read models after return: 0
```

That is the whole loop — append, project, react. The book's `OnLoan` flag flipped, the `BorrowedBook` appeared and disappeared, and the reactor fired — and you never wrote an update statement.

## 7. See the history

State-based storage shows you what the data is. Chronicle also shows you every fact that made it so. Open the bundled Workbench at <https://localhost:35000> — your browser will warn about the self-signed development certificate; that is expected for the local development image. Log in with the development image's default credentials (username `Admin`, password `ChangeMeNow!` — see [Workbench development mode](https://cratis.io/chronicle/workbench/development/)), pick the `Quickstart` event store, and select **Sequences**: your `BookAdded`, `BookBorrowed`, and `BookReturned` are sitting there in order, permanent, with their event source id and timestamps. The Workbench is a bundled local browser surface for authorized inspection of Chronicle runtime state — run the program again and watch new events arrive.

## Clean up

When you are done, remove the container and the image:

```shell
docker rm -f chronicle
docker rmi cratis/chronicle:latest-development
```

Deleting your `Quickstart` folder removes everything else — event data lives inside the container, so removing it removes the data too.

## Where to go next

- The [console quickstart](https://cratis.io/chronicle/get-started/console/) covers this same path in the documentation, including querying the materialized read models in MongoDB directly.
- The [tutorial](https://cratis.io/chronicle/tutorial/) builds the library domain one concept at a time — strongly-typed ids, hosts, and DI included.
- The [ASP.NET Core and Worker Service guides](https://cratis.io/chronicle/get-started/choose-hosting-model/) show the same pieces with the host's DI container doing the wiring.
- Chronicle also ships [TypeScript, Kotlin/Java (JVM), and Elixir clients](https://cratis.io/chronicle/clients/) — with a Python client coming soon (no commitment implied) — so the event log is not a .NET-only story.
