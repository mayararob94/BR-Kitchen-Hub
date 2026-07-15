// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, type TestDb } from "./helpers/test-db";
import { createOtp, verifyOtp } from "@/lib/auth/otp";

let db: TestDb;
beforeEach(() => {
  db = createTestDb();
});

describe("OTP auth", () => {
  it("issues a code and verifies it once", async () => {
    const created = await createOtp(db, "User@Example.com");
    expect(created.ok).toBe(true);
    expect(created.code).toMatch(/^\d{6}$/);

    const good = await verifyOtp(db, "user@example.com", created.code!);
    expect(good.ok).toBe(true);

    // Consumed — cannot be reused.
    const reuse = await verifyOtp(db, "user@example.com", created.code!);
    expect(reuse.ok).toBe(false);
  });

  it("rejects an incorrect code", async () => {
    const created = await createOtp(db, "wrong@example.com");
    // Flip the first digit to guarantee a different 6-digit code.
    const firstDigit = created.code!.charAt(0);
    const flipped = (((Number(firstDigit) + 1) % 10).toString()) + created.code!.slice(1);
    const result = await verifyOtp(db, "wrong@example.com", flipped);
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toBe("invalid");
  });

  it("is case-insensitive on the email", async () => {
    const created = await createOtp(db, "Mix@Case.com");
    const good = await verifyOtp(db, "mix@case.com", created.code!);
    expect(good.ok).toBe(true);
  });

  it("rate-limits after 3 sends in the window", async () => {
    expect((await createOtp(db, "spam@example.com")).ok).toBe(true);
    expect((await createOtp(db, "spam@example.com")).ok).toBe(true);
    expect((await createOtp(db, "spam@example.com")).ok).toBe(true);
    const fourth = await createOtp(db, "spam@example.com");
    expect(fourth.ok).toBe(false);
    expect(fourth.error).toBe("rate_limited");
  });

  it("rejects an expired code", async () => {
    const created = await createOtp(db, "old@example.com");
    db.exec(
      "UPDATE auth_otps SET expires_at = '2000-01-01T00:00:00Z' WHERE lower(email) = 'old@example.com'",
    );
    const result = await verifyOtp(db, "old@example.com", created.code!);
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toBe("expired");
  });

  it("returns not_found when no code was issued", async () => {
    const result = await verifyOtp(db, "nobody@example.com", "123456");
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toBe("not_found");
  });
});
