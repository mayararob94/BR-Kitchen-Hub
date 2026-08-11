import type { Metadata } from "next";
import { bodyFont, displayFont } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "MEALzinha Hub",
  description: "Offline order management for MEALzinha weekly meal prep",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
