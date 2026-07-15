import Link from "next/link";
import { ChefHat, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Public landing placeholder. The full marketing site (Home, Kitchen,
 * Equipment, Pricing, Gallery, FAQ, Book a Tour, …) is built in Phase 2 with
 * administrable content. This foundation page states that honestly and
 * routes to the working sign-in.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <ChefHat className="size-7" aria-hidden />
      </div>

      <Badge variant="secondary" className="mb-4">
        Gold Coast · Queensland
      </Badge>

      <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        BR Kitchen Hub
      </h1>
      <p className="mt-4 max-w-xl text-balance text-lg text-muted-foreground">
        A shared commercial kitchen for meal prep, catering, bakeries and food
        businesses — hire by the hour, add storage, and manage everything in one
        place.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Sign in <ArrowRight className="size-4" />
        </Link>
      </div>

      <p className="mt-10 max-w-md text-sm text-muted-foreground">
        The public website and tour booking are being built in Phase 2. The
        foundation — accounts, roles, and secure access — is live now.
      </p>
    </main>
  );
}
