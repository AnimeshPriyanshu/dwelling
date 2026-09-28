# Dwelling

> **A 2D virtual world for communication.**

Dwelling is a web-based communication platform designed like a 2D game. Instead of using a traditional chat list, users interact with people through a virtual world.

Each user is represented by a character, and their contacts are represented by **houses or dwellings**. To communicate with someone, a user can navigate their character to that person's dwelling and interact with it to start a conversation.

The idea is to make digital communication feel more like **visiting someone** rather than simply opening a chat.

---

## How It Works

The basic interaction in Dwelling is:

```text
Enter the World
      ↓
Control Your Character
      ↓
Explore the Map
      ↓
Find a Contact's Dwelling
      ↓
Interact With the Dwelling
      ↓
Start Chatting
```

Instead of:

```text
Open Chat App
      ↓
Open Contact List
      ↓
Select Person
      ↓
Start Chatting
```

---

## Dwellings

Every contact can have their own **dwelling**, represented as a house or personal space in the 2D world.

A user's dwelling acts as their location within the virtual environment.

For example:

```text
        🏠 Sarah
           │
           │
         🧍 Alex
```

Alex can navigate to Sarah's dwelling and interact with it to communicate with Sarah.

---

## 2D World

The main interface of Dwelling is a navigable 2D world.

Users control a character and can move around the environment to find different people and locations.

The world contains:

* Characters
* Houses / Dwellings
* Paths
* Different maps
* Interaction points
* Shared gathering areas

The 2D environment provides the visual layer through which users interact with the communication system.

---

## Alphabet-Based Maps

The world is divided into different maps based on the alphabet.

Contacts are organized according to the first letter of their name.

For example:

```text
A – C
D – F
G – I
J – L
M – O
P – R
S – U
V – Z
```

A contact whose name starts with **S** would be located in the appropriate map containing the S–U section.

This allows the virtual world to organize a large number of contacts across different areas.

---

## Altars

**Altars** are shared gathering locations within the world.

Unlike individual dwellings, which represent individual contacts, an Altar is a common space where multiple people can gather.

Conceptually:

```text
             🧍
              \
               \
        🧍 ── ⛩ ── 🧍
               /
              /
             🧍
```

An Altar can serve as a shared location for group communication, allowing multiple users to meet in the same virtual space.

---

## Chat

Although Dwelling uses a 2D game-like environment, its primary purpose is communication.

Once a user interacts with a contact's dwelling, they can access their conversation with that person.

The virtual world therefore acts as an interactive layer over the traditional chat experience.

```text
             DWELLING

        ┌─────────────────┐
        │   2D WORLD      │
        │                 │
        │  🧍 → 🏠        │
        │       Sarah     │
        └────────┬────────┘
                 │
                 ↓
        ┌─────────────────┐
        │      CHAT       │
        │                 │
        │  Alex: Hey!     │
        │  Sarah: Hello!  │
        └─────────────────┘
```

---

## Example

Imagine Alex wants to talk to Sarah.

1. Alex enters Dwelling.
2. Alex's character appears in the 2D world.
3. Alex navigates to the appropriate map.
4. Alex finds Sarah's dwelling.
5. Alex moves toward the dwelling.
6. Alex interacts with the dwelling.
7. Sarah's conversation opens.
8. Alex can communicate with Sarah.

Similarly, if Alex wants to interact with multiple people, Alex can visit an **Altar** where other users can gather.

---

## Core Concept

Dwelling is based on a simple idea:

> **Instead of finding a conversation in a list, find the person in a world.**

The project combines a familiar communication system with a spatial 2D environment, where **people have places, conversations have locations, and users can move through the world to interact with them.**

## Project Structure

```text
frontend/   Vite, Vanilla JavaScript, and Phaser 3
backend/    Node.js, Express, and Socket.IO
database/   Prisma schema and PostgreSQL migrations
shared/     Small JavaScript contracts shared by workspaces
tests/      Cross-workspace tests
docs/       Architecture notes
scripts/    Project maintenance scripts
```

The frontend and backend are separate npm workspaces in one monorepo. The
initial world and chat directories are boundaries for future features; the
gameplay and messaging flows are not implemented yet.

## Local Development

Requirements: Node.js 20.19 or newer and PostgreSQL. Redis is optional until a
feature needs caching.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` for your local PostgreSQL database.
3. Generate the Prisma client with `npm run db:generate`.
4. Apply the initial schema with `npm run db:migrate`.
5. Start the frontend with `npm run dev`.
6. In a second terminal, start the API with `npm run dev:backend`.

The frontend runs at `http://localhost:5173`; the API health check is at
`http://localhost:3000/api/health`. Leave `REDIS_URL` unset to run without
Redis. See [docs/architecture.md](docs/architecture.md) for module boundaries.
