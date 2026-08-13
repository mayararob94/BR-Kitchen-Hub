"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

type PrintMode = "a4" | "a4l" | "label";

/**
 * Sets the body print mode and injects the correct @page size so the browser's
 * print dialog defaults to the right paper (A4 or 4×6"). Also renders a floating
 * Print button that itself is hidden on paper (.no-print).
 */
export function PrintControls({
  mode,
  backHref,
  title,
}: {
  mode: PrintMode;
  backHref?: string;
  title?: string;
}) {
  useEffect(() => {
    document.body.setAttribute("data-print", mode);

    const style = document.createElement("style");
    style.id = "print-page-size";
    style.textContent =
      mode === "label"
        ? "@page { size: 152.4mm 101.6mm; margin: 0; }"
        : mode === "a4l"
          ? "@page { size: A4 landscape; margin: 10mm; }"
          : "@page { size: A4; margin: 14mm; }";
    document.head.appendChild(style);

    return () => {
      document.body.removeAttribute("data-print");
      document.getElementById("print-page-size")?.remove();
    };
  }, [mode]);

  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        {backHref && (
          <a href={backHref} className="btn-ghost text-sm">
            ← Back
          </a>
        )}
        {title && <span className="text-sm font-medium text-gray-600">{title}</span>}
      </div>
      <button onClick={() => window.print()} className="btn-primary">
        <Printer size={16} /> Print / Save as PDF
      </button>
    </div>
  );
}
