import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "./components/header-component";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1a1a2e",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: {
    default: "Aegis Crown — NFT on BNB Chain",
    template: "%s | Aegis Crown",
  },
  description: "Aegis Crown NFT collection on BNB Chain. Mint, collect, and trade unique challenge-response crowns across 5 rarity tiers.",
  keywords: ["NFT", "BNB Chain", "Aegis Crown", "Web3", "Decentralized", "ERC721"],
  authors: [{ name: "Aegis Crown" }],
  creator: "Aegis Crown",
  publisher: "Aegis Crown",
  metadataBase: new URL("https://aegis-crown.com"),
  openGraph: {
    title: "Aegis Crown — NFT Collection on BNB Chain",
    description: "Aegis Crown NFT collection on BNB Chain. Mint, collect, and trade unique challenge-response crowns across 5 rarity tiers.",
    url: "https://aegis-crown.com",
    siteName: "Aegis Crown",
    images: [
      {
        url: "/images/legendary.svg",
        width: 1200,
        height: 630,
        alt: "Aegis Crown Legendary NFT",
      },
    ],
    locale: "en-US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aegis Crown — NFT Collection on BNB Chain",
    description: "Aegis Crown NFT collection on BNB Chain. Mint, collect, and trade unique challenge-response crowns across 5 rarity tiers.",
    images: ["/images/legendary.svg"],
    creator: "@AegisCrown",
    site: "@AegisCrown",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://aegis-crown.com",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-neutral-950 text-gray-200 antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
