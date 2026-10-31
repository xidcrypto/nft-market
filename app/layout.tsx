import type { Metadata } from "next";
import "./globals.css";
import { Header } from "./components/header-component";

export const metadata: Metadata = {
  title: "Aegis Crown — NFT on BNB Chain",
  description: "The Aegis Crown collection on BNB Chain. Mint, collect, and trade unique tiers of crowns with enchantments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-gray-200 antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}