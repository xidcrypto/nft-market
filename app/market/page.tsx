"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ethers } from "ethers";
import Image from "next/image";
import Link from "next/link";
import { CONFIG } from "../lib/config";
import { getTierImage, formatPriceBnb, formatAddress } from "../lib/tier-utils";
import { Footer } from "../components/footer-component";
import { PageLoadingWrapper } from "../components/page-loading-wrapper";
import {
  useMarketStats,
  useMarketListings,
  useRecentSales,
  formatLastUpdated,
} from "../lib/realtime";

type Listing = {
  tokenId: number;
  seller: string;
  priceWei: string;
  priceBnb: string;
  listedAt: string;
};

type SortOption = "price-asc" | "price-desc" | "listed-desc" | "token-asc";

const TIER_CONFIG = [
  { key: "all", label: "All" },
  { key: "common", label: "Common" },
  { key: "rare", label: "Rare" },
  { key: "epic", label: "Epic" },
  { key: "legendary", label: "Legendary" },
  { key: "mythic", label: "Mythic" },
];

const TIER_NAMES = ["Common", "Rare", "Epic", "Legendary", "Mythic"];
const TIER_BADGE_COLORS = [
  "text-secondary border-secondary",   // Common
  "text-blue-400 border-blue-500/30", // Rare
  "text-purple-400 border-purple-500/30", // Epic
  "text-accent-gold border-accent-gold/30", // Legendary
  "text-accent-gold border-accent-gold/30", // Mythic
];

function parseTierFromToken(tokenId: number): number {
  const rand = tokenId % 5000;
  if (rand < 3000) return 0;
  if (rand < 4250) return 1;
  if (rand < 4850) return 2;
  if (rand < 4950) return 3;
  return 4;
}

function tierPower(tier: number): number {
  return [10, 25, 50, 100, 150][tier] ?? 10;
}

