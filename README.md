# BR Kitchen Hub

Platform for renting and managing a shared commercial kitchen on the Gold
Coast, Queensland. Built to run one kitchen today and expand to multiple
kitchens / operators without a destructive migration.

- **Currency:** AUD · **Timezone:** Australia/Brisbane · **GST:** configurable
- **Stack:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind + shadcn-style UI · Cloudflare Workers (OpenNext) · D1 (SQLite) · R2 · KV · `jose` auth · Stripe · Resend

> Money is stored as integer cents. Dates are stored as ISO-8601 UTC and
> presented in the kitchen's timezone. Authorization is always enforced on the
> server; the UI never decides access.

## Implementation status

Development is phased. **Phase 1 (foundation) is complete:**

- Project scaffold (Next.js 15 + OpenNext/wrangler, Vitest, ESLint, strict TS)
- Design system: tokens (light/dark), core UI primitives, honest empty states
- D1 schema: operators, kitchens, kitchen_spaces, users, profiles,
  organisations, organisation_members, role_assignments, system_settings,
  audit_logs, auth_otps
- Passwordless OTP auth (`jose` JWT sessions, httpOnly cookies), edge middleware
- RBAC: five roles, capability map, scope-aware `can` / `assertCan`
  (the RLS replacement for D1) + tenant-scoped repositories
- Admin panel and customer portal shells with route guards and navigation

Later phases (public site, tours/CRM, proposals/onboarding, bookings, storage,
documents/contracts, check-in/out, maintenance, invoices/Stripe, reports) are
listed in the navigation with the phase each becomes available.

## Local development

Dependencies must be installed with the npm registry reachable. Then:

```bash
npm install

# 1. Create local Cloudflare resources (once):
npx wrangler d1 create br-kitchen-hub-db          # paste database_id into wrangler.jsonc
npx wrangler kv namespace create NEXT_INC_CACHE_KV # paste id into wrangler.jsonc
npx wrangler r2 bucket create br-kitchen-hub-documents
npx wrangler r2 bucket create br-kitchen-hub-photos

# 2. Environment: copy and fill secrets
cp .env.example .dev.vars   # set AUTH_SECRET (openssl rand -base64 48), etc.
# The edge middleware reads Next's env files (not .dev.vars) in local dev,
# so AUTH_SECRET must also be present in .env.local with the SAME value:
grep '^AUTH_SECRET=' .dev.vars > .env.local

# 3. Apply the migration and seed a super-admin (edit the email in the seed):
npm run db:migrate:local
npx wrangler d1 execute br-kitchen-hub-db --local --file=scripts/seed.sql

# 4. Run
npm run dev
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next dev server (Cloudflare bindings via OpenNext) |
| `npm run build` | Next production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` / `test:run` | Vitest (RBAC, tenant isolation, OTP) |
| `npm run db:migrate:local` / `:remote` | Apply D1 migrations |
| `npm run preview` / `deploy` | OpenNext build → Cloudflare preview / deploy |

## Manually testing Phase 1

1. Seed a super-admin with your email (`scripts/seed.sql`), run `npm run dev`.
2. Visit `/` → **Sign in**. Enter your email; the 6-digit code prints to the
   dev server log until Resend is configured.
3. Enter the code → you land on `/admin` (super-admin). A customer-only account
   would land on `/portal`. Signing out clears the session.
4. Visiting `/admin` or `/portal` without a valid session redirects to `/login`.

## Staging password sign-in (temporary)

Until email delivery (Resend) is wired up in Phase 3, OTP codes only appear in
the server log, which is awkward for a hosted staging draft. Setting the
`STAGING_LOGIN_PASSWORD` secret enables an additional shared-password sign-in
for an existing account:

```bash
wrangler secret put STAGING_LOGIN_PASSWORD   # e.g. a value you share privately
```

The password value never lives in the repo, the comparison is constant-time,
and it only signs in accounts that already exist. Remove the secret to disable
this path and return to OTP-only login (production leaves it unset).

## Security model (D1 has no RLS)

Cloudflare D1 has no row-level security, so tenant isolation is enforced in the
application:

1. Identity is derived from the signed session cookie + database, never from a
   client-supplied id.
2. Every read/write goes through a repository that is constrained to the
   principal's scope (their organisations, or an operator's book for admins).
3. `assertCan(principal, capability, target)` gates mutations server-side.
4. Uploads (later phases) use private R2 buckets and short-lived signed URLs.
5. Tenant-isolation and RBAC rules are covered by unit tests in `src/__tests__`.
