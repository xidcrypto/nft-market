"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { getTierImage, formatAddress } from "./lib/tier-utils";
import { Footer } from "./components/footer-component";
import { PageLoadingWrapper } from "./components/page-loading-wrapper";
import { HeroSlider } from "./components/hero-slider";
import { CollectionGallery } from "./components/collection-gallery";
import {
  useMarketStats,
  useMarketListings,
  useMints,
  formatLastUpdated,
} from "./lib/realtime";

type MintedSlide = {
  tokenId: number;
  tier: number;
  owner: string | null;
  priceBnb: string | null;
  listed: boolean;
};

const TIER_DATA = [
  { tier: 0, name: "Common — Scout", character: "Scout", power: 10, supply: 3000, rarity: 60 },
  { tier: 1, name: "Rare — Validator", character: "Validator", power: 25, supply: 1250, rarity: 25 },
  { tier: 2, name: "Epic — Sentinel", character: "Sentinel", power: 50, supply: 600, rarity: 12 },
  { tier: 3, name: "Legendary — Genesis", character: "Genesis", power: 100, supply: 100, rarity: 2 },
  { tier: 4, name: "Mythic — Apex", character: "Apex", power: 150, supply: 50, rarity: 1 },
];

const TIER_NAMES = ["Common", "Rare", "Epic", "Legendary", "Mythic"];
const TIER_POWERS = [10, 25, 50, 100, 150];
const TIER_SUPPLIES = [3000, 1250, 600, 100, 50];
const TIER_RARITIES = [60, 25, 12, 2, 1];

export default function HomePage() {
  const stats = useMarketStats({ interval: 15000 });
  const listings = useMarketListings({ interval: 15000 });
  const mints = useMints(20, 0);

  const marketData = stats.data;
  const previewListings = listings.data?.slice(0, 5) ?? [];
  const lastUpdated = stats.lastUpdated;

  const mintedCount = marketData?.totalMinted ?? 0;
  const dataReady = !stats.loading && !listings.loading && !mints.loading;

  // Build listing lookup for "listed" status
  const listingLookup = useMemo(() => {
    const map = new Map<number, string>();
    listings.data?.forEach((l) => map.set(l.tokenId, l.priceBnb));
    return map;
  }, [listings.data]);

  // Process mints into slide/card format
  const mintedSlides: MintedSlide[] = useMemo(
    () =>
      (mints.data ?? []).map((m) => ({
        tokenId: m.tokenId,
        tier: Number(m.tier),
        owner: m.owner,
        priceBnb: listingLookup.get(m.tokenId) ?? null,
        listed: listingLookup.has(m.tokenId),
      })),
    [mints.data, listingLookup]
  );

  const mintedCards = useMemo(
    () =>
      mintedSlides.map((s) => ({
        tokenId: s.tokenId,
        tier: s.tier,
        owner: s.owner ?? "",
        priceBnb: s.priceBnb,
        listed: s.listed,
        image: getTierImage(s.tier),
      })),
    [mintedSlides]
  );

  const statsRow = [
    { label: "Floor", value: marketData?.floorPriceBnb ? `${marketData.floorPriceBnb} BNB` : "—" },
    { label: "Total Volume", value: marketData?.totalVolumeBnb ? `${marketData.totalVolumeBnb} BNB` : "—" },
    { label: "24h Volume", value: marketData?.volume24hBnb ? `${marketData.volume24hBnb} BNB` : "—" },
    { label: "Listed", value: marketData?.listedCount != null ? String(marketData.listedCount) : "—" },
    { label: "Minted", value: `${mintedCount} / 5,000` },
  ];

  return (
    <main className="min-h-screen bg-background text-primary antialiased">
      <PageLoadingWrapper dataReady={dataReady}>
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Hero Slider */}
          <HeroSlider minted={mintedSlides} />

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

          {/* Collection */}
          <CollectionGallery cards={mintedCards} dataReady={dataReady} />

          {/* Tiers (detail, not repeating cards) */}
          <section className="py-12 md:py-16 border-t border-border animate-content-fade-in-delay-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-primary">Tiers</h3>
                <p className="text-secondary text-sm mt-1">
                  Rarity derived on-chain from the mint solution hash.
                </p>
              </div>
            </div>
            <div className="border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface/30">
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-secondary">Tier</th>
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-secondary">Name</th>
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-secondary">Power</th>
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-secondary">Supply</th>
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-secondary">Rarity</th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_DATA.map((t, idx) => (
                    <tr key={t.tier} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src={getTierImage(t.tier)}
                            alt={`${t.name} tier`}
                            width={32}
                            height={32}
                            className="rounded-xl border border-border object-cover"
                            decoding="async"
                          />
                          <span className="font-medium text-primary">{t.character}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-primary">{t.name}</td>
                      <td className="px-5 py-4 text-accent-gold font-mono tabular-nums">{t.power}</td>
                      <td className="px-5 py-4 text-secondary tabular-nums">{t.supply.toLocaleString()}</td>
                      <td className="px-5 py-4 text-secondary tabular-nums">{t.rarity}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Market preview */}
          <section className="py-12 md:py-16 animate-content-fade-in-delay-3">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-primary">Market Preview</h3>
              <Link href="/market" className="text-sm text-accent-gold hover:text-primary transition-colors">
                View all listings →
              </Link>
            </div>
            {stats.loading || listings.loading ? (
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
                      className="inline-block px-6 py-2.5 text-sm font-medium text-black bg-accent-gold rounded-lg focus:ring-2 focus:ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors"
                    >
                      Go to Mint
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {previewListings.map((l) => {
                      const tier = l.tokenId % 5000 < 3000 ? 0 : l.tokenId % 5000 < 4250 ? 1 : l.tokenId % 5000 < 4850 ? 2 : l.tokenId % 5000 < 4950 ? 3 : 4;
                      const tierName = TIER_NAMES[tier];
                      return (
                        <div key={l.tokenId} className="bg-surface border border-border rounded-xl p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <img src={getTierImage(tier)} alt={tierName} className="w-12 h-12 rounded-lg border border-border object-cover" />
                            <div>
                              <div className="text-sm font-medium truncate">Aegis Crown #{l.tokenId}</div>
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
      </PageLoadingWrapper>
    </main>
  );
}
