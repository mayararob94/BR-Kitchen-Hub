import { getAuthSecret } from "./secret";

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * HMAC-SHA256 of `message` keyed by AUTH_SECRET, hex-encoded. Used to store
 * OTP codes so a database leak never exposes usable codes.
 */
export async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toHex(sig);
}

/** Constant-time comparison of two equal-purpose hex strings. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Generate a numeric OTP of the given length (default 6), zero-padded. */
export function generateOtpCode(length = 6): string {
  const max = 10 ** length;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const n = (buf[0] as number) % max;
  return n.toString().padStart(length, "0");
}
