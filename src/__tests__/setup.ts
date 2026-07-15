import "@testing-library/jest-dom/vitest";

// A stable secret for auth/HMAC tests. Never used outside tests.
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-secret-value-please-change-0123456789";
