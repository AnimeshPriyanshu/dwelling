# Coding Conventions

Practical conventions for a vanilla-JavaScript student project. They follow the
style the repository already uses — matched to the existing code, not invented
from scratch.

> **Guiding principle:** code here is read by a person under time pressure. Clarity
> beats cleverness, and consistency beats personal preference.

---

## Language and syntax

Observed in the existing source and binding for new code:

| Rule | Example |
| --- | --- |
| **ES modules only** | `import x from 'y'` / `export` — every package is `"type": "module"` |
| **No semicolons** | `const app = express()` |
| **Single quotes** for strings | `import './style.css'`, `'server:ready'` |
| **Template literals** for interpolation | `` `${API_PREFIX}/health` `` |
| **2-space indentation** | true in the backend `.js` files and in `style.css`; `main.js` uses tabs inside its embedded HTML template literal |
| **`const` by default**, `let` only when reassigned | never `var` |
| **`async`/`await`** over raw promise chains | `await client.connect()` |
| **Trailing commas** in multi-line objects/arrays | matching the schema and existing files |
| **`node:` prefix** for Node built-ins | `import { createServer } from 'node:http'` |
| **No TypeScript** | NFR-001 (optional, can be added later) |

**React + JSX** — use React components for UI. Phaser gameplay logic stays in
vanilla JS/JSX scenes as needed. Import Phaser from `'phaser'` and register
scenes in the config.

Arrow functions for callbacks; `function` declarations for named top-level
functions. Do not mix arbitrarily within one file.

**Unused parameters:** name them with a leading underscore so intent is obvious —
the existing code does this in `app.js` (`(_request, response)`).

---

## Naming

| Kind | Convention | Example |
| --- | --- | --- |
| Variables, functions | `camelCase` | `registerSocketHandlers`, `clientOrigin` |
| Booleans | `is`/`has`/`can` prefix | `isMoving`, `hasFocus` |
| Classes, Phaser scenes | `PascalCase` | `Player`, `WorldScene` |
| Module-level constants | `SCREAMING_SNAKE_CASE` | `API_PREFIX`, `TILE_SIZE`, `WORLD_WIDTH` |
| Files (JS) | `camelCase` | `game.js`, `constants.js`, `player.js` |
| Files (one class each) | `PascalCase` matching the class | `Player.js`, `Dwelling.js` |
| Asset files | `kebab-case` with state/context | `player-walk.png` (see [`../design/assets.md`](../design/assets.md)) |
| CSS classes | `kebab-case` | `.app-shell`, `.experience-panel` |
| Directories | `lowercase` | `scenes/`, `entities/` |
| Socket events | `domain:action` | `server:ready`, `dwelling:interact` |

**Naming rules that prevent real bugs:**

- A name must not lie. `dwellings` holding contacts, or a `handleClick` that also
  mutates state, will mislead the next reader — including you.
- Avoid abbreviations except universally understood ones (`id`, `x`, `y`, `dx`,
  `dy`, `w`, `h`).
- **Prefer names the domain already uses.** This project's vocabulary is defined in
  [`../project/glossary.md`](../project/glossary.md): dwelling, contact, map,
  interaction zone. Use those words in code; do not invent synonyms like
  "house", "friend", "level", or "trigger" for the same concepts.

---

## File organization

- **One clear responsibility per file.** If a file needs "and" to describe it, split it.
- **One main class or export per file**, with the filename matching it
  (`Player.js` exports `Player`).
- **Keep files short** — roughly under ~200 lines for a module with a single job.
  A long scene file usually means logic belongs in an entity or system.
- **Order within a file:** imports → constants → main export(s) → helpers.
- **Imports are grouped and ordered:** external packages first, blank line, then
  internal modules. Existing files do this already:

  ```js
  import { createServer } from 'node:http'
  import { Server } from 'socket.io'

  import app from './app.js'
  import { env } from './config/env.js'
  ```

- **Always include the `.js` extension** on relative imports — required by ESM:

  ```js
  import { env } from './config/env.js'   // ✅
  import { env } from './config/env'      // ❌
  ```

- **No relative imports across workspaces.** Use the package name:
  `import { API_PREFIX } from '@dwelling/shared'`.
- **No path aliases** are configured in Vite; use relative paths.
- **No barrel files** (`index.js` re-exporting a folder) unless a boundary
  genuinely needs one. They hide dependency direction.

---

## Imports and exports

- **Prefer named exports.** They are greppable and refactor safely:

  ```js
  export function registerSocketHandlers(io) { /* … */ }   // ✅
  ```

- **Default export only when the module has one obvious value** — the existing
  examples are `export default app` (Express) and the Vite/Prisma configs.
- **Never mutate an imported binding.** Imported objects are shared; mutating them
  creates action at a distance.
