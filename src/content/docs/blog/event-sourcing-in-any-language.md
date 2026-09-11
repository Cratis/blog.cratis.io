---
title: "Event sourcing in any language: how Chronicle's gRPC contract works"
date: 2026-08-28T12:00:00Z
authors: cratis-team
excerpt: Follow an event from a client call to an append response. The wire contract makes that exchange portable; serialization, compatibility, and asynchronous processing are the details a client still has to handle.
tags:
  - chronicle
  - clients
---

An event written by a .NET application should not require a .NET application to read or process it. [Chronicle](https://cratis.io/chronicle/) separates those concerns: the server implements event storage and processing, while applications connect through a gRPC/protobuf contract.

That boundary is useful, but "it uses gRPC" is not the whole explanation. A client still needs to know how to represent an event, establish compatibility, interpret a result, and distinguish a completed append from the processing that follows it.

Consider a library application recording that a member borrowed a book. Following that one operation makes the responsibilities clearer.

## From a language object to an append request

The application starts with an event such as `BookBorrowed`, containing a member name, and the event-source identifier of the book. In a .NET application that event can be a C# record. Another client can offer a different language-native representation without changing the server operation.

The client maps the call onto the append contract in [`sequences.proto`](https://github.com/Cratis/Chronicle/blob/v18.1.5/Source/Kernel/Protobuf/sequences.proto). Selected fields from `AppendRequest` show the separation of concerns:

| Field | What it identifies or carries |
| --- | --- |
| `EventStore`, `Namespace` | The runtime scope receiving the event. |
| `EventSequenceId` | The sequence being appended to. |
| `EventSourceId` | The thing whose history this fact belongs to—in this example, the book. |
| `EventType` | The event's type identity and generation. |
| `Content` | The serialized event content, carried as a string in the protobuf message. |
| `CorrelationId`, `Causation`, `CausedBy` | Context about the operation and its origin. |

This is a field summary, not a complete request. The contract also carries stream information, tags, occurrence time, subject, and concurrency scope. A new client must implement the relevant contract, not copy the subset in this table.

There are two distinct representations here: the language-level event the application uses and the wire message the server accepts. A field named `MemberName` in an application is not itself a new gRPC method. Appending different event types uses the same append operation with different event metadata and content.

## What comes back—and what does not

The service operation returns a command-result wrapper around `AppendResponse`. That response includes a sequence number, success information, and fields describing constraint violations, concurrency violations, or errors. The [append documentation](https://cratis.io/chronicle/events/appending/) explains the application-facing operation; the [wire definition](https://github.com/Cratis/Chronicle/blob/v18.1.5/Source/Kernel/Protobuf/sequences.proto) makes the envelope explicit.

The interaction is:

```text
Application event + book identifier
    → client maps the event and request context
    → protobuf request sent over gRPC
    → server handles the append
    → command result returned to the client
    → client exposes the result to the application
```

A transport-successful call is not enough to conclude that the append succeeded: the client must interpret the returned result. And a successful append is not a promise that every projection or reactor has finished. The library screen may read a materialized view that is still catching up, while a notification reactor runs separately.

That is the useful boundary: clients share an operation and its result semantics, not a guarantee that all downstream work happens before the response arrives.

## Portable transport still needs precise value mappings

Protobuf lets clients generate bindings in different languages. It does not make every language's value types interchangeable.

For example, the append envelope's `CorrelationId` uses protobuf-net's `.bcl.Guid` representation, while `EventSourceId` is a string. The [protobuf definition](https://github.com/Cratis/Chronicle/blob/v18.1.5/Source/Kernel/Protobuf/sequences.proto) determines those field encodings; two values that both represent identifiers need not have the same wire type.

Event content has its own serialization rules. Chronicle's [value contract](https://cratis.io/chronicle/contributing/clients/value-contract/) specifies canonical strings for UUID values and matching property names between event schemas and payloads. Do not confuse those domain-value rules with the protobuf envelope's field types. Generated bindings handle the envelope; the client must also serialize the event content correctly.

The portability is in shared, implementable representations. It is not the absence of implementation-specific conventions on the wire.

## Compatibility is not version equality

Before relying on that representation, a client establishes whether the server can serve the contract it expects. The [`CheckCompatibility` exchange](https://github.com/Cratis/Chronicle/blob/v18.1.5/Source/Kernel/Protobuf/clients.proto) includes the client's descriptor set; the response reports compatibility and any incompatibilities.

The server's [structural checker](https://github.com/Cratis/Chronicle/blob/v18.1.5/Source/Kernel/Compatibility/WireCompatibilityChecker.cs) asks whether the expected services, methods, messages, and fields remain compatible. Additions are allowed: a server can expose an extra operation without forcing an older client to use it. Incompatible changes to the expected surface are different and must be reported.

A new client should therefore follow the compatibility exchange, not reject every unequal version string or assume that a matching product name is sufficient.

## Where generated code ends and a client begins

For TypeScript, Kotlin/Java, and Elixir, generated contracts packages provide the wire-level bindings. The hand-maintained client above them adds the language's own conventions: decorators, annotations, asynchronous APIs, and artifact discovery. Optional hosting integrations sit above that client.

C# takes a different build and packaging path. Chronicle exports its C# contract surface as `.proto` definitions; its .NET client references the C# contracts project and packages the internal contracts with the SDK. It does not consume a separately published proto-generated contracts package in the same way as those other languages. The [layering guide](https://cratis.io/chronicle/building-a-client/layering-an-idiomatic-client/) explains this exception.

That distinction matters to contributors. Generated wire bindings are not the place to add a hand-written convenience API, and a new client should not assume C#'s packaging strategy is the pattern to copy.

## What implementing another client entails

Generating bindings gives you the transport types, not a finished SDK. The [client-building checklist](https://cratis.io/chronicle/building-a-client/checklist/) also covers authentication, token renewal, connection lifecycle, discovery, and reconnecting. An application-friendly client must expose failures in a way its users can handle.

Start with one narrow operation: authenticate, establish compatibility, register the necessary event metadata, append one event, and inspect the result. Then test an unsuccessful append and a disconnected server. Expand the idiomatic API only once the underlying exchanges behave as expected.

If your language already has a client, use its [SDK documentation](https://cratis.io/chronicle/clients/) rather than implementing this plumbing again:

- [.NET](https://cratis.io/event-sourcing/dotnet/) — `Cratis.Chronicle` on NuGet.
- [TypeScript and Node.js](https://cratis.io/event-sourcing/typescript/) — `@cratis/chronicle` on npm.
- [Kotlin and Java](https://cratis.io/event-sourcing/kotlin/) — `io.cratis:chronicle` on Maven Central.
- [Elixir](https://cratis.io/event-sourcing/elixir/) — `cratis_chronicle` on Hex.

Those clients share a wire contract, not an identical feature set. Check the operations you need. The reason to use the boundary is to avoid porting a database—not to pretend that implementing and maintaining a client has no cost.

*Updated September 11, 2026.*
