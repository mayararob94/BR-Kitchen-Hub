import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-16">
      <LoginForm />
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to home
      </Link>
    </main>
  );
}