- **Do not import across a boundary that the architecture forbids** — see
  [`../architecture/overview.md`](../architecture/overview.md#dependency-direction).
  Notably: entities must not import scenes, and scenes must not import UI modules.

---

## Comments

- **Explain *why*, not *what*.** `// increment x` adds nothing;
  `// Cached to avoid a DB round-trip during the update loop` is useful.
- **Comment the non-obvious**: a magic number's origin, a workaround, a deliberate
  limitation. Name the source when it exists (`// Frame-rate independent; see FR-004`).
- **Reference requirement and task IDs** for non-obvious constraints. This is a
  documented project, and IDs make the reasoning traceable.
- **Do not leave commented-out code.** Git remembers it. If it must stay briefly,
  add a `// TODO(DW-xxx):` note naming the task that resolves it.
- **Do not narrate the obvious** in a way that will drift out of date — a wrong
  comment is worse than none.
- **`TODO` format:** `// TODO(DW-030): remove the console log once the panel opens.`

---

## Error handling

- **Fail loudly in development, gracefully for the user.** Never swallow an error
  to keep going silently.
- **Backend:**
  - Use `async` handlers and let errors propagate; do not create empty `catch`
    blocks.
  - Log with enough context to reproduce (`cache`, `db`, and startup code already
    use `console.error`).
  - Refuse to start on invalid required configuration rather than defaulting
    silently ([`../architecture/security-and-caching.md`](../architecture/security-and-caching.md)).
- **Frontend:**
  - A failed asset load must not blank the world — degrade to placeholder visuals
    (ADR-0007).
  - Do not let a canvas error break the surrounding HTML UI, or vice versa.
- **Never** add a `try`/`catch` whose only effect is to hide a failure. If a failure
  is genuinely safe to ignore, say so in a comment.
- **Never** commit `catch` blocks that log nothing.

```js
// ✅ the intent is explicit
try {
  await connectCache()
} catch (error) {
  console.error('Cache unavailable; continuing without it.', error)
}
```

---

## Working with the DOM

- The interface uses **React + HTML/CSS** — React manages the UI components,
  and HTML/CSS provide the structure and styling.
- **Never `document.querySelector` inside a Phaser scene.** Scenes emit through
  the DOM bridge; UI modules subscribe
  ([`../architecture/frontend.md`](../architecture/frontend.md#the-dom-bridge)).
- In React modules, prefer `useRef` for DOM access over `document.querySelector`.
- Update text with `textContent`, not `innerHTML`, for anything user-derived.
- Give interactive elements real semantics — `<button>` with a label, not a
  clickable `<div>` — and keep them keyboard reachable (NFR-010).
- Keep DOM lookups near the top of a UI module; do not re-query on every frame.
- Update text with `textContent`, not `innerHTML`, for anything user-derived.
- Give interactive elements real semantics — `<button>` with a label, not a
  clickable `<div>` — and keep them keyboard reachable (NFR-010).

---

## Phaser-specific

- **Never load Phaser from a CDN.** Import the package: `import Phaser from 'phaser'`.
- **Register every scene** in the game config — an unregistered scene never runs.
- **Put gameplay in `update`, not in `create`**, and use `delta` for anything
  time-based (FR-004).
- **Do not build objects every frame.** Create in `create`, reuse in `update`.
- **Never hard-code world positions** in a scene once maps are data-driven
  (FR-018) — read them from map data.
- **Use constants** for sizes, speeds, and depths, defined once
  (`world/constants.js`), not repeated as literals.
- **Naming:** enable `debug: true` on physics only while actively debugging, then
  turn it off.

---

## Formatting and tooling

- **There is no linter or formatter configured** (no ESLint/Prettier config, and no
  `lint` script). Match the surrounding code by hand, and keep the diff minimal.
- If a formatter is ever added, add it as an explicit decision in
  [`../planning/decisions.md`](../planning/decisions.md) — and do not silently
  reformat unrelated files.
- **Keep changes focused.** A bug fix should not carry a style sweep; mixed diffs
  are hard to review.

---

## Quick self-check before committing

- [ ] No semicolons, single quotes, 2-space indent — consistent with the file.
- [ ] Relative imports end in `.js`; cross-workspace imports use package names.
- [ ] Names use the project's domain vocabulary.
- [ ] No commented-out code; TODOs name a task ID.
- [ ] No swallowed errors.
- [ ] No hard-coded sizes, speeds, or dwelling positions.
- [ ] No secrets, and nothing added to a gitignored path by accident.
- [ ] `npm run build` still passes.

## Related

- [`folder-structure.md`](folder-structure.md) — where code goes
- [`testing.md`](testing.md) — how to verify it works
- [`../architecture/frontend.md`](../architecture/frontend.md) — frontend module responsibilities
- [`../project/glossary.md`](../project/glossary.md) — the vocabulary to use in code
