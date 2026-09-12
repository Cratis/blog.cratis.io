---
title: "The log remembers: PII, crypto-shredding, and erasure in Chronicle"
date: 2026-09-10
authors: cratis-team
excerpt: An append-only event log is the worst possible place to keep personal data — unless the store itself knows which values are personal and can make them disappear without rewriting history. How Chronicle's [PII] adornments, per-subject keys, and crypto-shredding resolve the collision.
tags:
  - chronicle
  - event-sourcing
---

Sooner or later, every system that stores personal data receives a request that reads something like: *erase everything you have about this person*. Regulations such as the GDPR turn that request from a courtesy into an obligation with a deadline. And if your system is event-sourced, the request collides head-on with the property you chose the architecture for in the first place: the log is append-only. Events are written once and never altered — that is what makes them trustworthy as history.

This post is about how [Chronicle](https://cratis.io/chronicle/), our open-source event-sourcing database, resolves that collision. The short version: the log keeps remembering that things happened, while the personal content of those things stops existing. No rewrites, no deleted sequence numbers, no broken projections.

## Why the obvious answers fail

The first instinct is to delete the events. That breaks the system in ways that are worse than the problem being solved. Every projection, reactor, and read model in a Chronicle event store tracks its position in the sequence by event number; removing a slot mid-sequence corrupts every one of those positions. Replays and audits lose the fact that something happened at all. And an event log that can be edited on demand is no longer an honest record of anything.

The second instinct is to encrypt the personal values — and stop there. Encryption does protect the values, but a single application-wide key makes erasure impossible to scope: destroy the key and you have shredded *everyone's* data, not the one person who asked for it. Keep the key and you have kept the ability to read the data, which is precisely what the erasure request said must end.

Both approaches fail for the same underlying reason: they treat personal data as an application concern that the store is unaware of. Chronicle takes the opposite approach — the store knows which values are personal, and it tracks *whose* they are.

## Marking personal data where it is declared

The first half of the mechanism is an adornment. Marking a value `[PII]` — a C# attribute, equally a Kotlin/Java annotation, TypeScript decorator, or Elixir macro — tells Chronicle that the value holds personally identifiable information. When an event carrying that value is appended, the kernel encrypts the value before it reaches storage. When a projection or observer later reads the event, the value is decrypted transparently. Application code sees plaintext; the event log holds ciphertext.

You can mark a single event property:

```csharp
[EventType]
public record PatientRegistered(
    Guid Id,
    [property: PII] string SocialSecurityNumber,
    string Department);
```

But the approach Chronicle steers you toward is marking the *type*. Most personal data in a well-modeled domain already lives in concept types — `SocialSecurityNumber`, `DateOfBirth`, `EmailAddress` — rather than bare strings. Mark the concept once:

```csharp
[PII]
public record EmailAddress(string Value) : ConceptAs<string>(Value);
```

and every property of that type, in every event and every read model, is protected from then on. The classification travels with the type into value objects, nested structures, collections — the marker lands on the individual leaf values wherever they end up, and the document keeps its shape. That is what makes this cross-cutting in practice rather than in theory: protection stops being a thing each developer must remember per event, because using the type and protecting the data are the same decision. A new event written months later cannot forget the attribute, because there is no attribute to forget.

The marker also accepts a `details` note — a legal basis, a retention rule — stored with the event schema so that classification decisions remain visible to compliance tooling and audits rather than living in someone's head.

## Erasure as a key lifecycle, not a deletion

The second half of the mechanism is how data disappears. Every `[PII]` value is encrypted under a key that belongs to the *subject* the data is about — one key per person, scoped to a namespace and looked up by the event's event source identifier. Personal values for one person are unreadable without that person's key and unaffected by anyone else's.

That gives erasure a precise, surgical shape. The right-to-erasure request becomes one call — deleting the subject's key:

```csharp
await eventStore.PII.DeleteEncryptionKeyFor(subjectId);
```

After that, the events for that person are all still there: same sequence numbers, same positions, every non-personal field intact. Only the `[PII]` properties now release as empty, because the key that could decrypt them no longer exists. This is crypto-shredding — the data is not deleted so much as it becomes permanently unreadable, mathematically, while the structure of the log survives untouched. Projections keep their positions. Audits keep the fact that events occurred. The person's data is gone.

Making that erasure *stick* is the genuinely hard part, and it is where most homegrown crypto-shredding schemes quietly fail. A deleted key has a way of coming back: a new append provisions a fresh key for the same subject, an event-store subscription copies the key into another store, a cache hands back a stale entry. Chronicle treats each of these as a first-class problem: the erasure records a fence in every key store of the namespace — keyed by the destroyed key's fingerprint — and after that the store refuses to provision a key for the subject, refuses to accept the destroyed key material back at any revision, and refuses to copy it in from elsewhere. If the person later returns under a lawful basis, a new key can be authorized explicitly — and it cannot decrypt anything written before the erasure.

For the rarer case where the event *content* itself must go — the whole payload, not just marked values — Chronicle has a second mechanism: [event redaction](https://cratis.io/chronicle/events/redaction/). A redacted event keeps its sequence number and audit context but its content is replaced by a marker recording what type of event it was, why it was redacted, and when. Downstream positions stay valid, and observers can react to the redaction itself — cleaning read models, notifying downstream systems.

## What this does not do

A mechanism this convenient deserves an honest list of limits, and Chronicle's own [documentation](https://cratis.io/chronicle/compliance/key-lifecycle/) is blunt about them.

Erasure is scoped to a namespace — the tenancy boundary. The same person in two namespaces has two keys, and erasing in one deliberately leaves the other alone; multi-tenant systems issue one erasure per namespace the person appears in. Event source identifiers themselves cannot be encrypted — they are the lookup keys for the encryption keys — so a sensitive identity should be stored as a marked property, with a non-sensitive surrogate as the identifier. And after an erasure, appending new `[PII]` data for that subject fails loudly rather than silently restarting protection; if the person legitimately comes back, authorizing a new key is a deliberate act that Chronicle logs — without recording who authorized it, because the store does not know. Your erasure procedure still owns the paper trail.

The client experience also varies by language: the C# client validates the most (refusing, for instance, to let you mark an event source identifier as PII), while some other clients accept markers without the same checks today — the [documentation spells out](https://cratis.io/chronicle/compliance/pii/) exactly which paths each client covers.

Most importantly: none of this is a compliance certification, and we don't present it as one. What Chronicle provides are mechanisms — classification at the type level, per-subject encryption, fenced erasure, auditable redaction — that map the regulatory demands onto operations a database can actually perform. Whether a given erasure satisfies a given obligation, and what your procedure must document alongside it, remains a judgment for you and your advisers. That is not a disclaimer tacked on at the end; it is the division of labor the whole design rests on. The store owns the mechanics of forgetting. You own the decision to forget.

## Trying it

The [compliance documentation](https://cratis.io/chronicle/compliance/) walks through marking data, read-model interactions, the key lifecycle, and what a single erasure reaches. If you are new to Chronicle, the [.NET quickstart on this blog](/event-sourcing-in-dotnet-with-chronicle/) gets a store running locally in minutes — marking a property `[PII]` and inspecting the stored event in Workbench is the fastest way to see the mechanism with your own eyes. Everything described here is shipped in Chronicle 18.1 and MIT licensed, like the rest of the Cratis stack.
