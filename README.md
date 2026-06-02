# Wedboard

Wedding and event management platform. Planners manage invitations, guests, RSVPs, menus, and seating from a private dashboard. Guests RSVP through public invitation links — no account required.

## Stack

- **Next.js 16** (App Router) · **Convex** (backend/DB) · **Clerk** (auth) · **shadcn/ui** · **Tailwind CSS**

## Setup

**1. Install dependencies**
```bash
pnpm install
```

**2. Add environment variables** — copy `.env.local.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_FRONTEND_API_URL=
```

**3. Set the Clerk issuer in Convex** (once)
```bash
npx convex env set CLERK_FRONTEND_API_URL "https://your-instance.clerk.accounts.dev"
```

> Also activate the Clerk Convex integration at [dashboard.clerk.com/apps/setup/convex](https://dashboard.clerk.com/apps/setup/convex) — required for JWT validation.

**4. Run**
```bash
pnpm convex:dev   # terminal 1
pnpm dev          # terminal 2
```

Or combined: `pnpm dev:all`

Open [http://localhost:3000](http://localhost:3000).

## Key commands

```bash
pnpm dev          # Next.js dev server
pnpm convex:dev   # Convex dev (deploys schema + regenerates types)
pnpm build        # Production build
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
pnpm test         # Vitest
```

## Project structure

```
convex/           Convex backend — schema, functions, auth config
src/
  app/            Next.js routes (App Router)
  components/     UI components
  lib/            Utilities and Zod validation schemas
```

For full architecture details see [CLAUDE.md](./CLAUDE.md).
