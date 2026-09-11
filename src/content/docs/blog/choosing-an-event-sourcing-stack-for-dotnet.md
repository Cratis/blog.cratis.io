---
title: "Choosing an event sourcing stack for .NET: start with the boundaries"
date: 2026-08-28
authors: cratis-team
excerpt: KurrentDB, Marten, and Cratis Chronicle put event storage and processing in different places. Work through the process, transaction, and operating boundaries before comparing feature lists.
tags:
  - chronicle
  - event-sourcing
---

Choosing an event store also means choosing where part of your application will run. Will event processing live inside your application process, or behind a separate server? Must a read model change in the same transaction as an append, or can it catch up later? Who operates each part?

Those questions are more useful than a feature count. [KurrentDB](https://docs.kurrent.io), [Marten](https://martendb.io), and [Cratis Chronicle](https://cratis.io/chronicle/) all support event-sourced systems, but they do not draw the same boundaries.

This is an architectural decision guide, not a benchmark or a claim that we have tested every integration. The [source-cited comparison](https://cratis.io/compare-event-sourcing-dotnet/) records the product versions and documentation behind the detailed matrix. Check that baseline against the release and deployment you intend to use.

## First, compare the same responsibility

| Question | KurrentDB | Marten | Chronicle |
| --- | --- | --- | --- |
| Where does the product run? | A separate event database server. | A .NET library inside your application, backed by PostgreSQL. | A separate event-sourcing server and processing runtime. |
| How are read models produced? | Built-in and user-defined JavaScript projections can emit or link events; subscriptions can feed application-specific read models. | Inline, asynchronous, and live projections support different consistency needs. | Declarative projections and reducers produce read models. |
| How does application work consume events? | Catch-up or server-managed persistent subscriptions. | Subscriptions through the asynchronous daemon. | Reactors and observers, alongside projection and reducer processing. |
| Which language boundary is exposed? | Official gRPC clients for several languages. | .NET application APIs. | Client SDKs for .NET, TypeScript, Kotlin/Java, and Elixir. |

These are summaries of the [documented product boundaries](https://cratis.io/compare-event-sourcing-dotnet/), not proof that similarly named features have identical delivery or consistency semantics. In particular, a projection that emits another event and a projection that updates a database document solve different parts of a read-model workflow.

## Scenario 1: the read model must change with the append

Imagine an order workflow whose next operation must immediately read a summary containing the event just appended. Before choosing a product, decide whether that requirement is a transaction boundary or merely a UI preference.

Marten's [inline projections](https://martendb.io/events/projections/) run in the event-capture transaction. That is a concrete reason to evaluate it when both the application and its data belong in PostgreSQL. Its asynchronous and live projection options make different trade-offs; they are not interchangeable substitutes for inline processing.

With a separate event server, explicitly investigate the acknowledgement and read paths. Does a successful append mean the event was accepted, or that the particular read model you are about to query is ready? In Chronicle's [projection model](https://cratis.io/chronicle/projections/), do not assume an asynchronous materialized view is current simply because the append succeeded. With KurrentDB, distinguish its [server projections](https://docs.kurrent.io/server/v26.0/features/projections/) from a separate read database maintained by your subscriber.

**Decision:** write down the required transaction and consistency boundary before comparing projection syntax. If eventual consistency is acceptable, decide what the application displays while a view catches up and how it detects failed processing.

## Scenario 2: several applications need a shared event service

Suppose a .NET service writes events while another application consumes them in a different language. A dedicated server becomes an explicit architectural option rather than simply another package dependency.

KurrentDB documents [persistent subscriptions](https://docs.kurrent.io/server/v26.0/features/persistent-subscriptions.html) with server-managed position, consumer groups, acknowledgements, retries, and parked events. Its [Connectors](https://docs.kurrent.io/server/v26.0/features/connectors/) provide another path from stored events to external systems. Those are relevant strengths when you want event infrastructure while retaining your own application architecture.

Chronicle also places storage and processing behind a server boundary. Its client model includes [reactors](https://cratis.io/chronicle/reactors/), [reducers](https://cratis.io/chronicle/reducers/), and declarative projections. Evaluate whether that programming model fits the work your services need to perform, and check the capabilities of each [language client](https://cratis.io/chronicle/clients/) you intend to use.

Marten instead keeps its APIs and processing in the .NET application. That can be a useful boundary: your application owns how other services interact with it. It is not itself a language-neutral event-server API.

**Decision:** evaluate the exact producer and consumer paths, including authentication, retry behavior, ordering, and recovery. A client package existing in a registry does not establish feature parity or interoperability with every server release.

## Scenario 3: the application framework is part of the choice

The event store may be only one part of the decision. You may also want HTTP handling, durable messaging, generated frontend clients, or a shared command/query model.

Here, comparing Marten alone with the whole Cratis ecosystem would be misleading. Marten belongs to the [Critter Stack](https://jasperfx.net); [Wolverine](https://wolverinefx.net) provides messaging and web-development capabilities, including documented failure policies and persistent inbox/outbox messaging. Those are separate products, but they belong in an evaluation whose scope includes those responsibilities.

Likewise, Chronicle is not Arc. [Arc](https://cratis.io/arc/) adds a CQRS application model and generated TypeScript proxies, while [Components](https://cratis.io/components/) supplies React components aligned with those patterns. Chronicle can be used without either. KurrentDB can sit beneath an application stack you choose independently.

**Decision:** compare complete candidate arrangements using the same checklist. Name which product handles commands, messages, UI contracts, and failures. Product-family membership alone does not prove integration compatibility or eliminate configuration and operational work.

## What the comparison cannot decide for you

A documentation comparison cannot establish the performance or reliability of your deployment. For each candidate, test the same representative workload and failure cases:

- append an event, then check what a reader can observe immediately and later;
- interrupt a consumer and verify how it resumes, retries, and exposes failed work;
- replay a projection and check its state, including handling of external side effects;
- exercise the backup, restore, and upgrade procedures you plan to operate;
- verify authorization, tenancy, and the treatment of sensitive event data.

Check commercial boundaries separately too. Marten and Chronicle are MIT licensed. KurrentDB uses the Kurrent License v1, which its maintainers state is not OSI-approved open source; some features require a license key. The [comparison's license sources](https://cratis.io/compare-event-sourcing-dotnet/) identify those distinctions. A license label is not a substitute for reviewing the terms of the products you actually deploy.

## Make the decision concrete

Start with a short description of your system: its languages, accepted database dependencies, required consistency, and who owns operations. Choose two plausible arrangements, run the same small workflow through both, and deliberately interrupt it.

Marten deserves attention when an in-process .NET and PostgreSQL boundary fits. KurrentDB deserves attention when a dedicated event database, subscriptions, and connectors fit. Chronicle deserves attention when its separate runtime and event-processing model fit. The useful answer is the one whose responsibilities and trade-offs your team can explain—not the one with the longest product list.

*Updated September 11, 2026.*
