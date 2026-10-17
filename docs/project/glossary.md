# Glossary

Domain vocabulary for Dwelling. Terms are grouped by area. Where a term is not
yet finalized in code, it says so.

## Core concepts

**Dwelling**
A contact's place in the world, drawn as a house or personal space. Walking to a
dwelling and interacting with it is how you open that contact's conversation.
Conceptually there is **one dwelling per contact**. In code this will become a
`Dwelling` entity in the world scene, carrying a contact id.

**Altar**
A shared gathering location. Unlike a dwelling (one contact), an Altar is a
common space that **many contacts can occupy at once**, intended as the entry
point for group interaction. *Status: concept only — not designed or implemented.*

**Player**
The character the current user controls. Distinct from a **contact**, who is
another person represented by a dwelling. The player moves with the keyboard;
contacts do not move on screen in the current design.

**Contact**
Another person in the user's world. Represented by a dwelling (later, also by
presence at Altars). Has a display name and an identity used to route
interactions to the right conversation.

**Presence**
Whether a contact is currently online / available. *Status: pending — planned
with the realtime phase; nothing is implemented.*

## World and gameplay

**World Scene**
The Phaser `Scene` that renders the navigable world — ground, dwellings,
obstacles, and the player — and owns the update loop for movement and
interaction. In this project the first such scene is a "World" scene.

**Map**
A single bounded area of the world. Dwelling's maps are organized by the first
letter of contact names (see [map organization](#map-organization) below). A map is
defined by **data** (size, spawn, dwellings, obstacles), not by hard-coded scene
logic (FR-018).

**Tile**
A small, repeated image used to build the ground or other grid-aligned layers.
Tile size is a shared constant, so world dimensions are expressed in tiles.

**Sprite**
A 2D image drawn at a position in the world, e.g. the player or a house.

**Collision**
The rule that a moving body cannot overlap a solid body. In Phaser this is
usually enforced by registering a collider between the player and a group of
static obstacles. Required for FR-006.

**Interaction Zone**
A defined area — a rectangle or radius around a dwelling — that the player can
enter. Entering it makes the dwelling *interactable* and shows feedback;
pressing the interact key inside it triggers the interaction (FR-012 to FR-016).

**World Bounds**
The outer limits of a map. The player is confined inside them (FR-007) and the
camera is clamped to them (FR-008).

**Camera**
The viewport onto the world. It follows the player and is bounded by the world so
edges never scroll into empty space.

**Spawn**
The position where the player appears when a map loads.

**HUD**
Non-canvas, usually HTML UI that shows status such as the current map name
(FR-021). See [`design/ui-ux.md`](../design/ui-ux.md).

## Map organization

**Alphabet maps**
The scheme that splits the world into maps by the first letter of a contact's
name:

```text
A–C   D–F   G–I   J–L   M–O   P–R   S–U   V–Z
```

A contact named "Sarah" belongs to the **S–U** map. Full details in
[`design/maps.md`](../design/maps.md).

## Frontend and architecture

**Scene**
A self-contained Phaser unit with its own lifecycle (`preload`, `create`,
`update`). Boot, Preload, and World scenes are the expected split; exact scenes
are still being decided.

**Game Config**
The object passed to `new Phaser.Game(...)` that sets canvas size, scaling,
physics, and the initial scene list. Lives in `frontend/src/world/game.js`
(proposed).

**Entity**
A world object with its own behavior — the player, a dwelling, an obstacle.
Entities will live under `frontend/src/world/entities/` (proposed).

**DOM Bridge**
The module that lets the Phaser canvas and the HTML UI communicate without
either knowing the other's internals, typically via a small event bus. Needed
because the chat panel is HTML, not canvas. *Status: pending.*

**Workspace**
One npm package in the monorepo: `frontend`, `backend`, `database`, `shared`.
See [`development/folder-structure.md`](../development/folder-structure.md).

**Shared**
The `shared/` workspace holding small contracts imported by other workspaces.
Currently it exports only `API_PREFIX = '/api'`.
