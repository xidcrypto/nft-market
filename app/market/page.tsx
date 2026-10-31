"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

type SortOption = "price-asc" | "price-desc";

function parseTierFromToken(tokenId: number): number {
  const rand = tokenId % 5000;
  if (rand < 3000) return 0;
  if (rand < 4250) return 1;
  if (rand < 4850) return 2;
  if (rand < 4950) return 3;
  return 4;
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
  const [error, setError] = useState<string | null>(null);

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

  const sortedListings = useMemo(() => {
    let items = [...liveListings];

    if (searchTokenId) {
      const tid = parseInt(searchTokenId, 10);
      if (!isNaN(tid)) {
        items = items.filter((l) => l.tokenId === tid);
      }
    }

    items.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return parseFloat(a.priceBnb) - parseFloat(b.priceBnb);
        case "price-desc":
          return parseFloat(b.priceBnb) - parseFloat(a.priceBnb);
        default:
          return 0;
      }
    });

    return items;
  }, [liveListings, sortBy, searchTokenId]);

  const handleBuy = useCallback((tokenId: number) => {
    const listing = sortedListings.find((l) => l.tokenId === tokenId);
    if (!listing) return;
    setBuyPreview({ tokenId, price: listing.priceBnb, priceWei: listing.priceWei });
  }, [sortedListings]);

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
      const listing = sortedListings.find((l) => l.tokenId === buyPreview.tokenId);
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

  const s = marketData;
  const canBuy = isConnected;
  const recentActivity = sales.data ?? [];
  const dataReady = !stats.loading && !listings.loading;

  return (
    <main className="min-h-screen bg-background text-primary antialiased">
      <PageLoadingWrapper dataReady={dataReady}>
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Stats strip */}
          <section className="border-t border-border border-b border-border py-8 md:py-12 animate-content-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4 md:gap-2 text-center text-xs text-secondary">
              <div className="border-r border-border last:border-r-0 py-2 md:py-1">
                <div className="text-secondary text-[10px]">Floor</div>
                <div className="text-accent-gold font-medium tabular-nums">
                  {s?.floorPriceBnb ? `${s.floorPriceBnb} BNB` : "—"}
                </div>
              </div>
              <div className="border-r border-border last:border-r-0 py-2 md:py-1">
                <div className="text-secondary text-[10px]">Listed</div>
                <div className="text-accent-gold font-medium tabular-nums">
                  {s?.listedCount ?? "—"}
                </div>
              </div>
              <div className="border-r border-border last:border-r-0 py-2 md:py-1">
                <div className="text-secondary text-[10px]">Minted</div>
                <div className="text-accent-gold font-medium tabular-nums">
                  {s ? `${s.totalMinted}/${s.maxSupply}` : "—"}
                </div>
              </div>
              <div className="border-r border-border last:border-r-0 py-2 md:py-1">
                <div className="text-secondary text-[10px]">Owners</div>
                <div className="text-accent-gold font-medium tabular-nums">
                  {s?.ownersCount ?? "—"}
                </div>
              </div>
              <div className="hidden md:block border-r border-border last:border-r-0 py-2 md:py-1">
                <div className="text-secondary text-[10px]">Total Vol</div>
                <div className="text-accent-gold font-medium tabular-nums">
                  {s?.totalVolumeBnb ? `${s.totalVolumeBnb} BNB` : "—"}
                </div>
              </div>
              <div className="hidden md:block border-r border-border last:border-r-0 py-2 md:py-1">
                <div className="text-secondary text-[10px]">24h Vol</div>
                <div className="text-accent-gold font-medium tabular-nums">
                  {s?.volume24hBnb ? `${s.volume24hBnb} BNB` : "—"}
                </div>
              </div>
              <div className="hidden md:block border-r border-border last:border-r-0 py-2 md:py-1">
                <div className="text-secondary text-[10px]">Last Sale</div>
                <div className="text-accent-gold font-medium tabular-nums">
                  {recentActivity[0]?.priceBnb ? `${recentActivity[0].priceBnb} BNB` : "—"}
                </div>
              </div>
            </div>
          </section>

          {/* Search + Sort */}
          <section className="py-6 animate-content-fade-in-delay-1">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="text"
                value={searchTokenId}
                onChange={(e) => setSearchTokenId(e.target.value)}
                placeholder="Search tokenId…"
                className="flex-1 bg-surface/30 border border-border rounded-lg px-4 py-2.5 text-sm text-primary placeholder-secondary focus:ring-2 focus:ring-accent-gold focus:border-transparent outline-none transition-colors duration-150"
              />
              <select
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                value={sortBy}
                className="bg-surface/30 border border-border rounded-lg px-4 py-2.5 text-sm text-primary focus:ring-2 focus:ring-accent-gold focus:border-transparent outline-none transition-colors duration-150"
              >
                <option value="price-asc">Price Low → High</option>
                <option value="price-desc">Price High → Low</option>
              </select>
            </div>
          </section>

          {/* Listings */}
          <section className="py-6 animate-content-fade-in-delay-2">
            {!dataReady && sortedListings.length === 0 ? (
              <div className="text-center py-16 text-secondary">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-accent-gold border-t-transparent mx-auto mb-4" />
                <p className="text-secondary">Loading listings…</p>
              </div>
            ) : sortedListings.length === 0 ? (
              <div className="border border-border rounded-2xl p-12 md:p-16 text-center">
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
                {sortedListings.map((l) => {
                  const tier = parseTierFromToken(l.tokenId);
                  const tierName = ["Common", "Rare", "Epic", "Legendary", "Mythic"][tier];
                  return (
                    <div key={l.tokenId} className="bg-surface/30 border border-border rounded-xl p-6 sm:flex sm:items-center sm:gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
                        <div className="relative w-14 h-14 sm:w-14 sm:h-14 rounded-xl border border-border overflow-hidden shrink-0">
                          <Image
                            src={getTierImage(tier)}
                            alt={tierName}
                            width={56}
                            height={56}
                            className="object-cover w-full h-full"
                            decoding="async"
                          />
                        </div>
                        <div className="flex-1 min-w-0 sm:text-left text-center sm:text-left">
                          <div className="flex items-baseline justify-between sm:justify-start gap-2 mb-1">
                            <span className="text-sm font-medium truncate">Aegis Crown #{l.tokenId}</span>
                            <span className="text-[10px] text-secondary">{tierName}</span>
                          </div>
                          <div className="text-xs text-secondary">
                            Seller: <span className="break-all font-mono">{formatAddress(l.seller)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 sm:mt-0 sm:w-auto flex sm:flex-col items-center sm:items-end gap-4 w-full sm:w-auto">
                        <span className="text-lg font-medium text-accent-gold tabular-nums whitespace-nowrap">{l.priceBnb} BNB</span>
                        {!canBuy ? (
                          <button
                            onClick={connectWallet}
                            className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-black bg-accent-gold rounded-lg focus:ring-2 focus:ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors duration-150"
                          >
                            Connect EVM Wallet — for buying only
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuy(l.tokenId)}
                            disabled={confirming}
                            className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-primary bg-neutral-700 hover:bg-neutral-600 rounded-lg focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-background transition-colors duration-150 disabled:opacity-50"
                          >
                            {confirming && buyPreview?.tokenId === l.tokenId ? "Signing…" : "Buy"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent Activity */}
          <section className="pt-12 border-t border-border pb-12 animate-content-fade-in-delay-3">
            <h2 className="text-lg font-semibold text-primary mb-6">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <p className="text-secondary text-sm">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((a: any, idx: number) => {
                  const tier = parseTierFromToken(a.tokenId);
                  const tierName = ["Common", "Rare", "Epic", "Legendary", "Mythic"][tier];
                  return (
                    <div key={`${a.type}-${a.tokenId}-${idx}`} className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
                      <div className="flex items-center gap-4">
                        <img src={getTierImage(tier)} alt={tierName} className="w-10 h-10 rounded-lg border border-border object-cover" />
                        <div>
                          <div className="text-sm font-medium">
                            <span className={a.type === "bought" ? "text-accent-gold" : "text-secondary"}>
                              {a.type === "bought" ? "Sold" : a.type === "listed" ? "Listed" : "Cancelled"}
                            </span>{" "}
                            Aegis Crown #{a.tokenId}
                          </div>
                          <div className="text-xs text-secondary">
                            {a.buyer ? `${formatAddress(a.buyer)} ← ${formatAddress(a.seller)}` : formatAddress(a.seller)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {a.priceBnb && <div className="text-accent-gold font-medium tabular-nums">{a.priceBnb} BNB</div>}
                        <div className="text-[10px] text-secondary">{a.timeAgo}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {!canBuy && !error && (
            <div className="pt-8 border-t border-border text-[10px] text-secondary">
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
