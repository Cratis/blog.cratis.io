---
title: The Cratis ecosystem at a glance
date: 2026-08-28
authors: cratis-team
excerpt: Start with Chronicle and a client SDK, then add application and operating tools where you need them. A practical guide to which parts of Cratis do what—and which are optional.
tags:
  - ecosystem
---

You do not need the whole Cratis ecosystem to use event sourcing. The starting point is [Chronicle](https://cratis.io/chronicle/) and a client SDK. The other products address separate concerns: handling application requests, building a frontend, and understanding what the running system is doing.

To see the boundaries, consider a library application. A member borrows a book, the application records that fact, and a screen shows which books are on loan. Those are related steps, but they are not the same responsibility.

## Store the facts: Chronicle and a client

Chronicle stores events and processes them into read models. Your application decides whether borrowing a book is allowed; after that decision, it appends a `BookBorrowed` event through a client SDK. A projection can use that event to update a view of the books currently on loan.

The distinction matters: storing a fact is not the same as accepting a command. A useful application still needs business rules, and the reader-facing view may update asynchronously after the event is appended.

Chronicle runs as a separate server. Its kernel uses .NET and Microsoft Orleans, while client SDKs are available for .NET, TypeScript, Kotlin/Java, and Elixir. The gRPC/protobuf boundary allows those clients to use the same server without sharing its implementation language. Client availability does not mean every SDK exposes identical features; check the [client documentation](https://cratis.io/chronicle/clients/) for the operations you need.

Storage is pluggable. MongoDB is the default, with PostgreSQL, SQL Server, and SQLite providers also available. That is a choice of implementations, not a promise that their operational characteristics are interchangeable.

**Start here:** the [console quickstart](https://cratis.io/chronicle/get-started/console/) demonstrates Chronicle without an application framework or frontend.

## Handle application requests: Arc, optionally

In the library example, `BorrowBook` is a request to do something; `BookBorrowed` records that it happened. [Arc](https://cratis.io/arc/) provides a CQRS application framework for ASP.NET Core, including commands, queries, validation, authorization, and generated TypeScript proxies.

Arc gives those application-facing concerns a common structure. It does not replace the business decision about whether a member may borrow a particular book.

You can use Chronicle from an existing application without adopting Arc. You can also use Arc without event sourcing. Add it when its command/query model fits the application you want to build, not because Chronicle requires it.

## Build the screen: Components, optionally

The frontend needs to issue a borrowing request and display the resulting state. [Components](https://cratis.io/components/) provides React components aligned with Arc's command and query patterns, including command dialogs, typed forms, and query-backed tables.

That is a frontend choice, not a requirement of the event store. A console application, another UI framework, or an existing frontend can still use Chronicle through its application backend. A screen must also account for the difference between a successful command and an asynchronously updated read model.

## Understand the running system

Suppose the borrowing request succeeded, but the book has not appeared in the view. First distinguish the questions: was the event appended, and did the relevant processing complete?

- **[Workbench](https://cratis.io/chronicle/workbench/development/)** is the browser-based inspection surface bundled with the development server. Use it to inspect event history and runtime state.
- **[Cratis CLI](https://cratis.io/cli/)** provides terminal workflows for inspecting events, observers, projections, read models, and failed processing.
- **[Chronicle MCP server](https://cratis.io/chronicle-mcp/)** exposes an integration point for AI-assisted interaction with Chronicle. It is optional and separate from the client SDK your application uses.

These tools help explain the system's state. They do not remove the need to decide how your application handles delays and failures.

## Keep experimental tooling separate from the starting path

The experimental model-first tools explore a different authoring approach: describe an application model and generate application code from it. [Screenplay](https://cratis.io/screenplay/) describes event-sourced and CQRS models; Stage renders those models into applications, while [Studio](https://cratis.io/studio/) provides a modeling environment.

You do not need this layer for the library example—or to adopt Chronicle, Arc, or Components. Evaluate its release status and integration compatibility separately from the established client-and-server path.

## Choose the smallest useful starting point

For an existing application, start by appending one event and reading one projection with [Chronicle and a client](https://cratis.io/chronicle/get-started/). Consider Arc if you also want its command/query application model, and Components if you are building a React frontend around those patterns. Add operating tools as you need to inspect and diagnose the system.

Cratis is open source and MIT licensed. The [samples](https://cratis.io/samples/) and [stack guide](https://cratis.io/cratis-stack/) provide the next level of detail; use them to explore the part you need rather than adopting every product at once.

*Updated September 11, 2026.*
