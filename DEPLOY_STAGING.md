# Staging deploy runbook — Cloudflare Workers (`*.workers.dev`)

This deploys the current branch to a hosted staging draft on Cloudflare. It is
written so **any** session on a correctly configured environment can run it
top-to-bottom without extra context. The git branch is the source of truth;
sessions are disposable.

## Prerequisites (all in ONE environment)

The environment that runs the deploy must have **both**:

1. **Credentials** — environment variables:
   - `CLOUDFLARE_API_TOKEN` — token with **Workers Scripts / D1 / Workers KV /
     R2 → Edit** permissions.
   - `CLOUDFLARE_ACCOUNT_ID`.
2. **Network access to Cloudflare's API.** The default **Trusted** policy does
   **not** allow `api.cloudflare.com` (verified: 403 policy denial). Set the
   environment's network policy to **Custom** with *“Also include default list
   of common package managers”* checked, plus these domains:
   ```
   api.cloudflare.com
   *.cloudflare.com
   *.cloudflarestorage.com
   ```
   (Or use **Full** access if that is acceptable for a throwaway staging env.)

> Environment-variable and network-policy changes only take effect in a session
> that **starts** after they are saved. Configure the environment, then open a
> fresh session on it and run this runbook.

## One-time resource creation

Run from the repo root. `$CF` prefixes wrangler with the token so it is never
written to disk:

```bash
export CLOUDFLARE_API_TOKEN=...   # already in env if configured above
export CLOUDFLARE_ACCOUNT_ID=...

# 1. D1 database
npx wrangler d1 create br-kitchen-hub-db
# 2. KV namespace for Next incremental cache
npx wrangler kv namespace create NEXT_INC_CACHE_KV
# 3. R2 buckets (private)
npx wrangler r2 bucket create br-kitchen-hub-documents
npx wrangler r2 bucket create br-kitchen-hub-photos
```

Copy the returned IDs into **`wrangler.jsonc`**, replacing the `PLACEHOLDER_*`
values:
- `d1_databases[0].database_id` ← D1 `database_id`
- `kv_namespaces[0].id` ← KV `id`
- (bucket names already match; no ID needed for R2)

Commit that change to the branch.

## Secrets

```bash
# Strong session secret (do NOT reuse the local dev value)
openssl rand -base64 48 | npx wrangler secret put AUTH_SECRET

# Temporary staging password sign-in (see README). Value stays out of the repo.
printf 'br-admin-login-test' | npx wrangler secret put STAGING_LOGIN_PASSWORD
```

## Database migration + seed (remote)

```bash
npx wrangler d1 migrations apply br-kitchen-hub-db --remote

# Seed base settings + a super-admin. Edit the email first if needed.
npx wrangler d1 execute br-kitchen-hub-db --remote --file=scripts/seed.sql
```

The seed's super-admin email is `owner@brkitchenhub.com.au` by default. To use a
different address (e.g. `lucasnasc.aus@outlook.com`), change it in
`scripts/seed.sql` before running, or run an `UPDATE users SET email=...` after.

## Build + deploy

```bash
npm run deploy   # opennextjs-cloudflare build && ... deploy
```

Wrangler prints the deployed URL, e.g.
`https://br-kitchen-hub.<account>.workers.dev`.

## First sign-in

Because Resend email is not wired up until Phase 3, use the staging password:

1. Open the deployed URL → **Sign in**.
2. Click **“Use the staging password”**.
3. Email = the seeded super-admin address; password = the
   `STAGING_LOGIN_PASSWORD` value.
4. You land in `/admin`.

Remove the `STAGING_LOGIN_PASSWORD` secret (`wrangler secret delete`) to return
to OTP-only login.

## Notes

- `wrangler.jsonc` currently ships with `PLACEHOLDER_*` IDs so the repo builds
  without leaking real resource IDs. The deploy step above fills them in.
- Local network note: in this managed environment npm must be routed through the
  egress proxy. See `.npmrc` (gitignored) — it is created per session, not
  committed.
