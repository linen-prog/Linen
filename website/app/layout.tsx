import type { Metadata } from "next";
import { pairFor } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Linen — Wardrobe, Simplified",
  description:
    "Linen helps you build a wardrobe you actually love. Catalog your clothes, plan outfits, and shop smarter — all in one beautifully simple app.",
  icons: { icon: "/app-icon.png", apple: "/app-icon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={pairFor("expressive")}
      style={{ "--brand": "82" } as React.CSSProperties}
    >
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
