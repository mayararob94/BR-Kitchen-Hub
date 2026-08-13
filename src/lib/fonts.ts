import { Figtree, Fraunces } from "next/font/google";

// Same fonts as the MEALzinha online project (Figtree body / Fraunces display)
// so invoices and labels match the brand.
export const bodyFont = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});
