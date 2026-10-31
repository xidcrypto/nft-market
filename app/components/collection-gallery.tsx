"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getTierImage, formatAddress } from "../lib/tier-utils";

const TIER_DATA = [
  { tier: 0, name: "Common — Scout", character: "Scout", power: 10, supply: 3000, rarity: 60 },
  { tier: 1, name: "Rare — Validator", character: "Validator", power: 25, supply: 1250, rarity: 25 },
  { tier: 2, name: "Epic — Sentinel", character: "Sentinel", power: 50, supply: 600, rarity: 12 },
  { tier: 3, name: "Legendary — Genesis", character: "Genesis", power: 100, supply: 100, rarity: 2 },
  { tier: 4, name: "Mythic — Apex", character: "Apex", power: 150, supply: 50, rarity: 1 },
];

const TIER_NAMES = ["Common", "Rare", "Epic", "Legendary", "Mythic"];

type MintCard = {
  tokenId: number;
  tier: number;
  owner: string;
  priceBnb: string | null;
  listed: boolean;
  image: string;
};

type CollectionGalleryProps = {
  cards: MintCard[];
  dataReady: boolean;
};

export function CollectionGallery({ cards, dataReady }: CollectionGalleryProps) {
  const [offset, setOffset] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeSort, setActiveSort] = useState<string>("newest");
  const [hasMore, setHasMore] = useState(cards.length >= 20);

  // Filter + sort
  const filtered = useMemo(() => {
    let items = [...cards];

    if (activeFilter !== "all") {
      const tierIndex = TIER_DATA.findIndex((t) => t.name.startsWith(activeFilter));
      if (tierIndex >= 0) {
        items = items.filter((i) => i.tier === tierIndex);
      }
    }

    items.sort((a, b) => {
      switch (activeSort) {
        case "newest":
          return b.tokenId - a.tokenId;
        case "token-asc":
          return a.tokenId - b.tokenId;
        case "power-desc":
          return (TIER_DATA[b.tier]?.power ?? 0) - (TIER_DATA[a.tier]?.power ?? 0);
        default:
          return 0;
      }
    });

    return items;
  }, [cards, activeFilter, activeSort]);

  const tierFilterChips = [
    { key: "all", label: "All" },
    { key: "Common", label: "Common" },
    { key: "Rare", label: "Rare" },
    { key: "Epic", label: "Epic" },
    { key: "Legendary", label: "Legendary" },
    { key: "Mythic", label: "Mythic" },
  ];

  const sortOptions = [
    { key: "newest", label: "Newest Minted" },
    { key: "token-asc", label: "TokenId: Low → High" },
    { key: "power-desc", label: "Power: High → Low" },
  ];

  const tierBadgeColors = [
    "text-secondary border-secondary",
    "text-blue-400 border-blue-500/30",
    "text-purple-400 border-purple-500/30",
    "text-accent-gold border-accent-gold/30",
    "text-accent-gold border-accent-gold/30",
  ];

  const loadMore = useCallback(() => {
    setOffset((prev) => prev + 20);
  }, []);

  // If no cards and data ready, show tier preview
  if (cards.length === 0 && dataReady) {
    return (
      <section className="py-12 md:py-16 animate-content-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-primary">Collection</h3>
            <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">
              Tier previews — no pieces minted yet. Be the first to mint.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {TIER_DATA.map((t) => {
            const badgeColor = tierBadgeColors[t.tier];
            return (
              <div
                key={t.tier}
                className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center text-center transition-colors duration-150 hover:border-accent-gold/40"
              >
                <Image
                  src={getTierImage(t.tier)}
                  alt={`${t.name} tier preview`}
                  width={120}
                  height={120}
                  className="w-24 h-24 rounded-xl border border-accent-gold/20 object-cover mb-4"
                  decoding="async"
                />
                <h4 className="text-sm font-semibold text-primary mb-1">{t.character}</h4>
                <p className="text-[10px] text-secondary">{t.name}</p>
                <div className="flex items-center justify-center gap-1 text-[10px] text-secondary mt-2">
                  <span>Power {t.power}</span>
                  <span>·</span>
                  <span>{t.supply.toLocaleString()} / 5,000</span>
                </div>
                <Link
                  href="/mint"
                  className="mt-4 w-full py-2.5 text-center font-bold text-black bg-accent-gold rounded-lg focus:ring-2 focus:ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors duration-150"
                >
                  Mint
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // Loading skeleton
  if (!dataReady && cards.length === 0) {
    return (
      <section className="py-12 md:py-16 animate-content-fade-in">
        <h3 className="text-xl font-bold text-primary mb-6">Collection</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface/30 border border-border rounded-2xl p-5 animate-skeleton" />
          ))}
        </div>
      </section>
    );
  }

  // Empty state for filtered results
  if (filtered.length === 0 && dataReady) {
    return (
      <section className="py-12 md:py-16 animate-content-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-primary">Collection</h3>
          </div>
        </div>
        <div className="bg-surface/30 border border-border rounded-2xl p-8 text-center">
          <p className="text-secondary text-sm">No {activeFilter} pieces minted yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 animate-content-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-primary">Collection</h3>
          <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">
            {filtered.length} piece{filtered.length !== 1 ? "s" : ""} in collection
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex overflow-x-auto gap-2 scrollbar-hide">
            {tierFilterChips.map((c) => {
              const isActive = activeFilter === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveFilter(c.key)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 border ${isActive ? "bg-accent-gold text-black border-accent-gold" : "bg-transparent text-secondary border-secondary hover:border-accent-gold/50"}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="hidden sm:block">
            <select
              onChange={(e) => setActiveSort(e.target.value as string)}
              value={activeSort}
              className="bg-surface/30 border border-border rounded-lg px-3 py-1.5 text-xs text-primary focus:ring-2 focus:ring-accent-gold focus:border-transparent outline-none"
            >
              {sortOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((c) => {
          const tierName = TIER_NAMES[c.tier];
          const badgeColor = tierBadgeColors[c.tier];
          return (
            <div
              key={c.tokenId}
              className="bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:border-accent-gold/40 hover:-translate-y-1 group cursor-pointer"
            >
              <Image
                src={c.image}
                alt={tierName}
                width={400}
                height={400}
                className="w-full h-64 object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="p-4">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-primary truncate">
                    Aegis Crown #{c.tokenId}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-tighter ${badgeColor}`}>
                    {tierName}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3 text-[10px] text-secondary font-mono truncate max-w-[140px]">
                  <span>{formatAddress(c.owner)}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-lg font-bold text-accent-gold tabular-nums">
                    {c.priceBnb ?? "—"}
                  </span>
                  {c.listed ? (
                    <span className="text-[10px] text-secondary uppercase tracking-tighter ml-1">
                      Listed
                    </span>
                  ) : (
                    <span className="text-[10px] text-secondary uppercase tracking-tighter ml-1">
                      Not listed
                    </span>
                  )}
                </div>
                <Link
                  href={`/market?search=${c.tokenId}`}
                  className="w-full py-2.5 text-center font-bold text-black bg-accent-gold rounded-lg focus:ring-2 focus:ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors duration-150"
                >
                  View in Market
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            className="px-6 py-2.5 text-sm font-medium text-secondary border border-accent-gold/30 rounded-lg hover:bg-accent-gold/10 hover:text-accent-gold transition-colors duration-150"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}
