"use client";

import { useState, useTransition } from "react";

/**
 * A button that runs a server action after a confirm() prompt.
 * Used for delete/destructive actions so nothing is removed without warning.
 */
export function ConfirmButton({
  action,
  confirmMessage,
  className = "btn-danger",
  children,
}: {
  action: () => Promise<void> | void;
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={className}
        onClick={() => {
          if (!window.confirm(confirmMessage)) return;
          setErr(null);
          startTransition(async () => {
            try {
              await action();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Action failed");
            }
          });
        }}
      >
        {pending ? "Working…" : children}
      </button>
      {err && <span className="ml-2 text-xs text-red-600">{err}</span>}
    </>
  );
}
