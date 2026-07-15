import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Like } from "./types";

/**
 * Resolve the D1 binding from the Cloudflare request context.
 *
 * The binding name (`DB`) matches wrangler.jsonc. We cast through the
 * narrow {@link D1Like} interface so callers get a testable surface and we
 * never depend on generated `CloudflareEnv` types being present.
 */
export function getDb(): D1Like {
  const { env } = getCloudflareContext();
  const db = (env as unknown as { DB?: D1Like }).DB;
  if (!db) {
    throw new Error(
      "D1 binding 'DB' is not available. Check wrangler.jsonc and that the " +
        "code runs inside a Cloudflare request context.",
    );
  }
  return db;
}

/** A short unique id for new rows. Uses the Web Crypto UUID available in Workers. */
export function newId(): string {
  return crypto.randomUUID();
}

/** Current time as an ISO-8601 UTC string, matching the schema's timestamp format. */
export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}
