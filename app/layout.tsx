import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "./components/header-component";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A0B",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: {
    default: "Aegis Crown (AEGIS)",
    template: "%s | Aegis Crown",
  },
  description: "Aegis Crown (AEGIS) NFT collection on BNB Chain. Free mint for Binance Agent ID holders. Trade on the Aegis Market.",
  keywords: ["NFT", "BNB Chain", "Aegis Crown", "AEGIS", "Web3", "Decentralized", "ERC721"],
  authors: [{ name: "Aegis Crown" }],
  creator: "Aegis Crown",
  publisher: "Aegis Crown",
  metadataBase: new URL("https://aegis-crown.vercel.app"),
  openGraph: {
    title: "Aegis Crown (AEGIS) — NFT Collection on BNB Chain",
    description: "Aegis Crown (AEGIS) NFT collection on BNB Chain. Free mint for Binance Agent ID holders. Trade on the Aegis Market.",
    url: "https://aegis-crown.vercel.app",
    siteName: "Aegis Crown",
    images: [
      {
        url: "https://i.postimg.cc/90ChCd4G/tier-legendary.webp",
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
    title: "Aegis Crown (AEGIS) — NFT Collection on BNB Chain",
    description: "Aegis Crown (AEGIS) NFT collection on BNB Chain. Free mint for Binance Agent ID holders. Trade on the Aegis Market.",
    images: ["https://i.postimg.cc/90ChCd4G/tier-legendary.webp"],
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
    canonical: "https://aegis-crown.vercel.app",
  },
  category: "technology",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32 48x48", type: "image/x-icon" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-primary antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
