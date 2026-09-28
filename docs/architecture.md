# Architecture

Dwelling is a single npm-workspace monorepo. The frontend and backend are
separate applications, while `shared/` contains small contracts that both can
import. PostgreSQL is accessed through Prisma, and Redis is isolated behind the
backend cache module and remains optional for local development.

## Responsibilities

- `frontend/`: Vite browser app, Phaser world experience, and chat interface.
- `backend/`: Express HTTP API and Socket.IO event transport.
- `database/`: Prisma schema and generated migration history.
- `shared/`: environment-independent JavaScript constants and contracts.
- `tests/`: cross-workspace tests as features are implemented.
- `docs/`: architecture and project decisions.
- `scripts/`: repeatable maintenance and development scripts.

The frontend communicates with the backend over HTTP for request/response work
and Socket.IO for realtime events. Backend route handlers and socket handlers
should call domain/data modules rather than embedding persistence logic in the
transport layer. Redis access stays behind `backend/src/cache/` so the cache
implementation can be changed without coupling feature code to Redis.
