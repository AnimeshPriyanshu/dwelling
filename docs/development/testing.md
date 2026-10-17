# Testing

How work is verified in Dwelling.

> **There are no automated tests, and no test runner is installed.** No
> `package.json` in the repository has a `test` script. `tests/` contains only a
> README. Verification is **manual** for now — that decision is recorded in
> ADR-0009 ([`../planning/decisions.md`](../planning/decisions.md)).

---

## Current state

| Check | Exists? | How |
| --- | --- | --- |
| Automated unit tests | ❌ No | — |
| Automated integration/E2E tests | ❌ No | — |
| Linter / formatter | ❌ No | — |
| Type checking | ❌ No (plain JS) | — |
| **Build check** | ✅ Yes | `npm run build` |
| **Manual checklist** | ✅ Yes | Below |
| **Backend endpoint check** | ✅ Yes | `curl http://localhost:3000/api/health` |

**Rule:** never report a check as passing unless it was actually run. "The build
passed" is a real, verified claim; "it should work" is not.

---

## Before starting any test session

```bash
npm install                 # if node_modules is missing
npm run dev                 # frontend → http://localhost:5173
npm run dev:backend         # separate terminal, only if the API is involved
```

- Open the **browser devtools console** and keep it visible. A feature that
  "works" while logging errors is not working.
- Keep the **Network tab** open when checking the API/proxy.
- Note the browser and version; test in a second browser before closing a
  milestone that touches layout (NFR-007).

## The build check

Run before declaring any milestone complete:

```bash
npm run build
```

- Must exit successfully.
- `frontend/dist/` is regenerated — do not inspect or edit its contents.
- ⚠️ **Caveat:** a passing build proves the bundle compiles. It proves **nothing**
  about behavior. It is the last check, not the only one.

## Backend check (when the API is involved)

```bash
curl -i http://localhost:3000/api/health      # expect 200 and {"status":"ok"}
```

- The frontend proxies `/api` to the same port, so also verify the request works
  **through the dev server** (`http://localhost:5173/api/health`) when client
  code depends on it. A working direct call and a broken proxy is a common
  failure.

---

## Manual test checklists

Use these as the milestone acceptance runs. Each has a pass condition, not just a
step.

### M1 — Canvas and shell

- [ ] `npm run dev` serves the app; the page loads with no console errors.
- [ ] A Phaser canvas is present inside the `#world` panel.
- [ ] The "Conversations" panel is still visible and correctly laid out.
- [ ] Resizing the window does not let the canvas overflow its panel.
- [ ] `npm run build` exits successfully.

### M2 — World rendering

- [ ] The ground fills the world with a repeating pattern and **no visible seams**.
- [ ] Panning to each edge shows a hard boundary, not empty space.
- [ ] The world renders with **no external asset files present**.
- [ ] Reloading the page renders the world again consistently.

### M3 — Movement

- [ ] The player is visible at the spawn position on load.
- [ ] Each arrow key moves the player in the correct direction.
- [ ] Each WASD key moves the player in the correct direction.
- [ ] Diagonal movement is **not** faster than axis-aligned movement.
- [ ] Throttling the CPU in devtools (4–6× slowdown) keeps movement speed
      consistent — confirming delta-time usage.
- [ ] Releasing all keys stops the player with no drift.
- [ ] Facing direction is visibly reflected while moving.

### M4 — Collision and camera

- [ ] The player cannot pass through any obstacle approached from any side.
- [ ] Diagonal movement into a wall **slides** along it rather than sticking.
- [ ] Corners cannot be cut through.
- [ ] The player cannot leave the world bounds on any edge or corner.
- [ ] The camera follows the player smoothly.
- [ ] At map edges the camera stops — no area outside the world is ever shown.
- [ ] No jitter or screen shake while moving continuously for 30 seconds.

### M5 — Dwellings and interaction

- [ ] All configured dwellings render at their intended positions.
- [ ] Entering a dwelling's zone shows a prompt **naming that contact**.
- [ ] Leaving the zone clears the prompt immediately.
- [ ] Standing between two dwellings shows exactly one prompt, matching the
      dwelling that an interaction would actually trigger.
