import type { D1Like } from "@/lib/db/types";
import { newId, nowIso } from "@/lib/db/client";
import { constantTimeEqual, generateOtpCode, hmacHex } from "./hash";

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const OTP_MAX_SENDS_PER_WINDOW = 3;
const OTP_SEND_WINDOW_SECONDS = 15 * 60;
const OTP_MAX_VERIFY_ATTEMPTS = 5;

export type OtpPurpose = "login" | "invitation";

interface OtpRow {
  id: string;
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
  attempts: number;
}

function isoInSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000)
    .toISOString()
    .replace(/\.\d+Z$/, "Z");
}

export interface CreateOtpResult {
  ok: boolean;
  /** The plaintext code, only returned so the caller can email it. */
  code?: string;
  error?: "rate_limited";
}

/**
 * Create and store a hashed OTP for `email`, enforcing a per-email send
 * throttle. Returns the plaintext code for the caller to deliver by email —
 * it is never persisted in plaintext.
 */
export async function createOtp(
  db: D1Like,
  email: string,
  purpose: OtpPurpose = "login",
): Promise<CreateOtpResult> {
  const normalized = email.trim().toLowerCase();
  const windowStart = isoInSeconds(-OTP_SEND_WINDOW_SECONDS);

  const recent = await db
    .prepare(
      "SELECT COUNT(*) AS c FROM auth_otps WHERE lower(email) = ? AND created_at >= ?",
    )
    .bind(normalized, windowStart)
    .first<{ c: number }>();

  if ((recent?.c ?? 0) >= OTP_MAX_SENDS_PER_WINDOW) {
    return { ok: false, error: "rate_limited" };
  }

  const code = generateOtpCode(6);
  const codeHash = await hmacHex(`${normalized}:${code}`);

  await db
    .prepare(
      `INSERT INTO auth_otps (id, email, code_hash, purpose, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(newId(), normalized, codeHash, purpose, isoInSeconds(OTP_TTL_SECONDS), nowIso())
    .run();

  return { ok: true, code };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "expired" | "too_many_attempts" | "not_found" };

/**
 * Verify a submitted OTP for `email`. Consumes the code on success. Tracks
 * attempts to resist brute force and rejects expired / exhausted codes.
 */
export async function verifyOtp(
  db: D1Like,
  email: string,
  code: string,
): Promise<VerifyOtpResult> {
  const normalized = email.trim().toLowerCase();

  const row = await db
    .prepare(
      `SELECT id, code_hash, expires_at, consumed_at, attempts
         FROM auth_otps
        WHERE lower(email) = ? AND consumed_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1`,
    )
    .bind(normalized)
    .first<OtpRow>();

  if (!row) return { ok: false, error: "not_found" };

  if (row.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
    return { ok: false, error: "too_many_attempts" };
  }

  if (row.expires_at < nowIso()) {
    return { ok: false, error: "expired" };
  }

  // Always record the attempt before deciding.
  await db
    .prepare("UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?")
    .bind(row.id)
    .run();

  const candidate = await hmacHex(`${normalized}:${code}`);
  if (!constantTimeEqual(candidate, row.code_hash)) {
    return { ok: false, error: "invalid" };
  }

  await db
    .prepare("UPDATE auth_otps SET consumed_at = ? WHERE id = ?")
    .bind(nowIso(), row.id)
    .run();

  return { ok: true };
}
