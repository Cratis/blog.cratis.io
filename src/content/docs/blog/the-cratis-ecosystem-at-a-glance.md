---
title: The Cratis ecosystem at a glance
date: 2026-08-28
authors: cratis-team
excerpt: What Cratis is, what Chronicle covers, and how Arc, Components, the CLI, Workbench, and the experimental model-first layer fit together — all open source and MIT licensed.
tags:
  - ecosystem
---

Cratis is an open-source, MIT-licensed platform for building event-sourced and CQRS applications. This post is a quick tour of the ecosystem: what each piece does, how the pieces fit together, and where to go to learn more.

## Chronicle: the center of the stack

At the center is [Chronicle](https://cratis.io/chronicle/), an event-sourcing database and processing runtime with a first-class client SDK for .NET and additional TypeScript, Kotlin/Java (JVM), and Elixir clients — plus pluggable storage-provider implementations including MongoDB (default), PostgreSQL, SQL Server, and SQLite.

Chronicle's kernel runs on Microsoft Orleans and exposes a language-agnostic gRPC/protobuf boundary, so any language can implement the contract. AI agents can connect to a running Chronicle through the [Chronicle MCP server](https://cratis.io/chronicle-mcp/), regardless of client language.

## Building applications: Arc and Components

- **[Arc](https://cratis.io/arc/)** — an opinionated CQRS application framework for ASP.NET Core: commands, queries, validation, authorization, and TypeScript proxy generation. Arc works without event sourcing, with optional Chronicle integration.
- **[Components](https://cratis.io/components/)** — React components for CQRS and event-sourced applications built with Arc: command dialogs, typed forms, and query-backed data tables.

## Inspecting and diagnosing: CLI and Workbench

- **[CLI](https://cratis.io/cli/)** — terminal workflows for inspecting and diagnosing Chronicle: events, observers, projections, read models, and failed partitions.
- **[Workbench](https://cratis.io/chronicle/workbench/development/)** — the web-based inspection surface for Chronicle event stores.

## The model-first layer (experimental)

Cratis also includes an experimental model-first layer, currently in early development:

- **[Studio](https://cratis.io/studio/)** — the collaborative environment for designing, visualizing, and editing Screenplay event models (experimental).
- **[Screenplay](https://cratis.io/screenplay/)** — a model-first language for event-sourced, CQRS systems — commands, events, projections — rendered by Stage into an Arc + Chronicle application (experimental).
- **Stage** — renders Screenplay models into reviewable Arc + Chronicle applications (experimental).
- **Scene** — describing a user interface without describing a platform: the UI model of the model-first layer (experimental).
- **[Prologue](https://cratis.io/prologue/)** — captures existing system behavior (SQL Server CDC, Postgres logical replication, HTTP, OTLP) into event models for the model-first layer (experimental).

## Free and open source

Everything Cratis publishes today is MIT licensed and free to use.

## Where to go next

- [The Cratis Stack](https://cratis.io/cratis-stack/) — how the pieces fit together end to end.
- [Why developers choose Cratis](https://cratis.io/why-cratis/) — the reasoning behind the stack.
- [Get started with Chronicle](https://cratis.io/chronicle/get-started/) — your first event-sourced application.
- [Samples](https://cratis.io/samples/) — runnable event sourcing and CQRS samples for the whole stack.
- [Cratis on GitHub](https://github.com/Cratis) — every repository, all open source.
- [Community and help](https://cratis.io/community/) — where to ask questions and follow along.
