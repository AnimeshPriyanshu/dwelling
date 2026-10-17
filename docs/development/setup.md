# Setup

How to install and run Dwelling locally. **Every command below exists in the
repository** — see [`../development/folder-structure.md`](folder-structure.md) for
where things live.

---

## Prerequisites

| Requirement | Version | Source | Needed for |
| --- | --- | --- | --- |
| **Node.js** | **`>=20.19.0`** | `engines` in root `package.json` | Everything |
| **npm** | A version bundled with Node 20.19+ | — (workspaces required) | Installing and running |
| **PostgreSQL** | Any recent version | Root `README.md` local-development section | The database workspace only |
| **Redis** | Optional | `.env.example` comment | **Not required** — the backend no-ops without `REDIS_URL` |

- The backend loads environment variables with `dotenv` from the **root** `.env`
  file (`backend/src/config/env.js` resolves `../../../.env` relative to itself).
  There is **no mode-specific env file** (no `.env.development`, `.env.local`).
- **The frontend currently reads no environment variables at all.** Only add a
  `VITE_*` variable if the code actually needs one, and remember that anything
  `VITE_*` is public in the built bundle
  ([`../architecture/security-and-caching.md`](../architecture/security-and-caching.md)).

---

## Install

```bash
npm install
```

Run this **from the repository root**. It is a single npm workspace, so one
install covers `frontend`, `backend`, `database`, and `shared` — do not run
`npm install` inside a workspace.

## Configure

```bash
cp .env.example .env
```

Then set `DATABASE_URL` in `.env` for your local PostgreSQL instance. The template
value is:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dwelling?schema=public
```

- `.env` is gitignored — **never commit it** (NFR-011).
- `.env.example` documents the shape with placeholder values only.
- Other keys: `PORT` (default `3000`), `CLIENT_ORIGIN` (default
  `http://localhost:5173`), and optional `REDIS_URL`.
- **Leave `REDIS_URL` unset** to run without Redis; `backend/src/cache/` no-ops.

## Database (optional for frontend work)

```bash
npm run db:generate   # prisma generate → Prisma client into node_modules
npm run db:migrate    # prisma migrate dev → creates/applies migrations
```

- ⚠️ **No migrations have been generated yet.** There is no
  `database/prisma/migrations/` directory, so `db:migrate` would create the first
  one and requires a reachable PostgreSQL database.
- ⚠️ `db:generate` must succeed for `backend/src/db/prisma.js` to import
  `@prisma/client` at all.
- **Neither command is needed to work on the frontend.** The frontend does not
  talk to the database, and the current ten-day plan is frontend-only
  ([`../project/scope.md`](../project/scope.md)).

## Run

```bash
npm run dev            # frontend only  → http://localhost:5173
npm run dev:backend    # backend only   → http://localhost:3000  (separate terminal)
```

- `npm run dev` runs `vite` in the `frontend` workspace.
- `npm run dev:backend` runs `node --watch src/server.js` (auto-restarts on file
  change).
- The Vite dev server proxies `/api` and `/socket.io` (WebSocket included) to
  `http://localhost:3000`, so **you do not need to configure CORS or absolute URLs
  in frontend code** — use relative paths.
- **`npm run dev` starts only the frontend.** With the backend not running, any
  request to `/api/*` will fail to proxy. Nothing in the frontend makes such a
  request today.

Verify the backend is up:

```bash
curl http://localhost:3000/api/health
# → {"status":"ok"}
```

## Build and preview

```bash
npm run build     # vite build → frontend/dist/
npm run preview --workspace @dwelling/frontend   # serve the built output
npm start         # runs the backend from source (node src/server.js)
```

- `frontend/dist/` is gitignored build output — never commit it, and do not edit
  files inside it.
- `npm run preview` is a root-level `npm` invocation against the frontend
  workspace because there is **no root `preview` script**.

## Common tasks

| I want to… | Command |
| --- | --- |
| Start the frontend | `npm run dev` |
| Start the API | `npm run dev:backend` |
| Build the frontend | `npm run build` |
| Generate the Prisma client | `npm run db:generate` |
| Create/apply a migration | `npm run db:migrate` |
| Run all workspace installs | `npm install` (root) |
| Add a frontend dependency | `npm install <pkg> --workspace @dwelling/frontend` |
| Add a backend dependency | `npm install <pkg> --workspace @dwelling/backend` |

**Always install with `--workspace`.** Installing at the root into the wrong
package produces an install that works locally and breaks for everyone else.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Cannot find module '@prisma/client'` | Prisma client not generated | `npm run db:generate` |
| Frontend loads but `/api/*` 404s or hangs | Backend not running | Start `npm run dev:backend` |
| Port already in use (`5173` or `3000`) | A previous run is still active | Stop it, or change `PORT` in `.env` (frontend port: `vite --port`) |
| `prisma migrate dev` fails to connect | PostgreSQL not running, or wrong `DATABASE_URL` | Start PostgreSQL; verify the URL and database exist |
| Redis connection errors | `REDIS_URL` set but no Redis running | **Unset `REDIS_URL`** — Redis is optional |
| Canvas missing from the World panel | Expected today — no game is mounted yet | This is Milestone 1 (DW-002 … DW-006) |
| Build fails on Vite | Dependency mismatch or stale install | Verified working on 2026-10-17 with `vite@8.3.1`. Check `npm ls vite`, then reinstall from the repo root with `npm install` |

---

## What is deliberately missing

Do **not** assume any of these exist:

- **No test command.** No `test` script exists in any `package.json`, and no test
  runner is installed ([`testing.md`](testing.md), ADR-0009).
- **No lint/format command.** No ESLint or Prettier configuration exists.
- **No CI, deployment, or hosting configuration.**
- **No seed data or database fixtures.**
- **No scripts in `scripts/`** — the folder contains only a README.

## Related

- [`folder-structure.md`](folder-structure.md) — repository layout
- [`testing.md`](testing.md) — how to verify work
- [`../architecture/overview.md`](../architecture/overview.md) — how the pieces connect
- Root [`README.md`](../../README.md) — project overview
