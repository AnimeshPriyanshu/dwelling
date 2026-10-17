# Vision

> **Instead of finding a conversation in a list, find the person in a world.**

## What Dwelling is

Dwelling is a web-based communication platform designed like a 2D game. Each
user is represented by a character that moves through a navigable world. Other
people are represented not as rows in a contact list but as **dwellings** —
houses placed in the world. To talk to someone, you walk to their dwelling and
interact with it.

The world is split into several **maps**, organized by the first letter of a
contact's name, so that a large number of contacts can be spread across
recognizable areas instead of one crowded space. **Altars** are shared gathering
places where several people can meet in the same location.

## The problem

Chat applications treat people as entries in a list. The spatial and social
character of "going to see someone" is lost: every conversation opens the same
way, from the same screen, with the same list, regardless of who it is.

Dwelling asks a simple question: what if the act of reaching someone had a
*place* attached to it?

## The concept: spatial communication

Instead of:

```text
Open chat app → Open contact list → Select person → Start chatting
```

Dwelling does:

```text
Enter the world → Control your character → Explore the map
  → Find a contact's dwelling → Interact with the dwelling → Start chatting
```

The intent is that digital communication feels more like **visiting someone**
than like opening a chat window. The virtual world is an interactive layer over a
familiar messaging experience, not a replacement for it.

## How the pieces relate

```text
                       DWELLING
        ┌──────────────────────────────────────┐
        │            2D WORLD (maps)           │
        │                                      │
        │   🧍 player ──▶ 🏠 dwelling (Sarah)  │   isolation: one per contact
        │                 ⛩ altar (shared)     │   gathering: many contacts
        └───────────────────┬──────────────────┘
                            │ interaction
                            ▼
        ┌──────────────────────────────────────┐
        │                 CHAT                 │
        │   Alex: Hey!        Sarah: Hello!    │
        └──────────────────────────────────────┘
```

- **World** — the navigable space. Provides position, movement, and the visual
  layer. Split into letter-range maps.
- **Dwelling** — one contact's place in the world. Walking to it and interacting
  is the entry point into that contact's conversation. Conceptually *one
  dwelling per contact*.
- **Altar** — a shared place that many contacts can occupy at once. Intended as
  the entry point for **group** interaction, complementing the one-to-one
  dwelling.
- **Chat** — the actual communication. Space determines *who* you are talking to;
  the chat panel handles the conversation itself.

## Current focus

The project is being built incrementally, and the **current phase is frontend
development**: a usable 2D world with a controllable character, dwellings, and
interaction feedback. The backend, database, and real-time messaging already
exist as scaffolding in the repository but are **not** the focus of this phase.

See [`project/scope.md`](scope.md) for the exact boundary and
[`planning/milestones.md`](../planning/milestones.md) for the current plan.
