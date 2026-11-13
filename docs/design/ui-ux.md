# UI / UX Design

How the game canvas and the HTML interface fit together, and what the user sees
while navigating, entering houses, and interacting.

> **Final visual styling is still open** — exact colours, spacing and typography
> beyond what `frontend/src/style.css` already establishes are **Undecided**
> until the palette pass (DW-058). What is settled here is *structure and
> behaviour*.

---

## The two-layer model

Dwelling has two rendering layers with different jobs (ADR-0005):

| Layer | Technology | Owns |
| --- | --- | --- |
| **World layer** | Phaser 3 canvas | Ground, props, dwellings, doors, Altar, the player, in-world prompts |
| **Interface layer** | HTML + CSS | Floating **HUD**, **conversation drawer**, map selector |

**The rule:** the canvas renders the world; HTML renders the interface. Chat must
never be drawn inside the canvas, and the canvas must never own text input.

### What exists today

Implemented in `frontend/src/App.jsx` (React shell, ADR-0016), which mounts the
Phaser canvas into `#world` through `createGame()` in `world/game.js`:

```text
┌──────────────────────────────────────────────────────┐
│ Dwelling · Redwood Vale · A–C   [Map ▾]  • Press E   │  ← floating glass HUD
├──────────────────────────────────────────────────────┤
│                                                      │
│              #world — Phaser canvas                  │
│              (ground, props, houses, player)         │
│                                      ┌─────────────┐ │
│                                      │ Sarah     ✕ │ │  ← slide-out drawer
│                                      │ Mock data…  │ │    (translateX)
│                                      │ Sarah: Hey! │ │
│                                      └─────────────┘ │
└──────────────────────────────────────────────────────┘
```

- The HUD is a floating `<header>` holding the title, the map name and range
  (`aria-live="polite"`), a labelled map `<select>`, and the interact hint.
- The drawer is `position: fixed`, 380px wide (`max-width: 90vw`), hidden with
  `transform: translateX(100%)` and slid in by the `.open` class (ADR-0017).
- The mock banner and the disabled input are present, so no viewer can mistake
  the history for working messaging (FR-033).

---

## Canvas and viewport

- **Confirmed:** the canvas mounts into `#world` via `createGame()`, and the HUD
  and drawer float above it as HTML (ADR-0017, FR-022).
- **Confirmed:** the game uses a fixed **800 × 400** internal view
  (`VIEW_WIDTH` / `VIEW_HEIGHT` in `world/constants.js`), scaled with
  `Phaser.Scale.FIT` and `Scale.CENTER_BOTH`, with `pixelArt: true` so the 16px
  tiles stay crisp. Movement and collision use Arcade Physics with zero gravity.
- **Confirmed:** the layout must remain usable down to **320px** width (NFR-008);
  the drawer caps at `max-width: 90vw` so it cannot force a horizontal scroll.

---

## Conversation drawer

- **Confirmed (ADR-0017, superseding ADR-0013):** the game canvas is **fullscreen edge-to-edge**, and the conversation UI is a **slide-out overlay drawer** anchored to the right edge.
- **Confirmed:** it opens when the player **clicks on a house** or approaches and presses `E`, showing the **correct contact name** (FR-023, FR-024), and closes with the ✕ button or `Esc` (FR-025).
- **Confirmed:** it is an overlay drawer that leaves the majority of the canvas visible behind a soft backdrop blur.
- **Confirmed:** mock contacts and history are **visibly labelled as mock data**
  (FR-033) — a viewer must not believe messaging works.
- **Confirmed:** there is **no enabled message input.** An input field that looks
  usable and silently does nothing is a bug, not a placeholder.

```text
┌───────────────────────────────────┐
│  Sarah                        ×   │  ← correct contact name (FR-024)
├───────────────────────────────────┤
│  ⓘ Mock data — messaging is not    │  ← label required (FR-033)
│    implemented yet                 │
├───────────────────────────────────┤
│  Sarah: Hey!                       │  ← static mock history (DW-048)
│  You: Hi — just walked over        │
│                                    │
│  (no input field; nothing sends)   │
└───────────────────────────────────┘
```

**Confirmed:** the drawer is **380px** wide, capped at `max-width: 90vw`, and slides
with a 0.28s transform transition (`.chat-drawer` in `style.css`).
**Undecided:** how a long mock history scrolls.

---

## HUD

- **Confirmed:** the HUD is **minimal** — the current map name plus the interact
  prompt (FR-021, DW-037).
- **Confirmed:** the HUD is **HTML, not canvas**, so it is selectable and
  accessible.
- **Confirmed:** contact lists, settings panels, notifications and toasts are
  **out of scope this phase**.
- **Proposed:** an additional line naming the dwelling or room you are currently
  in, so an interior is never ambiguous.
- **Confirmed:** the map selector (DW-034) lives **inside the floating HUD**
  rather than as a separate overlay — see `.map-picker` in `style.css`.

---

## Interaction feedback

Three things must be distinguishable or the interaction is ambiguous (FR-013):

1. **You are near something** — a prompt appears naming the contact or the action.
2. **You can act** — the prompt shows the interact key (`E`).
3. **You acted** — the conversation drawer opens, or you enter the interior.

- **Proposed:** the prompt renders **in the world layer**, next to the target, so
  it points at what it refers to.
- **Proposed:** the active target highlights; the door and the house highlight
  differently, since they do different things.
- **Confirmed:** the Altar shows **no** prompt — it is scenery, and prompting would
  falsely imply a working group space.

### Overlapping targets

