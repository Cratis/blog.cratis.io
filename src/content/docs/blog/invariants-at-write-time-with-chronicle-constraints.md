---
title: "Invariants at write time: how Chronicle constraints work"
date: 2026-09-10
authors: cratis-team
excerpt: The classic way to enforce uniqueness in an event-sourced system — check a read model, then append — loses races by design. Chronicle constraints move the check into the kernel, and in doing so put the Dynamic Consistency Boundary to work.
tags:
  - chronicle
  - event-sourcing
---

Every event-sourced system runs into the same question sooner or later: two commands both want to register the same username, and only one of them can win. In a CRUD system you would put a unique index on the column and let the database decide. In an event-sourced system the equivalent move is not obvious — the log is append-only, the read model you would check against is eventually consistent, and the decision has already been made by the time the append reaches the store.

[Chronicle](https://cratis.io/chronicle/) answers this with **constraints**: rules that the kernel evaluates at append time, on the event store itself, before an event is committed. This post walks through what constraints are, why they sit where they sit, and how they connect to the Dynamic Consistency Boundary — the idea that the decision you are making, not an aggregate you happen to have, should define what must be consistent.

## The check you can't trust

The obvious approach to uniqueness is to read before you write: query the read model, see the email is free, append `UserRegistered`. The trouble is the gap between those two steps. Projections update *after* the append — usually within milliseconds, but "usually" is not a guarantee. Two commands can both read an email as free, both decide to register, and both append. Nothing in the read path ever notices.

The traditional fix is to tighten the consistency scope until the race disappears: load the whole aggregate for that email, make the decision against it, and rely on optimistic concurrency to serialize the contenders. That works — and for decisions that genuinely belong to one entity it is the right shape. But it couples the decision to a fixed boundary whether or not the decision needs one. Invariants like "this username is taken" are not about one user; they are about every user, ever registered.

## The boundary belongs to the decision

The [Dynamic Consistency Boundary](https://cratis.io/chronicle/dynamic-consistency-boundary/) (DCB) flips the usual arrangement. Instead of "here is my aggregate, every decision about it must be serialized", it says: for *this* decision, take exactly the facts the decision depends on, keep those consistent, and let everything else stay independent. The boundary is drawn per decision, at runtime, and can be narrower or wider than any aggregate would have been.

That is the theory. A runtime still has to give you a concrete tool for it, and for write-time invariants that tool in Chronicle is the constraint. Where a DCB formulation derives a queryable boundary from the facts a command loaded, a constraint states the invariant up front and lets the kernel enforce it against the authoritative event store when the append arrives. The decision was made against a read model that might lag; the constraint check does not lag, because it runs where the events actually live.

## Constraints in Chronicle

A [constraint](https://cratis.io/chronicle/constraints/) is a server-side rule attached to event types. When a client appends an event, the kernel checks the rule against the store; if it holds, the event commits to the sequence, and if it does not, the append is rejected — for that client and every other client, because there is only one place appends happen.

Chronicle ships two kinds, both about uniqueness:

- A **unique property constraint** keeps a value unique across all events of one or more event types — the username case, or an order reference.
- A **unique event type constraint** allows only one event of a given type per event source — the `UserRegistered` case, where a second registration event for the same person should simply be impossible.

The simplest way to declare one is directly on the event type:

```csharp
[EventType]
public record UserRegistered([property: Unique] string Email);
```

No registration call, no configuration file — the client discovers the attribute when it connects and registers the constraint with the kernel. For rules that span multiple event types, or that need a custom violation message, there is a declarative form:

```csharp
[EventType]
public record ProjectCreated(string Name);

[EventType]
public record ProjectArchived;

public class UniqueProjectName : IConstraint
{
    public void Define(IConstraintBuilder builder) =>
        builder.Unique(unique => unique
            .On<ProjectCreated>(p => p.Name)
            .RemovedWith<ProjectArchived>());
}
```

That last line matters more than it looks. Uniqueness without a way out would be a trap: archive the project and the name should become available again. `RemovedWith` names the event that *releases* the value, so the constraint tracks a lifecycle — claimed by `ProjectCreated`, released by `ProjectArchived` — rather than a frozen fact.

## The violation is an outcome, not an exception

Because the check happens inside the append, the result of an append carries it. The client-side append result exposes whether it succeeded and, when it did not, which constraints were violated — by name, with a message and details:

```csharp
var result = await eventStore.EventLog.Append(eventSourceId, new UserRegistered(email));

if (!result.IsSuccess && result.HasConstraintViolations)
{
    // result.ConstraintViolations names the rule, the event type,
    // and the sequence number where the collision happened.
}
```

This is worth dwelling on, because it changes the shape of the calling code. A uniqueness check that lives in your command handler fails *before* a decision is made, and it fails on stale data. A constraint violation surfaces *after* the decision, against authoritative state — so handling it is part of the domain flow, the same way `TryAdd` is part of a dictionary's flow. The second registration attempt is not an error in your logic; it is the system telling you the world moved between the read and the write. That is the honest contract of a distributed system, made explicit in an API instead of hidden behind an occasional lost update.

## What it costs

Constraints run server-side and keep state: the kernel maintains an index of the constrained values so the check is a lookup, not a scan. That index is derived state — when you change a constraint definition, Chronicle reindexes it as a job, the same way projections can be rebuilt. It is one more piece of derived state to be aware of, in exchange for the kernel being the single arbiter of the rule.

The current constraint types are deliberately narrow: uniqueness of a property value and uniqueness of an event type per event source. Chronicle does not (yet) evaluate arbitrary predicates at append time. For invariants that are genuinely cross-entity *and* not uniqueness-shaped — "a project may not exceed ten active milestones spread across several streams" — the DCB answer today is optimistic concurrency over an explicit scope rather than a declared constraint, and the honest recommendation is to think hard about whether such a rule is a write-time invariant or a domain process with its own events. Narrowness here is a feature: it is what lets the check run inside the append transaction against the store itself.

There is also a language boundary worth knowing: the model-bound attributes shown above are a C# convenience (Elixir has equivalent macros). The Kotlin/Java and TypeScript clients work with constraints through the declarative style only. The enforcement is identical everywhere — it lives in the kernel — but the sugar differs, and the [documentation is explicit about the differences](https://cratis.io/chronicle/constraints/model-bound/).

## What we can and cannot claim

Everything described here is shipped behavior of Chronicle 18.1, documented on [cratis.io](https://cratis.io/chronicle/concepts/consistency/): the kernel evaluates constraints at append time and rejects violations, the rejection is visible in the append result, and the check applies to every client because it runs in one place. What we will not claim is that this makes your invariants someone else's problem — the rules are still yours to choose, the release events are yours to model, and handling a violation gracefully is your code. Constraints move the *check* to the right place; the judgment stays with you.

If you are evaluating event sourcing for a .NET system, the invariant question is a good probe to bring to any stack: ask where the uniqueness check runs, what happens when two commands race, and what the loser of the race sees. If the answer involves reading a model first, keep looking.

## Trying it

The fastest path is the [.NET quickstart on this blog](/event-sourcing-in-dotnet-with-chronicle/), which runs Chronicle locally and appends real events in about ninety lines of C#. Add a `[Unique]` attribute to one of the events, append twice with the same value, and read the second append result — the whole mechanism in two requests. The [constraints documentation](https://cratis.io/chronicle/constraints/) covers the declarative form, violation messages, and releasing values, and the [Dynamic Consistency Boundary](https://cratis.io/chronicle/dynamic-consistency-boundary/) page sets constraints in their wider context alongside concurrency scopes.
