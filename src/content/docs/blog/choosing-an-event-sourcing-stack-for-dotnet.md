---
title: "Choosing an event sourcing stack for .NET 10: an honest comparison"
date: 2026-08-28
authors: cratis-team
excerpt: "Most .NET 10 event sourcing comparisons reduce to popularity. We compiled a version-pinned, source-cited comparison of KurrentDB, Marten, and Cratis Chronicle instead — every row reproducible from public documentation, with the same rules applied to our own product. Here's how to use it."
tags:
  - chronicle
  - event-sourcing
---

Choosing an event sourcing foundation for a .NET 10 system is a long-lived decision. The event store outlives frameworks, UI rewrites, and often the team that chose it. Yet most comparisons available today reduce to popularity: the tools with the most blog posts win the evaluation before it starts.

We wanted something more useful — for you and, honestly, for us. So we compiled a comparison where every factual row names the exact versions compared and is reproducible from public documentation and released packages. Where our own product appears, the same rules apply, including the limitations.

The full matrix lives on cratis.io, and that page is the source of truth: **[Event sourcing in .NET: comparing KurrentDB, Marten, and Cratis Chronicle](https://cratis.io/compare-event-sourcing-dotnet/)**. This post is the walk-through.

## The rules we set ourselves

Before writing a single row, we fixed the method:

- **Released, verifiable facts only.** Every cell is cited from the named tool's own public documentation, repository, or package-registry listing, at a named version, with the retrieval date recorded.
- **No performance, maturity, or superiority claims.** Not "faster", not "more mature", not "production-proven", not "best" — for any tool, including our own. Those claims need benchmarks and evidence a documentation comparison does not carry.
- **Caveats stay visible.** The published page carries its limitations section in full: the matrix compares documentation, not behavior; a listed client package says nothing about feature parity; versions move.
- **A refresh promise.** The matrix is re-verified when a compared tool ships a new major or minor release, changes its license or client list, or 90 days pass. If a compared tool disputes a row we cannot re-verify, we correct or remove it.

If a comparison cannot survive those rules, it is marketing, not a comparison.

## The candidates, in one paragraph each

**[KurrentDB](https://docs.kurrent.io) (formerly EventStoreDB)** is a purpose-built event store database — events live in streams inside its own storage engine, with official gRPC clients for several languages. You bring your own CQRS layer and read-model infrastructure. It is licensed under the Kurrent License v1, which its own documentation notes is not an OSI-approved open source license.

**[Marten](https://martendb.io)** is a .NET library that turns PostgreSQL into a document and event store. It runs inside your application process, leans on PostgreSQL's JSON support and ACID compliance, and has rich projection support — inline, async, and live. MIT licensed; PostgreSQL is a prerequisite and .NET is the boundary.

**[Cratis Chronicle](https://cratis.io/chronicle/)** is an event-sourcing database and processing runtime: a separate .NET 10 server with a first-class .NET 10 SDK, released TypeScript, Java/Kotlin (JVM), and Elixir client packages, and a Python client coming soon (pre-alpha, unpublished, no commitment implied). MIT licensed. It pairs with Arc for CQRS and generated TypeScript proxies, and a React component library.

The [canonical matrix](https://cratis.io/compare-event-sourcing-dotnet/) pins the exact versions used for each row and cites every row. The Chronicle descriptions here were rechecked on .NET 10 against Chronicle Server and the .NET client at 18.1.3, the latest stable release when this post was revised.

## You're choosing an ecosystem, not only a database

Here is the part most comparisons skip: none of these tools lives alone. The event store is the center of a decision, but rarely the whole of it — around every store sits the layer you build applications with, the tooling you operate with, and the path events take to the rest of your architecture. Comparing the stores cell by cell and stopping there would miss where much of your time actually goes.

So the [canonical matrix](https://cratis.io/compare-event-sourcing-dotnet/) now carries an ecosystem section, compiled under the same rules — every cell restates the vendor's own listing, with retrieval dates, and crowns nobody:

- **KurrentDB** documents a server-side Connectors subsystem — pre-installed and enabled by default — that runs catch-up subscriptions and pushes filtered or transformed events to external systems through sinks, with a documented catalog covering Elasticsearch, HTTP, Kafka, MongoDB, RabbitMQ, and Serilog.
- **Marten** is one member of JasperFx's [Critter Stack](https://jasperfx.net), described by its maintainers as one family of .NET tools for event sourcing, document storage, and messaging: Wolverine for messaging, Polecat, Fisher, Weasel, Alba, and CritterWatch alongside Marten itself.
- **Cratis Chronicle** is part of the Cratis ecosystem: [Arc](https://cratis.io/arc/) for .NET 10 CQRS with generated TypeScript proxies, [Components](https://cratis.io/components/) for React, the [CLI](https://cratis.io/cli/) and the Web Workbench for operating the store, released clients for .NET 10, TypeScript, JVM, and Elixir, and free [AI skills, rules, and diagnostics](https://cratis.io/ai/) that teach an assistant the platform's conventions.

None of this makes any tool better. It changes what you are evaluating. If you pick a store, you are also picking — or committing to build — everything around it: ask what surrounds each candidate, who maintains it, and how much of it you would otherwise write yourself. The ecosystem rows on the comparison page carry citations and retrieval dates so you can verify each listing the same way you verify a storage row.

## How to actually choose

The matrix deliberately does not crown a winner. Instead, ask fit questions:

- **Do you want a dedicated event database and your own application layer?** A purpose-built store with bring-your-own CQRS gives maximum control and maximum assembly work.
- **Are you a PostgreSQL shop wanting minimum new infrastructure?** A library-on-PostgreSQL approach is hard to beat for operational simplicity.
- **Do you want event sourcing, CQRS, and frontend integration designed together?** An integrated platform trades some flexibility for coherence: projections, read models, generated frontend contracts, and query updates that share one design. That trade-off is real — coherence and lock-in concerns are two views of the same property, and you should weigh both.
- **Is your organization polyglot?** Check which client languages are first-party and what each client actually supports. Client existence is not client parity — for any tool, including ours.
- **Who explains the system at 3 a.m.?** Compare the operational surfaces: what does each tool show you about subscription progress, failed projections, and replay?

None of these questions has a universal answer. A team that answers "PostgreSQL shop, .NET only, minimal infrastructure" is describing Marten's sweet spot. A team that wants a dedicated event database under a stack they assemble themselves is describing KurrentDB's. A team that wants the store, the CQRS layer, and the frontend contract designed together is describing Chronicle's.

## Verify us

Every row on the [comparison page](https://cratis.io/compare-event-sourcing-dotnet/) carries its source and retrieval date precisely so you do not have to take our word for it. Open the cited documentation, check the cell, and if you find one that no longer matches its source, [tell us](https://cratis.io/feedback/) — we will re-verify and fix it.

That is the comparison we wished existed when we started. Use it, argue with it, and hold us to the refresh promise.
