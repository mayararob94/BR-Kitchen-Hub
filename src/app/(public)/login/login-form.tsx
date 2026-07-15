"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  requestOtpAction,
  verifyOtpAction,
  postLoginDestination,
  type RequestOtpState,
  type VerifyOtpState,
} from "./actions";

const requestInitial: RequestOtpState = { ok: false };
const verifyInitial: VerifyOtpState = { ok: false };

export function LoginForm() {
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");

  const [requestState, requestAction, requesting] = useActionState(
    requestOtpAction,
    requestInitial,
  );
  const [verifyState, verifyAction, verifying] = useActionState(
    verifyOtpAction,
    verifyInitial,
  );

  useEffect(() => {
    if (requestState.ok && requestState.email) {
      setEmail(requestState.email);
      setStage("code");
    }
  }, [requestState]);

  useEffect(() => {
    if (verifyState.ok) {
      postLoginDestination().then((dest) => router.replace(dest));
    }
  }, [verifyState, router]);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ChefHat className="size-6" aria-hidden />
        </div>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          {stage === "email"
            ? "Enter your email to receive a one-time code."
            : `We sent a 6-digit code to ${email}.`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {stage === "email" ? (
          <form action={requestAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@business.com.au"
                defaultValue={email}
              />
            </div>
            {requestState.error ? (
              <p className="text-sm text-destructive" role="alert">
                {requestState.error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={requesting}>
              {requesting ? <Loader2 className="size-4 animate-spin" /> : null}
              Send code
            </Button>
          </form>
        ) : (
          <form action={verifyAction} className="space-y-4">
            <input type="hidden" name="email" value={email} />
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                placeholder="000000"
                autoFocus
              />
            </div>
            {verifyState.error ? (
              <p className="text-sm text-destructive" role="alert">
                {verifyState.error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={verifying}>
              {verifying ? <Loader2 className="size-4 animate-spin" /> : null}
              Verify &amp; continue
            </Button>
            <button
              type="button"
              onClick={() => setStage("email")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Use a different email
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