export default function MarketPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const stats = useMarketStats({ interval: 15000 });
  const listings = useMarketListings({ interval: 15000 });
  const sales = useRecentSales({ interval: 30000 });

  const marketData = stats.data;
  const liveListings: Listing[] = listings.data ?? [];
  const lastUpdated = stats.lastUpdated;

  const [sortBy, setSortBy] = useState<SortOption>("price-asc");
  const [searchTokenId, setSearchTokenId] = useState<string>("");
  const [activeTier, setActiveTier] = useState<string>("all");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchDebounce, setSearchDebounce] = useState<string>("");
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined") return;
    const { ethereum } = window as any;
    if (!ethereum) {
      alert("Please install MetaMask or Binance Wallet extension to buy NFTs.");
      return;
    }
    try {
      const prov = new ethers.BrowserProvider(ethereum);
      await prov.send("wallet_switchEthereumChain", [
        { chainId: `0x${CONFIG.chainId.toString(16)}` },
      ]);
      const accounts = await prov.send("eth_requestAccounts", []);
      const s = await prov.getSigner();
      setWalletAddress(accounts[0]);
      setSigner(s);
      setIsConnected(true);
    } catch (e) {
      console.error("Connect error:", e);
    }
  }, []);

  useEffect(() => {
    const { ethereum } = window as any;
    if (ethereum) {
      ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) connectWallet();
      });
    }
  }, [connectWallet]);

  // Debounce search 300ms
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setSearchDebounce(searchTokenId);
    }, 300);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [searchTokenId]);

  const filteredListings = useMemo(() => {
    let items = [...liveListings];

    // Filter by tier
    if (activeTier !== "all") {
      const tierIndex = TIER_CONFIG.findIndex((t) => t.key === activeTier);
      if (tierIndex >= 0) {
        items = items.filter((l) => parseTierFromToken(l.tokenId) === tierIndex);
      }
    }

    // Filter by search tokenId
    const searchNum = parseInt(searchDebounce, 10);
    if (!isNaN(searchNum)) {
      items = items.filter((l) => l.tokenId === searchNum);
    }

    items.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return parseFloat(a.priceBnb) - parseFloat(b.priceBnb);
        case "price-desc":
          return parseFloat(b.priceBnb) - parseFloat(a.priceBnb);
        case "listed-desc":
          return 0; // already ordered by listedAt desc in API
        case "token-asc":
          return a.tokenId - b.tokenId;
        default:
          return 0;
      }
    });

    return items;
  }, [liveListings, sortBy, activeTier, searchDebounce]);

  const s = marketData;
  const canBuy = isConnected;
  const recentActivity = sales.data ?? [];
  const dataReady = !stats.loading && !listings.loading;

  const mintedProgress = s?.totalMinted ? (s.totalMinted / 5000) * 100 : 0;

  const handleBuy = useCallback((tokenId: number) => {
    const listing = filteredListings.find((l) => l.tokenId === tokenId);
    if (!listing) return;
    setBuyPreview({ tokenId, price: listing.priceBnb, priceWei: listing.priceWei });
  }, [filteredListings]);

  const [buyPreview, setBuyPreview] = useState<{
    tokenId: number;
    price: string;
    priceWei: string;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleConfirmBuy = async () => {
    if (!buyPreview || !signer) return;
    setConfirming(true);
    try {
      const listing = filteredListings.find((l) => l.tokenId === buyPreview.tokenId);
      if (!listing) return;
      const priceWei = ethers.parseUnits(listing.priceWei, 18);
      const marketContract = new ethers.Contract(
        CONFIG.marketV2,
        ["function buy(uint256 tokenId) external payable"],
        signer
      );
      const tx = await marketContract.buy(buyPreview.tokenId, { value: priceWei });
      await tx.wait();
      setBuyPreview(null);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Buy failed");
      setConfirming(false);
    }
  };

  const toggleSortDropdown = () => setSortDropdownOpen(!sortDropdownOpen);
  const closeSortDropdown = () => setSortDropdownOpen(false);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownOpen && !(e.target as HTMLElement).closest('[data-sort-dropdown]')) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortDropdownOpen]);

  const searchHasResult = searchDebounce && filteredListings.length === 0 && dataReady;

  return (
    <main className="min-h-screen bg-background text-primary antialiased">
      <PageLoadingWrapper dataReady={dataReady}>
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* ===== Market Header ===== */}
          <section className="py-6 md:py-10 animate-content-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-primary tracking-tight">Market</h2>
                <p className="text-secondary mt-2 text-sm leading-relaxed max-w-[600px]">
                  Buy and sell Aegis Crown pieces on BNB Chain. Buyer pays exactly the listed price — 3% fee, 97% to seller.
                </p>
              </div>
            </div>
          </section>

          {/* ===== Stats Strip — Premium Cards ===== */}
          <section className="py-6 md:py-10 animate-content-fade-in-delay-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Floor */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-secondary uppercase tracking-widest font-medium">Floor</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-accent-gold tabular-nums">
                    {s?.floorPriceBnb ? s.floorPriceBnb : "—"}
                  </span>
                  {s?.floorPriceBnb && <span className="text-xs text-secondary">BNB</span>}
                </div>
              </div>
              {/* Listed */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-secondary uppercase tracking-widest font-medium">Listed</span>
                </div>
                <div className="text-2xl font-bold text-primary tabular-nums">
                  {s?.listedCount ?? "—"}
                </div>
              </div>
              {/* Minted */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-secondary uppercase tracking-widest font-medium">Minted</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold text-primary tabular-nums">
                      {s ? s.totalMinted : "—"}
                    </span>
                    <span className="text-xs text-secondary">/ 5,000</span>
                  </div>
                  <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-gold"
                      style={{ width: `${Math.min(mintedProgress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              {/* Owners */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-secondary uppercase tracking-widest font-medium">Owners</span>
                </div>
                <div className="text-2xl font-bold text-primary tabular-nums">
                  {s?.ownersCount ?? "—"}
                </div>
              </div>
              {/* Total Volume */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-secondary uppercase tracking-widest font-medium">Total Volume</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {s?.totalVolumeBnb ? s.totalVolumeBnb : "—"}
                  </span>
                  {s?.totalVolumeBnb && <span className="text-xs text-secondary">BNB</span>}
                </div>
              </div>
              {/* 24h Volume */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-secondary uppercase tracking-widest font-medium">24h Volume</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {s?.volume24hBnb ? s.volume24hBnb : "—"}
                  </span>
                  {s?.volume24hBnb && <span className="text-xs text-secondary">BNB</span>}
                </div>
              </div>
              {/* Last Sale */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-secondary uppercase tracking-widest font-medium">Last Sale</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {recentActivity[0]?.priceBnb ? recentActivity[0].priceBnb : "—"}
                  </span>
                  {recentActivity[0]?.priceBnb && <span className="text-xs text-secondary">BNB</span>}
                </div>
              </div>
            </div>
          </section>

          {/* ===== Filter Bar ===== */}
          <section className="py-6 md:py-8 animate-content-fade-in-delay-2">
            {/* Search row (mobile full width) */}
            <div className="flex flex-col gap-3">
              <div className="relative w-full">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTokenId}
                  onChange={(e) => setSearchTokenId(e.target.value)}
                  placeholder="Search tokenId…"
                  className="w-full bg-surface/30 border border-border rounded-2xl px-4 py-3 pl-10 text-sm text-primary placeholder-secondary focus:ring-2 focus:ring-accent-gold focus:border-transparent outline-none transition-colors duration-150"
                  onBlur={() => setSearchDebounce(searchTokenId)}
                />
              </div>
              {searchHasResult && (
                <div className="bg-surface/30 border border-border rounded-xl p-3 text-center">
                  <p className="text-sm text-secondary">No result for tokenId {searchDebounce}</p>
                </div>
              )}
            </div>

            {/* Sort + Tier chips row */}
            <div className="flex sm:flex-row flex-col sm:items-center sm:justify-between gap-4">
              {/* Sort */}
              <div className="relative w-full sm:w-64" data-sort-dropdown>
                <button
                  onClick={toggleSortDropdown}
                  className="w-full bg-surface/30 border border-border rounded-2xl px-4 py-3 flex items-center justify-between text-sm text-primary focus:ring-2 focus:ring-accent-gold focus:border-transparent outline-none transition-colors duration-150"
                >
                  <span>{sortBy === "price-asc" ? "Price: Low → High" : sortBy === "price-desc" ? "Price: High → Low" : sortBy === "listed-desc" ? "Recently Listed" : "TokenId: Low → High"}</span>
                  <svg className={`w-4 h-4 text-secondary transition-transform duration-200 ${sortDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {sortDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-lg py-2 z-20">
                    {[
                      { value: "price-asc", label: "Price: Low → High" },
                      { value: "price-desc", label: "Price: High → Low" },
                      { value: "listed-desc", label: "Recently Listed" },
                      { value: "token-asc", label: "TokenId: Low → High" },
                    ].map((o) => (
                      <button
                        key={o.value}
                        onClick={() => { setSortBy(o.value as SortOption); setSortDropdownOpen(false); }}
                        className="w-full px-4 py-2.5 text-sm text-secondary hover:text-accent-gold hover:bg-accent-gold/10 transition-colors duration-150"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tier chips */}
              <div className="flex flex-wrap gap-2">
                {TIER_CONFIG.map((t) => {
                  const isActive = activeTier === t.key;
                  const tierIndex = TIER_CONFIG.findIndex((tc) => tc.key === t.key);
                  const badgeClass = tierIndex >= 0 ? TIER_BADGE_COLORS[tierIndex] : "text-secondary border-secondary";
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTier(t.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-150 border ${isActive ? "bg-accent-gold text-black border-accent-gold" : "bg-transparent text-secondary border-secondary hover:border-accent-gold/50"}`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ===== Listings Grid ===== */}
          <section className="py-6 md:py-8 animate-content-fade-in-delay-3">
            {(!dataReady || filteredListings.length === 0) && !searchHasResult ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-3">
                  {liveListings.length === 0 && dataReady ? (
                    <div className="h-24 w-24 bg-surface/30 border border-border rounded-full animate-skeleton mx-auto" />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-surface/30 border border-border rounded-2xl p-6 animate-skeleton" />
                      ))}
                    </div>
                  )}
                </div>
                {liveListings.length === 0 && dataReady && (
                  <div className="border border-border rounded-2xl p-8 md:p-12 text-center">
                    <div className="mx-auto mb-6">
                      <Image
                        src={getTierImage(3)}
                        alt="Legendary Crown"
                        width={140}
                        height={140}
                        className="rounded-full border border-accent-gold/20 object-cover"
                        decoding="async"
                      />
                    </div>
                    <h3 className="text-2xl font-bold text-primary mb-3">No listings yet</h3>
                    <p className="text-secondary leading-relaxed mb-6 max-w-[400px] mx-auto text-sm">
                      Be the first to list an Aegis Crown piece. Minting is free — gas only — for eligible Agent IDs.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link
                        href="/mint"
                        className="flex-1 py-4 text-center font-bold text-black bg-accent-gold rounded-xl focus:ring-2 focus:ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors duration-150"
                      >
                        Go to Mint
                      </Link>
                      <Link
                        href="/AGENTS.md"
                        className="flex-1 py-4 text-center font-medium text-secondary border border-accent-gold/30 rounded-xl hover:border-accent-gold/60 hover:text-accent-gold transition-colors duration-150"
                      >
                        How to List
                      </Link>
                    </div>
                    <p className="text-xs text-secondary mt-6">
                      Listed pieces will appear here with tier, power, price, and seller.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredListings.map((l) => {
                  const tier = parseTierFromToken(l.tokenId);
                  const tierName = TIER_NAMES[tier];
                  const power = tierPower(tier);
                  const badgeColor = TIER_BADGE_COLORS[tier];
                  const sellerShort = formatAddress(l.seller);
                  return (
                    <div
                      key={l.tokenId}
                      className="bg-surface border border-border rounded-2xl p-0 overflow-hidden transition-all duration-200 hover:border-accent-gold/40 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(201,162,39,0.15)] group cursor-pointer"
                    >
                      <div className="relative h-64 overflow-hidden bg-neutral-800/50">
                        <Image
                          src={getTierImage(tier)}
                          alt={tierName}
                          width={400}
                          height={400}
                          className="w-full h-full object-cover lazy-load opacity-0 transition-opacity duration-500"
                          decoding="async"
                          loading="lazy"
                        />
                        {/* Tier badge */}
                        <div className="absolute top-3 left-3 z-10">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter ${badgeColor}`}>
                            {tierName}
                          </span>
                        </div>
                        {/* Power badge */}
                        <div className="absolute top-3 right-3 z-10">
                          <span className="px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-[10px] font-bold text-secondary">
                            Power {power}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold text-primary truncate">Aegis Crown #{l.tokenId}</span>
                          <span className="text-[10px] text-secondary uppercase tracking-tighter">{tierName}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-4 text-xs text-secondary">
                          <span className="font-mono truncate">{sellerShort}</span>
                          <button
                            className="p-1 text-secondary hover:text-primary rounded transition-colors"
                            title="Copy seller address"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-xl font-bold text-accent-gold tabular-nums">{l.priceBnb}</span>
                          <span className="text-[10px] text-secondary uppercase tracking-tighter">BNB</span>
                          <span className="text-[10px] text-secondary uppercase tracking-tighter ml-1">List price</span>
                        </div>
                        <button
                          onClick={() => handleBuy(l.tokenId)}
                          disabled={!canBuy || confirming}
                          className="w-full py-3 text-center font-bold text-black bg-accent-gold rounded-xl hover:bg-yellow-500 focus:ring-2 focus:ring-accent-gold focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                          {!canBuy ? "Connect EVM Wallet" : confirming ? "Signing…" : "Buy"}
                        </button>
                        {!canBuy && (
                          <p className="text-[10px] text-secondary mt-2 text-center">
                            MetaMask / Binance Wallet extension. Connecting does not grant mint access.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ===== Recent Activity — Premium ===== */}
          <section className="py-10 md:py-12 border-t border-border animate-content-fade-in-delay-3">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-primary">Recent Activity</h3>
            </div>
            {recentActivity.length === 0 ? (
              <div className="bg-surface/30 border border-border rounded-2xl p-6 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-secondary text-sm">No activity yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((a, idx) => {
                  const tier = parseTierFromToken(a.tokenId);
                  const tierName = TIER_NAMES[tier];
                  const isBought = a.type === "bought";
                  return (
                    <div key={`${a.type}-${a.tokenId}-${idx}`} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                      <div className="flex items-center gap-4">
                        <div className="relative w-10 h-10 rounded-xl border border-border overflow-hidden shrink-0">
                          <Image
                            src={getTierImage(tier)}
                            alt={tierName}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                            decoding="async"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            <span className={isBought ? "text-accent-gold" : "text-secondary"}>
                              {isBought ? "Sold" : a.type === "listed" ? "Listed" : "Cancelled"}
                            </span>{" "}
                            Aegis Crown #{a.tokenId}
                          </div>
                          <div className="text-[10px] text-secondary font-mono truncate max-w-[160px]">
                            {a.buyer ? `${formatAddress(a.buyer)} ← ${formatAddress(a.seller)}` : formatAddress(a.seller)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {a.priceBnb && <div className="text-sm font-bold text-accent-gold tabular-nums">{a.priceBnb} BNB</div>}
                        <div className="text-[10px] text-secondary">{a.timeAgo}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {!canBuy && !error && (
            <div className="pt-6 border-t border-border text-[10px] text-secondary">
              MetaMask / Binance Wallet extension. This is not Binance Agentic Wallet, and connecting does not grant mint access.
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 text-xs text-secondary bg-surface/30 rounded-lg border border-border">
              {error}
            </div>
          )}

          {lastUpdated && (
            <p className="mt-8 text-[10px] text-secondary text-center">
              Live · Updated {formatLastUpdated(lastUpdated)}
            </p>
          )}

          <Footer />
        </div>
      </PageLoadingWrapper>
      {buyPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-primary mb-4">Confirm Purchase</h3>
            <p className="text-sm text-secondary mb-2">
              Aegis Crown #{buyPreview.tokenId}
            </p>
            <p className="text-lg text-accent-gold font-medium mb-6">
              {buyPreview.price} BNB
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBuyPreview(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBuy}
                disabled={confirming}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-black bg-accent-gold hover:bg-yellow-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {confirming ? "Confirming…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
