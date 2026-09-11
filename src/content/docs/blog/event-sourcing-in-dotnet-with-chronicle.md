---
title: "Event sourcing in .NET with Chronicle: from zero to first projection"
date: 2026-08-28T18:00:00Z
authors: cratis-team
excerpt: Run Chronicle locally in one container, append your first events from a plain .NET console app, and watch them become read models — every command in this post was executed against the exact versions it names.
tags:
  - chronicle
  - event-sourcing
---

Event sourcing has a reputation for heavy setup: a store, a bus, projections infrastructure, and a day of wiring before the first event lands. This post takes the shortest honest path instead: one Docker container, one console project, and C# that appends events, projects them into read models, and reacts to them — with the full event history inspectable in a browser at the end.

Everything below was executed as written on 2026-09-11. The versions are pinned so you can reproduce the run exactly:

| Piece | Version |
| --- | --- |
| Chronicle kernel container | `cratis/chronicle` at digest `sha256:360cf3a31216d15d61cc2dae27ad1ac3435fb44c2de7936ac20be4be39596554` (Chronicle Server 18.1.5) |
| Client package | [`Cratis.Chronicle`](https://www.nuget.org/packages/Cratis.Chronicle) 18.1.5 |
| .NET SDK | 10.0.401 (`net10.0` target) |

The digest is the exact image this post was verified against, so the command below pins it rather than a moving tag. [Chronicle](https://cratis.io/chronicle/) and its bundled local Workbench are MIT-licensed, self-hosted software — what you run here is yours to run.

## What you will build

A minimal .NET console application for a tiny library domain: a book arrives, gets borrowed, and comes back. Each of those facts is an event appended to Chronicle's event log. Two read models are projected from those events — declaratively, with no update code — and a reactor performs a side effect when a book is returned. At the end you open the bundled Workbench and see the whole history.

## 1. Run Chronicle

The development image bundles the Chronicle kernel and its MongoDB storage in a single container — no separate database setup. Start it bound to loopback only, so nothing outside your machine can reach it:

```shell
docker run -d --name chronicle \
  -p 127.0.0.1:35000:35000 \
  cratis/chronicle@sha256:360cf3a31216d15d61cc2dae27ad1ac3435fb44c2de7936ac20be4be39596554
```

Port `35000` carries gRPC, the REST API, and the Workbench on a single TLS port, using a self-signed development certificate the container generates at startup. Wait for it to answer:

```shell
curl --insecure --fail --silent --show-error \
  --retry 30 --retry-all-errors --retry-delay 1 --retry-max-time 60 \
  --connect-timeout 2 --max-time 5 \
  https://localhost:35000/ --output /dev/null
```

The retries cover the seconds before the certificate and endpoint are ready, and `--insecure` accepts that development certificate — not something to carry into production. If it never answers, check `docker logs chronicle`.

## 2. Create the application

Create a console project on the pinned SDK and add the Chronicle client at the pinned version:

```shell
mkdir Quickstart && cd Quickstart
dotnet new globaljson --sdk-version 10.0.401 --roll-forward disable
dotnet new console --framework net10.0
dotnet add package Cratis.Chronicle --version 18.1.5
```

The `global.json` is what makes the run reproducible: without it, another installed SDK could quietly take over.

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
    [ClearWith<BookReturned>]
    string? BorrowedBy);
```

Read the attributes as a sentence: a book enters the view from `BookAdded`; `OnLoan` flips with each borrow and return; `BorrowedBy` is the current borrower and clears on return. `Title` and `Isbn` map from the event by naming convention — no per-property attributes needed when the names match.

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
    public static Guid BookToObserve { get; set; }

    public static TaskCompletionSource Observed { get; } =
        new(TaskCreationOptions.RunContinuationsAsynchronously);

    public Task Returned(BookReturned @event, EventContext context)
    {
        Console.WriteLine($"Reactor: book {context.EventSourceId} was returned — notify the next member in line.");
        if (context.EventSourceId.ToString() == BookToObserve.ToString())
        {
            Observed.TrySetResult();
        }
        return Task.CompletedTask;
    }
}
```

The two static members are there only so the console program can wait for the reactor before it exits; a hosted application just leaves it running. And printing a line is not the same as sending a notification — a real one has to be safe to retry, because the reactor can see the event again.

## 6. Connect, append, and query

Now the program that ties it together. In a console app there is no host or DI container, so you create the `ChronicleClient` yourself, open an event store, and explicitly ask Chronicle to discover and register the artifacts you just defined. Replace the generated `Program.cs` with this:

```csharp
using Cratis.Chronicle;
using Cratis.Chronicle.Connections;

using var client = new ChronicleClient(ChronicleConnectionString.Development);
var eventStore = await client.GetEventStore("Quickstart");
Console.WriteLine($"Connected to event store: {eventStore.Name}");

await eventStore.DiscoverAll();
await eventStore.RegisterAll();

var bookId = Guid.NewGuid();
BookReturnedNotifier.BookToObserve = bookId;

var appendResult = await eventStore.EventLog.Append(
    bookId,
    new BookAdded("The Pragmatic Programmer", "978-0135957059"));
Console.WriteLine($"Appended BookAdded at sequence {appendResult.SequenceNumber} (success: {appendResult.IsSuccess})");

appendResult = await eventStore.EventLog.Append(bookId, new BookBorrowed("Jane Doe"));
Console.WriteLine($"Appended BookBorrowed at sequence {appendResult.SequenceNumber} (success: {appendResult.IsSuccess})");

var book = await WaitFor(TheBook, book => book is { OnLoan: true });
Console.WriteLine($"Book read model: {book!.Title} ({book.Isbn}) OnLoan={book.OnLoan} BorrowedBy={book.BorrowedBy}");

var borrowed = await WaitFor(BorrowedBooks, loans => loans.Any());
foreach (var loan in borrowed)
{
    Console.WriteLine($"BorrowedBook read model: {loan.Id} borrowed by {loan.MemberName}");
}

appendResult = await eventStore.EventLog.Append(bookId, new BookReturned());
Console.WriteLine($"Appended BookReturned at sequence {appendResult.SequenceNumber} (success: {appendResult.IsSuccess})");

book = await WaitFor(TheBook, book => book is { OnLoan: false });
Console.WriteLine($"Book read model after return: {book!.Title} OnLoan={book.OnLoan} BorrowedBy={book.BorrowedBy}");

borrowed = await WaitFor(BorrowedBooks, loans => !loans.Any());
Console.WriteLine($"BorrowedBook read models after return: {borrowed.Count()}");

await BookReturnedNotifier.Observed.Task.WaitAsync(TimeSpan.FromSeconds(30));

async Task<Book?> TheBook() =>
    (await eventStore.ReadModels.GetInstances<Book>()).FirstOrDefault(book => book.Id == bookId);

async Task<IEnumerable<BorrowedBook>> BorrowedBooks() =>
    (await eventStore.ReadModels.GetInstances<BorrowedBook>()).Where(loan => loan.Id == bookId);

static async Task<T> WaitFor<T>(Func<Task<T>> read, Func<T, bool> isReady)
{
    using var giveUp = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    while (true)
    {
        var value = await read();
        if (isReady(value)) return value;
        await Task.Delay(200, giveUp.Token);
    }
}
```

`ChronicleConnectionString.Development` points at the local development kernel on `chronicle://localhost:35000` with the built-in development credentials — the same connection `new ChronicleClient()` uses with no arguments. The event source id (`bookId`) is the identity of the thing each fact is about; every event appended against it becomes part of that book's stream of history.

The `WaitFor` calls deserve honesty: appending and projecting are separate steps, so a [read model](https://cratis.io/chronicle/read-models/) can lag a successful append — at startup and at any point after it. Rather than sleeping and hoping, the program asks for the state it expects and gives up after thirty seconds.

Put the five files in the project and run it:

```shell
dotnet run
```

```text
Connected to event store: Quickstart
Appended BookAdded at sequence 0 (success: True)
Appended BookBorrowed at sequence 1 (success: True)
Book read model: The Pragmatic Programmer (978-0135957059) OnLoan=True BorrowedBy=Jane Doe
BorrowedBook read model: bdd3a21a-e614-480b-8c9a-c9af911b7663 borrowed by Jane Doe
Appended BookReturned at sequence 2 (success: True)
Reactor: book bdd3a21a-e614-480b-8c9a-c9af911b7663 was returned — notify the next member in line.
Book read model after return: The Pragmatic Programmer OnLoan=False BorrowedBy=
BorrowedBook read models after return: 0
```

That is the whole loop — append, project, react. The book's `OnLoan` flag flipped, `BorrowedBy` filled in and cleared, the `BorrowedBook` appeared and disappeared, and the reactor fired — and you never wrote an update statement. The reactor line can land anywhere after the return; it runs independently of the projections. Run it again and you get a new book id, appended to the same log.

## 7. See the history

State-based storage shows you what the data is. Chronicle also shows you every fact that made it so. Open the bundled Workbench at <https://localhost:35000> — your browser will warn about the self-signed development certificate; that is expected for the local development image. Log in with the development image's default credentials (username `Admin`, password `ChangeMeNow!` — see [Workbench development mode](https://cratis.io/chronicle/workbench/development/)), pick the `Quickstart` event store, and select **Sequences** with `event-log` selected: your `BookAdded`, `BookBorrowed`, and `BookReturned` are sitting there in order, permanent, with their event source id and timestamps. The Workbench is a bundled local browser surface for authorized inspection of Chronicle runtime state — run the program again and watch new events arrive.

## Clean up

When you are done, remove the container:

```shell
docker rm -fv chronicle
```

Deleting your `Quickstart` folder removes everything else. Event data lives in the container's own volume, which is why `-v` is there — without it the data outlives the container. Keep the image if you want to run this again, or remove it with `docker rmi` once nothing else needs it.

## Where to go next

- The [console quickstart](https://cratis.io/chronicle/get-started/console/) covers this same path in the documentation, including querying the materialized read models in MongoDB directly.
- The [tutorial](https://cratis.io/chronicle/tutorial/) builds the library domain one concept at a time — strongly-typed ids, hosts, and DI included.
- The [ASP.NET Core and Worker Service guides](https://cratis.io/chronicle/get-started/choose-hosting-model/) show the same pieces with the host's DI container doing the wiring.
- Chronicle also ships [TypeScript, Kotlin/Java (JVM), and Elixir clients](https://cratis.io/chronicle/clients/) — so the event log is not a .NET-only story.
