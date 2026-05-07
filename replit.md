# ProjectTnW

A production-ready multi-tenant SaaS platform for school student transportation management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/app run dev` — run the frontend (proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT via `SESSION_SECRET`, stored in localStorage as `tnw_token`
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/`)
- Frontend: React + Vite + Tailwind + shadcn/ui + wouter + TanStack Query
- Build: esbuild (CJS bundle for API server)

## Where things live

- `lib/db/src/schema/` — Drizzle ORM schema (source of truth for DB shape)
- `lib/api-spec/openapi.yaml` — OpenAPI 3.1 spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — auto-generated hooks & schemas (do not edit)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/auth.ts` — JWT middleware (`requireAuth`, `requireSuperAdmin`)
- `artifacts/app/src/pages/` — frontend pages
- `artifacts/app/src/contexts/AuthContext.tsx` — auth state management
- `artifacts/app/src/lib/api.ts` — token setter wired to customFetch

## Architecture decisions

- **Multi-tenant**: every resource is scoped by `tenantId`; JWT carries `userId`, `tenantId`, `role`
- **Contract-first**: OpenAPI spec → Orval codegen → type-safe React Query hooks; API server validates with Zod schemas from `lib/api-zod`
- **Single JWT**: stateless auth, no sessions table; token expires in 7 days
- **bcryptjs**: used instead of native `bcrypt` to avoid native build issues in Replit
- **Shared proxy**: API at `/api`, frontend at `/`; no Vite proxy config needed

## Product

Multi-tenant school transportation management with:
- **Admin portal**: vehicles, drivers, routes/stops, students, trips, incidents, maintenance logs, team management
- **Super-admin dashboard**: manage all tenants, users, platform audit log
- **Role-based access**: `super_admin`, `admin`, `dispatcher`, `driver`, `parent`
- **Real-time tracking**: Socket.IO stubs ready for GPS trip location updates
- **Stripe billing stubs**: plan/subscription fields on tenant, ready for payment integration

## User preferences

- Navy/amber color scheme throughout
- TypeScript strict mode — no `any` unless truly necessary
- Always import types from the main package index, not deep subpaths

## Gotchas

- Never run `pnpm dev` at workspace root — use workflow restart or individual `--filter` commands
- Import all generated types from `@workspace/api-client-react` (main index), not from `/src/generated/...` subpaths
- `useGetMe` requires `queryKey: getGetMeQueryKey()` in the query options due to Orval strict types
- `status` fields on schema objects are `string | null | undefined` — accept `undefined` in components
- API server uses pino logger; never use `console.log` in server code

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- DB schema: `lib/db/src/schema/index.ts`
- OpenAPI spec: `lib/api-spec/openapi.yaml`
