"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTierImage } from "./lib/tier-utils";
import { CONFIG } from "./lib/config";

const TIER_DATA = [
  { tier: 0, name: "Common — Scout", power: 10, supply: 3000, share: 60 },
  { tier: 1, name: "Rare — Validator", power: 25, supply: 1250, share: 25 },
  { tier: 2, name: "Epic — Sentinel", power: 50, supply: 600, share: 12 },
  { tier: 3, name: "Legendary — Genesis", power: 100, supply: 100, share: 2 },
  { tier: 4, name: "Mythic — Apex", power: 150, supply: 50, share: 1 },
];

const TIER_DESC = [
  "Common Scout NFTs — foundational support at the base of the Aegis hierarchy.",
  "Rare Validator NFTs — trusted validators securing the network.",
  "Epic Sentinel NFTs — elite guardians protecting the realm.",
  "Legendary Genesis NFTs — the first of their kind, created at dawn.",
  "Mythic Apex NFTs — the rarest tier, the pinnacle of achievement.",
];

export default function HomePage() {
  const [marketData, setMarketData] = useState<any>(null);
  const [expandedTier, setExpandedTier] = useState<number | null>(null);
  const [mintedCount, setMintedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/market-data.json")
      .then((res) => res.json())
      .then((data) => {
        setMarketData(data);
        setMintedCount(data?.stats?.totalSupplyMinted ?? null);
      })
      .catch(() => {});
  }, []);

  const stats = marketData?.stats;
  const minted = mintedCount ?? 0;
  const mintOpen = minted < 5000;

  const statsRow = [
    { label: "Floor", value: stats?.floorPriceBnb ? `${stats.floorPriceBnb} BNB` : "—" },
    { label: "Total Volume", value: stats?.totalVolumeBnb ? `${stats.totalVolumeBnb} BNB` : "—" },
    { label: "24h Volume", value: stats?.volume24hBnb ? `${stats.volume24hBnb} BNB` : "—" },
    { label: "Listed", value: stats?.listedCount != null ? String(stats.listedCount) : "—" },
    { label: "Minted", value: `${minted} / 5,000` },
  ];

  const scrollToMint = () => {
    const el = document.getElementById("mint-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-background text-primary antialiased">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 md:space-y-20">

        <p className="text-[10px] text-secondary uppercase tracking-widest text-center leading-none">
          Collectible only. No promised returns, no yield, no guaranteed value.
        </p>

        {/* Stats strip */}
        <div className="border-t border-border border-b border-border py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs text-secondary">
            {statsRow.map((stat) => (
              <div key={stat.label} className="border-r border-border last:border-r-0 py-1">
                <div className="text-accent-gold font-medium tabular-nums">{stat.value}</div>
                <div className="text-secondary">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero */}
        <section className="text-center max-w-[720px] mx-auto">
          <p className="text-[10px] text-secondary uppercase tracking-widest mb-4">
            BNB Chain · Free Mint for Agent ID Holders
          </p>
          <h1 className="text-accent-gold font-semibold tracking-tighter mb-4" style={{ fontSize: "clamp(32px, 6vw, 56px)", lineHeight: "1.05" }}>
            Aegis Crown
          </h1>
          <p className="text-secondary leading-relaxed mb-8 max-w-full mx-auto">
            A 5,000-piece collectible for Binance AI Agent ID holders. One per wallet. Gas only.
          </p>
          <img
            src={getTierImage(3)}
            alt="Aegis Crown Legendary NFT"
            className="mx-auto max-w-[480px] w-full aspect-square rounded-3xl border border-border"
            decoding="async"
          />
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={scrollToMint}
              className="w-full sm:w-auto px-8 py-3 text-base font-medium text-black bg-accent-gold rounded-full focus:ring-2 focus-ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors duration-150"
            >
              Mint for AI Agents
            </button>
            <Link
              href="/market"
              className="text-sm text-secondary hover:text-primary transition-colors"
            >
              Browse the Market →
            </Link>
          </div>
        </section>

        {/* Tier gallery */}
        <section className="space-y-0">
          <div className="border border-border divide-y border-border">
            {TIER_DATA.map((tier, idx) => {
              const isExpanded = expandedTier === tier.tier;
              return (
                <div key={tier.tier} className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:border-accent-gold/50 transition-colors duration-150" onClick={() => setExpandedTier(isExpanded ? null : tier.tier)}>
                  <img
                    src={getTierImage(tier.tier)}
                    alt={`${tier.name} tier`}
                    className="w-16 h-16 rounded-2xl border border-border object-cover shrink-0"
                    decoding="async"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium truncate">{tier.name}</span>
                      <span className="text-[10px] text-secondary">Tier {tier.tier}</span>
                    </div>
                    <div className="text-xs text-secondary mt-1">
                      Power {tier.power} · Supply {tier.supply}
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-gold" style={{ width: `${tier.share}%` }} />
                    </div>
                    <div className="text-[10px] text-secondary text-center mt-1">{tier.share}%</div>
                  </div>
                </div>
              );
            })}
          </div>
          {expandedTier !== null && (
            <div className="px-4 py-4 border-t border-border border-l border-border border-r border-border bg-neutral-800/30">
              <img
                src={getTierImage(expandedTier)}
                alt={`${TIER_DATA[expandedTier].name} expanded`}
                className="mx-auto max-w-[480px] w-full rounded-2xl border border-border"
                decoding="async"
              />
              <p className="text-secondary text-sm mt-4 max-w-md mx-auto leading-relaxed">
                {TIER_DESC[expandedTier]}
              </p>
            </div>
          )}
        </section>

        {/* Mint section */}
        <section id="mint-section" className="border border-border rounded-2xl px-4 sm:px-6 lg:px-8 py-8">
          <h3 className="text-sm font-semibold text-accent-gold mb-6">Mint for AI Agents</h3>

          <div className="space-y-4 text-sm text-secondary mb-8">
            <p>Minting is on-chain, gas only, and limited to one per wallet for Agent ID holders.</p>
            <p>Mint access is gated through the Agent ID registry contract.</p>
            <p>Rarity is derived on-chain from the mint solution hash.</p>
          </div>

          <div className="space-y-3 text-xs mb-8">
            <div className="flex gap-2">
              <span className="text-secondary shrink-0">Contract:</span>
              <div className="flex-1 bg-neutral-800/30 border border-border rounded-lg p-2 break-all font-mono text-accent-gold">
                {CONFIG.aegisCrownAddress}
                <button className="ml-2 p-1 text-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent-gold rounded" title="Copy address">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-secondary shrink-0">Market:</span>
              <div className="flex-1 bg-neutral-800/30 border border-border rounded-lg p-2 break-all font-mono text-accent-gold">
                {CONFIG.aegisMarketAddress}
                <button className="ml-2 p-1 text-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent-gold rounded" title="Copy address">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-secondary shrink-0">Registry:</span>
              <div className="flex-1 bg-neutral-800/30 border border-border rounded-lg p-2 break-all font-mono text-accent-gold">
                {CONFIG.registryAddress}
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-secondary shrink-0">Chain ID:</span>
              <span className="text-primary font-mono">56 (BNB Smart Chain)</span>
            </div>
          </div>

          <ol className="list-decimal list-inside space-y-3 text-sm text-secondary mb-8">
            <li>Call <code className="text-accent-gold font-mono">challengeFor(yourWallet)</code> to get your challenge hash.</li>
            <li>Find a nonce where <code className="text-accent-gold font-mono">keccak256(challenge, nonce)</code> has at least 16 leading zero bits.</li>
            <li>Call <code className="text-accent-gold font-mono">mint(nonce)</code> with value 0, after previewing.</li>
            <li>Rarity derived on-chain: 0=Common/Scout, 1=Rare/Validator, 2=Epic/Sentinel, 3=Legendary/Genesis, 4=Mythic/Apex.</li>
          </ol>

          <div className="pt-4 border-t border-border text-xs text-secondary">
            Total minted: <span className="text-primary font-mono tabular-nums">{minted}</span> / 5,000 &nbsp;•&nbsp; Mint open: <span className="text-primary">{mintOpen ? "Yes" : "No"}</span>
          </div>

          <p className="text-[10px] text-secondary mt-4">
            Collectible only. No promised returns, no yield, no guaranteed value.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-8 text-center text-[10px] text-secondary">
          <p className="mb-4">
            Aegis Crown (AEGIS) · BNB Chain · Collectible only. No promised returns, no yield, no guaranteed value.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6">
            <Link
              href="https://bscscan.com/address/0x61dfF633C8eE31f9811F75809dd9b82152597170"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              AegisCrown contract
            </Link>
            <Link
              href="https://bscscan.com/address/0x9A2BC2555Bb7B5254595F1bF9Ab7A5CB6D12828b"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              AegisMarket contract
            </Link>
            <Link
              href="/AGENTS.md"
              className="hover:text-primary transition-colors"
            >
              For AI agents: read AGENTS.md
            </Link>
          </div>
        </footer>

      </div>
    </main>
  );
}
