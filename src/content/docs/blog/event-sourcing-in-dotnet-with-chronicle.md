---
title: "Event sourcing in .NET with Chronicle: from zero to first projection"
date: 2026-08-28T18:00:00Z
authors: cratis-team
excerpt: Run Chronicle locally in one container, append your first events from a plain .NET console app, and watch them become read models.
tags:
  - chronicle
  - event-sourcing
---

Event sourcing has a reputation for heavy setup: a store, a bus, projections infrastructure, and a day of wiring before the first event lands. This post takes the shortest honest path instead: one Docker container, one console project, and C# that appends events, projects them into read models, and reacts to them — with the full event history inspectable in a browser at the end.

## Prerequisites and tested environment

You need Docker, the .NET SDK named below, and a terminal with `curl`. Keep the five source files in the same console project. No application framework or frontend is required.

Verified on **2026-09-11** using Linux/arm64 containers: the five source files below compiled without warnings and ran twice against the same server, checking the projection states and reactor signal.

| Piece | Tested version |
| --- | --- |
| Chronicle server | [18.1.5](https://github.com/Cratis/Chronicle/releases/tag/v18.1.5), bundled development image |
| Image manifest digest | `sha256:360cf3a31216d15d61cc2dae27ad1ac3435fb44c2de7936ac20be4be39596554` |
| Client package | [`Cratis.Chronicle` 18.1.5](https://www.nuget.org/packages/Cratis.Chronicle/18.1.5) |
| .NET SDK / target | `10.0.401` / `net10.0` |

## What you will build

A minimal .NET console application for a tiny library domain: a book arrives, gets borrowed, and comes back. Each of those facts is an event appended to [Chronicle's](https://cratis.io/chronicle/) event log. Two read models are projected from those events — declaratively, with no update code — and a reactor observes a book's return. At the end you open the bundled Workbench and see the whole history.

## 1. Run Chronicle

The development image bundles the Chronicle kernel and its MongoDB storage in a single container — no separate database setup. Start it bound to loopback only. The digest pins the tested image:

```shell
docker run -d --name chronicle-blog-demo \
  -p 127.0.0.1:35000:35000 \
  cratis/chronicle@sha256:360cf3a31216d15d61cc2dae27ad1ac3435fb44c2de7936ac20be4be39596554
```

Wait for the HTTP endpoint to respond:

```shell
curl --insecure --fail --silent --show-error \
  --retry 30 --retry-all-errors --retry-delay 1 --retry-max-time 60 \
  --connect-timeout 2 --max-time 5 \
  https://localhost:35000/ --output /dev/null
```

This requires a `curl` installation with `--retry-all-errors` support. That flag also retries temporary TLS handshake failures during startup; the retry window is bounded to a minute, with each request limited to five seconds. `--insecure` is for this loopback-only development server's self-signed certificate. Do not carry that setting into a production connection. An HTTP response confirms the endpoint is up, not that all event processing is complete; the application checks below cover the specific operations we need.

If startup fails, inspect `docker logs chronicle-blog-demo`. If port `35000` or that container name is already occupied, resolve the conflict without removing another application's container. The [hosting documentation](https://cratis.io/chronicle/hosting/) covers deployment beyond this local setup.

## 2. Create the application

Select the tested SDK explicitly and install the matching client:

```shell
mkdir Quickstart && cd Quickstart
dotnet new globaljson --sdk-version 10.0.401 --roll-forward disable
dotnet new console --framework net10.0
dotnet add package Cratis.Chronicle --version 18.1.5
```

If the SDK is missing, install it before continuing; `global.json` deliberately prevents silently using another SDK. Leave the generated project settings, including implicit usings, enabled.

## 3. Define the events

Events are immutable facts, modeled as records marked with `[EventType]`. The attribute is how Chronicle discovers the type. Save this as `Events.cs`:

```csharp
using Cratis.Chronicle.Events;

[EventType]
public record BookAdded(string Title, string Isbn);

[EventType]
public record BookBorrowed(string MemberName);

[EventType]
public record BookReturned;
```

`BookReturned` carries no data at all. That it happened, on a particular book's stream, is the whole story — not every fact needs a payload. This example appends the facts directly; a full lending application would validate the borrowing request first.

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

When a `BookBorrowed` lands, a `BorrowedBook` appears; when the matching `BookReturned` arrives, it is removed. No flag to maintain, no filter to remember. The [projection documentation](https://cratis.io/chronicle/projections/) covers these mappings in more detail.

## 5. React to an event

When you need to react to a fact — notify someone, call another system — you write a reactor. `IReactor` is a marker interface; add a method whose first parameter is the event you care about, and Chronicle routes matching events to it. Save this as `BookReturnedNotifier.cs`:

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
        if (context.EventSourceId.ToString() == BookToObserve.ToString())
        {
            Console.WriteLine("Reactor observed the book return.");
            Observed.TrySetResult();
        }
        return Task.CompletedTask;
    }
}
```

This [reactor](https://cratis.io/chronicle/reactors/) prints a message when the book is returned. The completion signal lets the console program wait for that observation before exiting. In a real notification handler, make the external action safe to retry; printing this message is not the same as delivering an email.

## 6. Connect, append, and query

Now the program that ties it together. In this console app there is no host or DI container, so you create the `ChronicleClient` yourself, open an event store, and explicitly ask Chronicle to discover and register the artifacts you just defined. Replace the generated `Program.cs` with this code. It checks each append result and waits for the corresponding read models, with a timeout if processing does not complete:

```csharp
using Cratis.Chronicle;
using Cratis.Chronicle.Connections;

using var client = new ChronicleClient(ChronicleConnectionString.Development);
var eventStore = await client.GetEventStore("Quickstart");
var bookId = Guid.NewGuid();
const string title = "The Pragmatic Programmer";
const string isbn = "978-0135957059";
BookReturnedNotifier.BookToObserve = bookId;

await eventStore.DiscoverAll();
await eventStore.RegisterAll();

var result = await eventStore.EventLog.Append(bookId, new BookAdded(title, isbn));
if (!result.IsSuccess)
{
    throw new InvalidOperationException("BookAdded was not accepted.");
}
await WaitFor(
    () => eventStore.ReadModels.GetInstances<Book>(),
    books => books.Any(book => MatchesBook(book, false, null)),
    "the newly added book");
Console.WriteLine("Added: title and ISBN match; OnLoan=False; BorrowedBy=null.");

result = await eventStore.EventLog.Append(bookId, new BookBorrowed("Jane Doe"));
if (!result.IsSuccess)
{
    throw new InvalidOperationException("BookBorrowed was not accepted.");
}
await WaitFor(
    () => eventStore.ReadModels.GetInstances<Book>(),
    books => books.Any(book => MatchesBook(book, true, "Jane Doe")),
    "the borrowed book");
await WaitFor(
    () => eventStore.ReadModels.GetInstances<BorrowedBook>(),
    loans => loans.Any(loan => loan.Id == bookId && loan.MemberName == "Jane Doe"),
    "the active loan");
Console.WriteLine("Borrowed: OnLoan=True; BorrowedBy=Jane Doe; active loan exists.");

result = await eventStore.EventLog.Append(bookId, new BookReturned());
if (!result.IsSuccess)
{
    throw new InvalidOperationException("BookReturned was not accepted.");
}
await WaitFor(
    () => eventStore.ReadModels.GetInstances<Book>(),
    books => books.Any(book => MatchesBook(book, false, null)),
    "the returned book with its borrower cleared");
await WaitFor(
    () => eventStore.ReadModels.GetInstances<BorrowedBook>(),
    loans => loans.All(loan => loan.Id != bookId),
    "removal of the active loan");
Console.WriteLine("Returned: OnLoan=False; BorrowedBy=null; active loan removed.");

await BookReturnedNotifier.Observed.Task.WaitAsync(TimeSpan.FromSeconds(30));
Console.WriteLine("Verified projection states and reactor observation.");

bool MatchesBook(Book book, bool onLoan, string? borrowedBy) =>
    book.Id == bookId && book.Title == title && book.Isbn == isbn &&
    book.OnLoan == onLoan && book.BorrowedBy == borrowedBy;

static async Task WaitFor<T>(Func<Task<T>> read, Func<T, bool> ready, string description)
{
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    try
    {
        while (true)
        {
            var state = await read().WaitAsync(timeout.Token);
            if (ready(state))
            {
                return;
            }
            await Task.Delay(200, timeout.Token);
        }
    }
    catch (OperationCanceledException) when (timeout.IsCancellationRequested)
    {
        throw new TimeoutException($"Timed out waiting for {description}.");
    }
}
```

`ChronicleConnectionString.Development` points at the local development kernel on `chronicle://localhost:35000` with the built-in development credentials. The event source id (`bookId`) is the identity of the thing each fact is about; every event appended against it becomes part of that book's stream of history.

For these materialized models, `GetInstances` reads the stored projection results; it does **not** replay the full history on every call. Other read-model modes have different behavior, described in the [read-model documentation](https://cratis.io/chronicle/read-models/). An append and a projection update are separate operations, so lag can occur after any append—not only during startup.

`WaitFor` keeps querying until the expected state appears, giving up after thirty seconds. This bounds the console program's wait, although a request already in flight may still complete. Reading all instances keeps this small example simple; a large store would need a more selective query.

With the five files in the project, run it:

```shell
dotnet run
```

The application prints these checkpoints. The reactor line can appear before or after the returned-view line because those observers run independently:

```text
Added: title and ISBN match; OnLoan=False; BorrowedBy=null.
Borrowed: OnLoan=True; BorrowedBy=Jane Doe; active loan exists.
Reactor observed the book return.
Returned: OnLoan=False; BorrowedBy=null; active loan removed.
Verified projection states and reactor observation.
```

That is the whole loop — append, project, react. The book's `OnLoan` flag flipped, the `BorrowedBook` appeared and disappeared, and the reactor fired — and you never wrote an update statement.

A second run creates a new book identifier and checks only that book. It adds more history to the same store.

If an append is rejected, the program stops. If a view or reactor times out, inspect the container logs and observer state before increasing the wait. The checks cover this add–borrow–return sequence; they do not test server outages or external notification delivery.

## 7. See the history

State-based storage shows you what the data is. Chronicle also shows you every fact that made it so. Open the bundled Workbench at <https://localhost:35000>. Its self-signed certificate may trigger a browser warning; this is the local development endpoint, not a production certificate configuration. Sign in with the development image's defaults: username `Admin`, password `ChangeMeNow!`.

Select `Quickstart`, keep the `Default` namespace selected, and open **Sequences** with `event-log` selected. You should see the three event types in append order for each book created by the runs. These credentials are for the local exercise only; the [Workbench development guide](https://cratis.io/chronicle/workbench/development/) explains that setup.

## Clean up

When you are done, remove the container created for this exercise:

```shell
docker rm -fv chronicle-blog-demo
```

`-v` also removes anonymous volumes associated with that container. Named volumes or host-mounted directories, if you added any, need separate, deliberate handling. The command does not remove the shared Docker image. You may also delete the `Quickstart` project folder when you no longer need its source.

## Where to go next

- The [console quickstart](https://cratis.io/chronicle/get-started/console/) covers this same path in the documentation, including querying the materialized read models in MongoDB directly.
- The [tutorial](https://cratis.io/chronicle/tutorial/) builds the library domain one concept at a time — strongly-typed ids, hosts, and DI included.
- The [ASP.NET Core and Worker Service guides](https://cratis.io/chronicle/get-started/choose-hosting-model/) show the same pieces with the host's DI container doing the wiring.
- Chronicle also ships [TypeScript, Kotlin/Java (JVM), and Elixir clients](https://cratis.io/chronicle/clients/) — so the event log is not a .NET-only story.