- [ ] Pressing the interact key inside a zone fires an event with the **correct**
      contact id (verify in the console).
- [ ] Pressing interact outside any zone does nothing.
- [ ] The interact key does not also move the player or trigger other actions.

### M6 — Maps and UI integration

- [ ] The initial map loads entirely from data (spawn, dwellings, obstacles).
- [ ] Adding a second map entry loads without editing scene code.
- [ ] Switching maps repopulates the world and moves the player to the new spawn.
- [ ] Switching maps does **not** reload the page.
- [ ] Interacting with a dwelling opens the panel showing the correct contact name.
- [ ] Closing the panel returns control to the world.
- [ ] While the panel is open, movement keys do not move the player
      (or the chosen focus rule is applied consistently).
- [ ] The HUD shows the current map name and updates on map change.

### M7 — Full regression

Run **every checklist above** in a single session, plus:

- [ ] Fresh `npm install` → `npm run dev` → `npm run build` succeeds.
- [ ] No console errors during a normal play session.
- [ ] Page reload mid-session recovers cleanly.
- [ ] Layout usable at **320px** viewport width (NFR-008).
- [ ] Verified in a second browser.
- [ ] Every `Not Started`/`Blocked` task in
      [`../planning/task-board.md`](../planning/task-board.md) is still accurately
      marked.

---

## Testing individual features

When you add a feature that is not covered above, test it in this order:

1. **Does it load?** The feature appears without console errors.
2. **Does the happy path work?** The intended interaction does what it says.
3. **What about the edges?** Map edges, zero/one item, maximum values, rapid
   repeated input.
4. **What about failure?** Missing asset, backend not running, second tab open.
5. **Does it break anything else?** Re-run the checklists for earlier milestones.

**Always test the boundary cases.** Most real bugs in this project live at map
edges, overlapping interaction zones, and the keyboard-focus boundary between the
canvas and the DOM.

---

## What to do when you find a bug

1. Reproduce it and write down the steps.
2. Decide whether it blocks the milestone's acceptance criteria.
3. If **yes**: fix it under the milestone's fix task (for example DW-025, DW-039)
   before marking anything done.
4. If **no**: add it to the backlog in
   [`../planning/task-board.md`](../planning/task-board.md) with a `DW-B##` id.
   Do not silently drop it.
5. If it reveals a design problem, record it in
   [`../planning/decisions.md`](../planning/decisions.md).

---

## When to add automated tests

Revisit ADR-0009 when there is **logic that does not require a browser to verify**.
The first two candidates are already on the plan:

- **Map data / registry (DW-032, DW-033)** — pure functions: given a name, which
  map id? Given an id, which data? Ideal for unit tests.
- **Interaction resolution (DW-028)** — "which dwelling is active for this player
  position" is pure logic and is exactly the code most likely to regress silently.

Not worth automating yet: canvas rendering, camera feel, and frame-by-frame
movement — those are manual checks and will stay that way (see ADR-0009).

**If/when a runner is added:**

1. Add it as a real dependency and a `test` script in the owning workspace.
2. Record a superseding ADR.
3. Update this document — including removing the "no automated tests" warning.

---

## Reporting results honestly

- Say which checks **ran** and which **did not**.
- If a check was skipped, say why. That is a limitation, not a passing check.
- If a check failed and you fixed the cause, re-run **that** check — an earlier
  passing run does not cover later edits.
- Never weaken a checklist item to make a milestone look complete. Adjust the
  milestone itself, in
  [`../planning/milestones.md`](../planning/milestones.md), and say so.

## Related

- [`../planning/milestones.md`](../planning/milestones.md) — per-milestone testing checklists
- [`../planning/task-board.md`](../planning/task-board.md) — where findings are recorded
- [`../design/game-world.md`](../design/game-world.md) — the mechanics under test
- [`setup.md`](setup.md) — commands referenced above
