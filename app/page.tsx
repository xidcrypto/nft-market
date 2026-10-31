"use client";

import { useState } from "react";
import Link from "next/link";
import { getTierImage } from "./lib/tier-utils";
import { Footer } from "./components/footer-component";
import { LoadingOverlay } from "./components/loading-overlay";
import { useMarketStats, useMarketListings, formatLastUpdated } from "./lib/realtime";

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
  const [expandedTier, setExpandedTier] = useState<number | null>(null);

  const stats = useMarketStats({ interval: 15000 });
  const listings = useMarketListings({ interval: 15000 });

  const marketData = stats.data;
  const previewListings = listings.data?.slice(0, 5) ?? [];
  const lastUpdated = stats.lastUpdated;

  const minted = marketData?.totalMinted ?? 0;

  const statsRow = [
    { label: "Floor", value: marketData?.floorPriceBnb ? `${marketData.floorPriceBnb} BNB` : "—" },
    { label: "Total Volume", value: marketData?.totalVolumeBnb ? `${marketData.totalVolumeBnb} BNB` : "—" },
    { label: "24h Volume", value: marketData?.volume24hBnb ? `${marketData.volume24hBnb} BNB` : "—" },
    { label: "Listed", value: marketData?.listedCount != null ? String(marketData.listedCount) : "—" },
    { label: "Minted", value: `${minted} / 5,000` },
  ];

  const loading = stats.loading || listings.loading;

  return (
    <main className="min-h-screen bg-background text-primary antialiased">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Loading overlay scoped to content area */}
        <LoadingOverlay
          isLoading={loading && marketData === null}
          label="Loading market data…"
        />

        {/* Hero */}
        <section className="py-24 md:py-32 text-center animate-content-fade-in">
          <p className="text-[10px] text-secondary uppercase tracking-widest mb-4">
            BNB Chain · Free Mint for Agent ID Holders
          </p>
          <h1 className="text-accent-gold font-semibold tracking-tighter mb-6" style={{ fontSize: "clamp(32px, 6vw, 56px)", lineHeight: "1.1" }}>
            Aegis Crown
          </h1>
          <p className="text-secondary leading-relaxed mb-8 max-w-[600px] mx-auto text-lg">
            A 5,000-piece collectible for Binance Agent ID holders. One per Agent ID. Gas only.
          </p>
          <img
            src={getTierImage(3)}
            alt="Aegis Crown Legendary NFT"
            className="mx-auto max-w-[480px] w-full aspect-square rounded-3xl border border-border"
            decoding="async"
          />
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/mint"
              className="w-full sm:w-auto px-8 py-3 text-base font-medium text-black bg-accent-gold rounded-full focus:ring-2 focus-ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors duration-150"
            >
              Mint for AI Agents
            </Link>
            <Link
              href="/market"
              className="text-sm text-secondary hover:text-primary transition-colors"
            >
              Browse the Market →
            </Link>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-t border-border border-b border-border py-12 md:py-16 animate-content-fade-in-delay-1">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-2 text-center text-xs text-secondary">
            {statsRow.map((stat) => (
              <div key={stat.label} className="border-r border-border last:border-r-0 py-2 md:py-1">
                <div className="text-accent-gold font-medium tabular-nums">{stat.value}</div>
                <div className="text-secondary">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tier gallery */}
        <section className="py-12 md:py-16 animate-content-fade-in-delay-2">
          <div className="border border-border divide-y border-border">
            {TIER_DATA.map((tier, idx) => {
              const isExpanded = expandedTier === tier.tier;
              return (
                <div key={tier.tier} className="flex items-center gap-4 px-4 py-4 cursor-pointer hover:border-accent-gold/50 transition-colors duration-150" onClick={() => setExpandedTier(isExpanded ? null : tier.tier)}>
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
            <div className="px-4 py-6 border-t border-border border-l border-border border-r border-border bg-surface/30">
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

        {/* Market preview */}
        <section className="py-12 md:py-16 animate-content-fade-in-delay-3">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-semibold text-primary">Market Preview</h2>
            <Link href="/market" className="text-sm text-accent-gold hover:text-primary transition-colors">
              View all listings →
            </Link>
          </div>
          {loading ? (
            <div className="border border-border rounded-2xl p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-accent-gold border-t-transparent mx-auto mb-4" />
              <p className="text-secondary mb-4">Loading market data…</p>
            </div>
          ) : (
            <>
              {previewListings.length === 0 ? (
                <div className="border border-border rounded-2xl p-12 text-center">
                  <svg className="w-12 h-12 mx-auto text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <p className="text-secondary mb-4">No listings yet — be the first to list</p>
                  <Link
                    href="/mint"
                    className="inline-block px-6 py-2.5 text-sm font-medium text-black bg-accent-gold rounded-lg focus:ring-2 focus-ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors"
                  >
                    Go to Mint
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {previewListings.map((l: any) => {
                    const tier = l.tokenId % 5000 < 3000 ? 0 : l.tokenId % 5000 < 4250 ? 1 : l.tokenId % 5000 < 4850 ? 2 : l.tokenId % 5000 < 4950 ? 3 : 4;
                    const tierName = ["Common", "Rare", "Epic", "Legendary", "Mythic"][tier];
                    return (
                      <div key={l.tokenId} className="bg-surface/30 border border-border rounded-xl p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <img src={getTierImage(tier)} alt={tierName} className="w-12 h-12 rounded-lg border border-border object-cover" />
                          <div>
                            <div className="text-sm font-medium">Aegis Crown #{l.tokenId}</div>
                            <div className="text-xs text-secondary">{tierName}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-accent-gold font-medium tabular-nums">{l.priceBnb} BNB</div>
                          <Link href="/market" className="text-xs text-secondary hover:text-primary">
                            View on Market →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {lastUpdated && (
                <p className="mt-8 text-[10px] text-secondary text-center">
                  Live · Updated {formatLastUpdated(lastUpdated)}
                </p>
              )}
            </>
          )}
        </section>

        <Footer />
      </div>
    </main>
  );
}
