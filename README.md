# Digivant Solutions

A production-ready multi-tenant SaaS platform for school student transportation management. Built for school districts and transportation operators to manage vehicles, drivers, routes, students, trips, incidents, and maintenance — all in one place.

---

## Overview

Digivant Solutions provides a full-featured admin portal for transportation managers, real-time GPS trip tracking for dispatchers, a parent self-service portal, and a super-admin dashboard for platform operators. Every resource is scoped to a tenant (school district or transportation company), making the platform safe to run for many customers on a single deployment.

---

## Features

- **Admin portal** — manage vehicles, drivers, routes, stops, students, trips, incidents, and maintenance logs
- **Role-based access** — `super_admin`, `admin`, `dispatcher`, `driver`, `parent`
- **Real-time GPS tracking** — Socket.IO-powered live location updates during active trips
- **Trip management** — status transitions, passenger boarding/alighting, full trip history
- **Incident reporting** — file uploads (photos/documents) via Azure Blob Storage or local fallback
- **Team management** — invite users by email, manage roles, revoke access
- **School/district management** — associate students and routes with specific schools
- **Parent portal** — self-service access for parents to view their children's trip status
- **Email notifications** — invitation, welcome, and incident alert emails via SendGrid
- **Super-admin dashboard** — manage all tenants, users, and review the platform audit log
- **Stripe billing stubs** — plan and subscription fields on tenant, ready for payment integration

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 (strict mode) |
| Package manager | pnpm workspaces |
| API server | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Stateless JWT (`SESSION_SECRET`), 7-day expiry |
| Validation | Zod v4 + drizzle-zod |
| API contract | OpenAPI 3.1 → Orval codegen |
| Frontend | React 19 + Vite + Tailwind CSS v4 + shadcn/ui |
| Routing | wouter |
| Data fetching | TanStack Query v5 (generated hooks) |
| Real-time | Socket.IO + Redis adapter |
| Build (API) | esbuild (ESM bundle, `.mjs` output) |

---

## Project Structure

```
.
├── artifacts/
│   ├── app/                  # React + Vite frontend (proxied at /)
│   └── api-server/           # Express 5 API server (proxied at /api)
├── lib/
│   ├── db/                   # Drizzle ORM schema + migrations
│   ├── api-spec/             # OpenAPI 3.1 spec (source of truth for API contract)
│   ├── api-client-react/     # Auto-generated React Query hooks & Zod schemas
│   └── api-zod/              # Zod schemas used by the API server for validation
├── scripts/                  # Shared utility scripts
├── pnpm-workspace.yaml       # Workspace package discovery, catalog pins, overrides
├── tsconfig.base.json        # Shared TypeScript strict defaults
└── tsconfig.json             # Root TS solution config (composite libs only)
```

### Key files

| Path | Purpose |
|---|---|
| `lib/db/src/schema/` | Drizzle ORM schema — source of truth for the DB shape |
| `lib/api-spec/openapi.yaml` | OpenAPI spec — source of truth for the API contract |
| `lib/api-client-react/src/generated/` | Auto-generated hooks & schemas — do not edit |
| `artifacts/api-server/src/routes/` | Express route handlers |
| `artifacts/api-server/src/lib/auth.ts` | JWT middleware (`requireAuth`, `requireSuperAdmin`) |
| `artifacts/api-server/src/lib/email.ts` | Email service (SendGrid or pino dev fallback) |
| `artifacts/api-server/src/lib/socket.ts` | Socket.IO server + Redis adapter |
| `artifacts/api-server/src/lib/upload.ts` | File upload (Azure Blob or local fallback) |
| `artifacts/app/src/pages/` | Frontend page components |
| `artifacts/app/src/contexts/AuthContext.tsx` | Auth state management |
| `artifacts/app/src/lib/useSocket.ts` | Frontend Socket.IO hooks |

---

## Prerequisites

- **Node.js** 24+
- **pnpm** 9+
- **PostgreSQL** database