Exactly one prompt may be shown at a time, matching what an interaction would
actually trigger. The door zone is smaller and takes priority over the house zone.
A prompt naming contact A while `E` opens contact B is a bug (FR-015), not a
cosmetic issue.

---

## Input focus

The most likely source of UX bugs in this phase. **Confirmed rule (DW-038):**

- While the drawer is **closed**, the canvas owns the keyboard: WASD/arrows move
  the player, `E` interacts.
- While the drawer is **open**, the **DOM owns the keyboard** and player movement
  stops. `Esc` closes the drawer and returns control to the world.
- **The same keystroke must never be handled by both systems.** Both listening at
  once is the classic failure here.

---

## Keyboard access

- **Confirmed:** DOM UI must be keyboard reachable with visible focus states
  (NFR-010).
- The canvas is not keyboard-reachable content, so every canvas action needs a
  visible text equivalent: the interact prompt names the key, and panel controls
  are real labelled buttons.
- **Implemented in the drawer:** it is `inert` while closed, so its controls stay
  out of the tab order; opening it moves focus to the close button and keeps `Tab`
  inside; closing it (button, `Esc`, or a map change) returns focus to the world.
  Both the map picker and the close button have a `:focus-visible` outline.
- **Pending:** a colour-contrast audit of the palette (DW-058).
- **Undecided:** whether the world needs a non-canvas navigation alternative (for
  example a contact list that opens a conversation directly). Revisit after the
  core loop works — it is also the natural accessibility path.

---

## Responsive behaviour

**Confirmed: desktop-first**, with the existing layout remaining usable on small
screens. Touch controls are out of scope (DW-B07).

| Width | Expected behaviour |
| --- | --- |
| ≥ 700px | Fullscreen canvas; the 380px drawer covers the right edge only while open. |
| < 700px | Same layout; the drawer shrinks via `max-width: 90vw` and the HUD wraps. |
| 320px | Layout still usable (NFR-008); the HUD wraps inside `calc(100vw - 32px)` and prompts must not overflow the canvas. |

- **Confirmed:** the game is designed for **keyboard and desktop**. A phone user
  gets a usable page and a world they cannot control — an accepted limitation for
  this phase, not an oversight.

---

## Deleted accounts (proposed)

Not implemented. This is the UI half of the retention policy in
[`../architecture/database.md`](../architecture/database.md#identity-and-deletion-policy-approved-in-principle-not-implemented),
presented for approval before any `deletedAt` column exists.

**Principle:** deletion is a *person* going quiet, not history disappearing. Any
interface that names a person must have a defined state for a deleted one, and no
screen may claim a conversation, dwelling or message is gone when it is not.

### A deleted user

| Surface | Behaviour |
| --- | --- |
| Name anywhere (conversation header, message list, contact list, dwelling prompt) | `Former resident`, in the same muted style as other secondary text. Never the old name, never blank. The real name is not retained for display. |
| Avatar / placeholder | The same initial disc used elsewhere, with `?` rather than the old initial, so two deleted users cannot look alike by accident. |
| Presence / status | Shows `Unavailable`. No "last seen" timestamp — it would leak activity after deletion. |
| Clicking the former resident's dwelling | Opens a read-only panel: "This home's resident has left." Messages remain visible by opening the conversation directly; there is no send action toward a deleted user. |
| Conversation with a deleted user | Opens normally and shows full history. The composer is disabled with the text "You can't send messages to a former resident." |
| Contact list | The row is gone (contacts are live links, not history), so nothing new appears. If a conversation with that person is open, it stays open. |
| Their messages | Rendered exactly as before, attributed to `Former resident`. No redaction, no "deleted message" placeholder. |
| Signing in as a deleted account | Not possible; login reports invalid credentials rather than "account deleted", so deletion is not confirmed to an unauthenticated visitor. |

### A deleted user's dwelling

- The dwelling does **not** disappear from the world map: maps are frontend data
  and the door still exists. Entering it is read-only.
- It is **not** reassigned and **not** deleted with the user (hard deletion is out
  of scope), so no other player can claim it by accident.
- The building is drawn normally. A future "boarded up" visual is deliberately
  *not* proposed here: it needs an art decision and would signal demolition, which
  is false.
- A dwelling whose owner is deleted never shows the owner's old name in a prompt.

### Wording

- Use `Former resident` — neutral, consistent with the world's tone.
- Avoid `Deleted user`, `Account deleted`, `Unknown` and dead-end messages. Every
  disabled control says *why* it is disabled.

### Deliberately out of scope

- Self-service account deletion UI, export, and a grace period.
- Any visible marker on messages sent before deletion.
- Notifications to the other participant (notifications are out of scope this
  phase).

The model-level policy is approved in principle but **not implemented**; when it
is, it needs a follow-up design pass on these surfaces before code.

## Not designed yet

- Final palette, spacing and typography (DW-058).
- Onboarding / first-run experience.
- Settings, profile or account screens.
- Altar interfaces (planned — Phase 12, FR-027).
- Contact list, notifications, toasts (out of scope this phase).

## Related

- [`game-world.md`](game-world.md) — world mechanics behind this interface
- [`assets.md`](assets.md) — asset conventions for canvas and UI
- [`../architecture/frontend.md`](../architecture/frontend.md) — where UI code lives
- [`../planning/decisions.md`](../planning/decisions.md) — ADR-0017 (fullscreen canvas + slide-out drawer), ADR-0013 (mock data labelling), ADR-0005 (HTML UI around the canvas)
- [`../planning/milestones.md`](../planning/milestones.md) — Milestones 7, 9
