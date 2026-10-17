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
| **Interface layer** | HTML + CSS | Header, **conversation sidebar**, **minimal HUD**, map selector |

**The rule:** the canvas renders the world; HTML renders the interface. Chat must
never be drawn inside the canvas, and the canvas must never own text input.

### What exists today

`frontend/src/main.js` renders a static shell that this design keeps:

```text
┌──────────────────────────────────────────────────────┐
│  Dwelling                          (app-header)      │
├───────────────────────────┬──────────────────────────┤
│  HUD: map name + prompt   │  Conversation sidebar    │
│  ─────────────────────    │  (#chat) — replaces the  │
│  #world  (Phaser canvas   │  old Conversations panel │
│  mounts here — no canvas  │                          │
│  exists yet)              │  mock data, labelled     │
└───────────────────────────┴──────────────────────────┘
```

- CSS grid, two columns, collapsing to a single column below 700px.
- Panels are `<section>` elements with `aria-labelledby` headings.
- **Nothing is interactive yet** — the empty panels are why Milestone 1 exists.

---

## Canvas and viewport

- **Confirmed:** the Phaser canvas mounts **inside `#world`**, not as a page
  background (DW-003). The surrounding layout stays intact (FR-022).
- **Proposed:** the canvas fills its panel and the game scales to fit, with a
  fixed internal resolution so world units stay predictable.
- **Undecided:** internal resolution and `FIT` vs `RESIZE` scale mode — settled
  when the game config is written.
- **Confirmed:** the layout must remain usable down to **320px** width (NFR-008);
  below 700px the panels stack with the world first.

---

## Conversation sidebar

- **Confirmed (ADR-0013):** the conversation UI is a **docked sidebar that
  replaces the existing Conversations panel**. The canvas is never covered.
- **Confirmed:** it opens on dwelling interaction, shows the **correct contact
  name** (FR-023, FR-024), and closes with a button or `Esc` (FR-025).
- **Confirmed:** it is docked, **not** an overlay and **not** a modal.
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

**Undecided:** sidebar width, animation on open/close (prefer none until a design
exists), and how a long mock history scrolls.

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
- **Proposed:** the map selector from DW-034 lives in the header area, near the
  HUD rather than floating over the canvas.

---

## Interaction feedback

Three things must be distinguishable or the interaction is ambiguous (FR-013):

1. **You are near something** — a prompt appears naming the contact or the action.
2. **You can act** — the prompt shows the interact key (`E`).
3. **You acted** — the conversation sidebar opens, or you enter the interior.

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

- While the sidebar is **closed**, the canvas owns the keyboard: WASD/arrows move
  the player, `E` interacts.
- While the sidebar is **open**, the **DOM owns the keyboard** and player movement
  stops. `Esc` closes the panel and returns control to the world.
- **The same keystroke must never be handled by both systems.** Both listening at
  once is the classic failure here.

---

## Keyboard access

- **Confirmed:** DOM UI must be keyboard reachable with visible focus states
  (NFR-010).
- The canvas is not keyboard-reachable content, so every canvas action needs a
  visible text equivalent: the interact prompt names the key, and panel controls
  are real labelled buttons.
- **Undecided:** whether the world needs a non-canvas navigation alternative (for
  example a contact list that opens a conversation directly). Revisit after the
  core loop works — it is also the natural accessibility path.

---

## Responsive behaviour

**Confirmed: desktop-first**, with the existing layout remaining usable on small
screens. Touch controls are out of scope (DW-B07).

| Width | Expected behaviour |
| --- | --- |
| ≥ 700px | Two columns: world + conversation sidebar (existing CSS). |
| < 700px | Single column; panels stack, world first; selector and HUD stay usable. |
| 320px | Layout still usable (NFR-008); prompts must not overflow the canvas panel. |

- **Confirmed:** the game is designed for **keyboard and desktop**. A phone user
  gets a usable page and a world they cannot control — an accepted limitation for
  this phase, not an oversight.

---

## Not designed yet

- Final palette, spacing and typography (DW-058).
- Onboarding / first-run experience.
- Settings, profile or account screens.
- Altar interfaces (deferred, FR-027).
- Contact list, notifications, toasts (out of scope this phase).

## Related

- [`game-world.md`](game-world.md) — world mechanics behind this interface
- [`assets.md`](assets.md) — asset conventions for canvas and UI
- [`../architecture/frontend.md`](../architecture/frontend.md) — where UI code lives
- [`../planning/decisions.md`](../planning/decisions.md) — ADR-0013 (sidebar + mock data), ADR-0005 (HTML UI around the canvas)
- [`../planning/milestones.md`](../planning/milestones.md) — Milestones 7, 9