---

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/dbname`) |
| `SESSION_SECRET` | Secret used to sign JWTs — use a long random string in production |
| `PORT` | Port the service listens on — each service (API server, frontend) needs its own value |

> **Replit users:** `PORT` and `BASE_PATH` are injected automatically by the workflow runner — you do not need to set them manually. When running outside Replit, set `PORT` for each service and `BASE_PATH` for the frontend (defaults to `/`).

### Optional integrations

| Variable | Description |
|---|---|
| `SENDGRID_API_KEY` | SendGrid API key for sending real emails |
| `SENDGRID_FROM_EMAIL` | Verified sender email address for SendGrid |
| `REDIS_URL` | Redis connection URL for Socket.IO multi-instance pub/sub |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage connection string for incident file uploads |
| `AZURE_STORAGE_CONTAINER_NAME` | Azure Blob container name (defaults to `incidents`) |
| `APP_URL` | Base URL used in email links (defaults to `https://$REPLIT_DOMAINS` or `http://localhost:80`) |
| `LOG_LEVEL` | Pino log level — `info`, `debug`, `warn`, `error` (defaults to `info`) |

When optional variables are not set, the app uses safe fallbacks: pino-logged emails in development, local disk for file uploads, and in-memory Socket.IO for single-instance deployments.

---

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Create a `.env` file at the repo root (or set variables in your environment). A reference `.env.example` file is included in the repo.

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/digivant
SESSION_SECRET=your-long-random-secret-here
NODE_ENV=development
```

When running outside Replit, each service also needs `PORT` set (e.g. `PORT=8080` for the API server, `PORT=5173` for the frontend) and the frontend needs `BASE_PATH=/` unless it is mounted at a sub-path.

### 3. Push the database schema

```bash
pnpm --filter @workspace/db run push
```

### 4. Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

The API server starts on port 8080 and is proxied at `/api`.

### 5. Start the frontend

```bash
pnpm --filter @workspace/app run dev
```

The frontend is proxied at `/`. Open the preview to see the app.

> **Note:** Do not run `pnpm dev` at the workspace root — it has no `dev` script by design. Always use `--filter` commands or the workflow runner.

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm --filter @workspace/api-server run dev` | Start the API server in development mode |
| `pnpm --filter @workspace/app run dev` | Start the frontend dev server |
| `pnpm run typecheck` | Full typecheck across all packages |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks and Zod schemas from the OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push DB schema changes (development only) |

---

## API Contract

The API is defined contract-first in `lib/api-spec/openapi.yaml`. After making changes to the spec, run codegen to regenerate the React Query hooks and Zod validation schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Generated files live in `lib/api-client-react/src/generated/` — never edit them directly. Always import generated types from `@workspace/api-client-react` (the main package index), not from deep subpaths.

---

## Optional Integrations

### SendGrid (email)

Set `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`. Without these, email sends are logged to the console via pino in development mode.

### Redis (real-time scaling)

Set `REDIS_URL` to enable the Socket.IO Redis adapter for multi-instance deployments. Without it, Socket.IO runs in-memory and works fine for single-instance setups.

### Azure Blob Storage (file uploads)

Set `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_CONTAINER_NAME` to enable cloud file storage for incident media. Without these, uploads are saved to local disk.

### Stripe (billing)

Tenant records include `plan` and `subscription` fields. Full Stripe integration is stubbed and ready to be wired up.

---

## Architecture Notes

- **Multi-tenant**: every DB resource is scoped by `tenantId`; the JWT carries `userId`, `tenantId`, and `role`
- **Single JWT**: stateless auth with no sessions table; tokens expire after 7 days
- **Shared proxy**: API at `/api` and frontend at `/` are served through a single reverse proxy — no Vite proxy config is needed
- **bcrypt**: password hashing uses the `bcrypt` package
- **Logging**: the API server uses `pino` — never use `console.log` in server code; use `req.log` in route handlers and the singleton `logger` elsewhere
