import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BR Kitchen Hub — Commercial Kitchen Hire, Gold Coast",
    template: "%s · BR Kitchen Hub",
  },
  description:
    "Shared commercial kitchen hire on the Gold Coast, Queensland. Book a tour, hire by the hour, add storage, and manage your food business in one place.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
