/** Read the signing secret shared by OTP hashing and session JWTs. */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is not set (or too short). Set a strong random value.",
    );
  }
  return secret;
}

export function isAuthConfigured(): boolean {
  return (
    typeof process.env.AUTH_SECRET === "string" &&
    process.env.AUTH_SECRET.length >= 16
  );
}
