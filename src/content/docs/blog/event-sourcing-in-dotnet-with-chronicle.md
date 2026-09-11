---
title: "Event sourcing in .NET with Chronicle: from zero to first projection"
date: 2026-08-28T18:00:00Z
authors: cratis-team
excerpt: Append events from a console app, check the resulting read models, and observe a reactor. Follow a book from arrival through borrowing and return—with explicit checks instead of timing assumptions.
tags:
  - chronicle
  - event-sourcing
---

A library needs to know which books are on loan. Storing only an `OnLoan` flag answers that question, but loses the sequence of borrowing and return that produced it. With event sourcing, the facts are stored separately from the views used to answer questions.

This example appends three facts—`BookAdded`, `BookBorrowed`, and `BookReturned`—to [Chronicle](https://cratis.io/chronicle/). Two projections turn them into read models, and a reactor observes the return. We will check the state after each step rather than assume that a successful append means every observer has finished.

## Prerequisites and tested environment

You need Docker, the .NET SDK named below, and a terminal with `curl`. Keep the five source files in the same console project. No application framework or frontend is required.

Verified on **2026-09-11** using Linux/arm64 containers: the five source files below compiled without warnings and ran twice against the same server, checking the projection states and reactor signal. Exact versions are recorded here for reproduction, not as a requirement to use them indefinitely.

| Piece | Tested version |
| --- | --- |
| Chronicle server | [18.1.5](https://github.com/Cratis/Chronicle/releases/tag/v18.1.5), bundled development image |
| Image manifest digest | `sha256:360cf3a31216d15d61cc2dae27ad1ac3435fb44c2de7936ac20be4be39596554` |
| Client package | [`Cratis.Chronicle` 18.1.5](https://www.nuget.org/packages/Cratis.Chronicle/18.1.5) |
| .NET SDK / target | `10.0.401` / `net10.0` |

## 1. Start the local server

The development image bundles Chronicle and MongoDB. Bind its HTTPS port to loopback so it is not published to the surrounding network. The digest pins the image rather than relying on a moving tag:

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

## 3. Define the facts

Save this as `Events.cs`:

```csharp
using Cratis.Chronicle.Events;

[EventType]
public record BookAdded(string Title, string Isbn);

[EventType]
public record BookBorrowed(string MemberName);

[EventType]
public record BookReturned;
```

The `[EventType]` attribute makes the records discoverable by Chronicle. The event-source identifier, passed separately when appending, ties all three facts to the same book. `BookReturned` needs no payload in this example: the event type and book identifier are enough to say what happened.

These records describe facts, not permission to perform an action. A real borrowing workflow must first decide whether the loan is allowed; the example does not implement business rules such as rejecting a second simultaneous borrower.

## 4. Define the views

Save this as `Book.cs`:

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

`BookAdded` creates the view. `Title` and `Isbn` map by name. Borrowing sets `OnLoan` and the current borrower; returning clears both. Clearing `BorrowedBy` matters: leaving it unchanged would turn a field that appears to describe the current loan into an undocumented record of the last borrower.

The second view contains only active loans. Save this as `BorrowedBook.cs`:

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

A borrow creates the entry; the matching return removes it. The view changes, but the original events remain in the event log. These are [model-bound projections](https://cratis.io/chronicle/projections/), not application code issuing database updates.

## 5. Observe the return

Save this as `BookReturnedNotifier.cs`:

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

The [reactor](https://cratis.io/chronicle/reactors/) method receives the event and its context. Here it only prints a message and signals that this process observed the return for the current book. The signal is test scaffolding, not persistent application state or a notification-delivery mechanism.

Sending an email or calling another service would introduce another failure boundary. Design those effects for retries and idempotency; this console example does not demonstrate exactly-once delivery.

## 6. Append, wait for the expected state, and check it

Replace `Program.cs` with the following. It checks each append result, then waits for the corresponding materialized views. Every wait has a timeout so a failure does not silently become a successful-looking run.

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

`ChronicleConnectionString.Development` selects the local development endpoint and credentials. Discovery and registration make the event types, projections, and reactor known to Chronicle.

For these materialized models, `GetInstances` reads the stored projection results; it does **not** replay the full history on every call. Other read-model modes have different behavior, described in the [read-model documentation](https://cratis.io/chronicle/read-models/). An append and a projection update are separate operations, so lag can occur after any append—not only during startup.

The helper polls for a specific state rather than sleeping once and hoping. Its timeout is a demo limit, not a performance promise. It bounds how long this program waits; it does not guarantee cancellation of an underlying request already in flight. Reading all instances is convenient for this small example, not an efficient polling strategy for a large store.

## 7. Run it and interpret the result

With the five files in the project, run:

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

A second run creates a new book identifier and checks only that book. It adds more history to the same store; it does not reset or deduplicate the previous run.

If an append is rejected, the program stops rather than querying as though it succeeded. If a view or reactor does not reach the expected state before the timeout, inspect the container logs and observer state. Increasing the timeout alone does not establish that the processing is correct. The example checks the happy-path state transitions; it is not a test suite for rejected business commands, server outages, or external notification delivery.

## Inspect the history and clean up

Open the bundled Workbench at <https://localhost:35000>. Its self-signed certificate may trigger a browser warning; this is the local development endpoint, not a production certificate configuration. Sign in with the development image's defaults: username `Admin`, password `ChangeMeNow!`.

Select `Quickstart`, keep the `Default` namespace selected, and open **Sequences** with `event-log` selected. You should see the three event types in append order for each book created by the runs. These credentials are for the local exercise only; the [Workbench development guide](https://cratis.io/chronicle/workbench/development/) explains that setup.

When finished, remove only the container created for this exercise:

```shell
docker rm -fv chronicle-blog-demo
```

`-v` also removes anonymous volumes associated with that container. Named volumes or host-mounted directories, if you added any, need separate, deliberate handling. The command does not remove the shared Docker image. You may also delete the `Quickstart` project folder when you no longer need its source.

You have now separated three concerns: the recorded facts, the views derived from them, and work triggered by them. The [full tutorial](https://cratis.io/chronicle/tutorial/) develops the application further; the [hosting-model guides](https://cratis.io/chronicle/get-started/choose-hosting-model/) show how to integrate the same pieces with an application's host and dependency injection.
