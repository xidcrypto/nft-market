"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { contractService, marketContractService } from "../lib/contracts";
import { CONFIG } from "../lib/config";
import { getTierInfo, formatPriceBnb, formatAddress, getTierImage } from "../lib/tier-utils";
import Image from "next/image";

export default function MininlistPage() {
  const [wallet, setWallet] = useState<{
    address: string | null;
    chainId: number | null;
    isConnected: boolean;
    provider: ethers.BrowserProvider | null;
    signer: ethers.Signer | null;
  }>({
    address: null,
    chainId: null,
    isConnected: false,
    provider: null,
    signer: null,
  });

  const [listings, setListings] = useState<Array<{
    tokenId: number;
    seller: string;
    price: string;
    priceBnb: string;
    tier: number;
    active: boolean;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [actionPhase, setActionPhase] = useState<"none" | "buy" | "cancel" | "confirming-buy" | "confirming-cancel">("none");
  const [listingPreview, setListingPreview] = useState<{ tokenId: number; price: string } | null>(null);
  const [indexerData, setIndexerData] = useState<any>(null);
  const [searchTokenId, setSearchTokenId] = useState<string>("");
  const [selectedTier, setTierFilter] = useState<string>("all");

  const loadIndexerData = useCallback(async () => {
    try {
      const res = await fetch("/market-data.json");
      if (res.ok) setIndexerData(await res.json());
    } catch (e) {
      console.warn("Indexer data unavailable, using live reads");
    }
  }, []);

  useEffect(() => {
    loadIndexerData();
  }, [loadIndexerData]);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined") return;
    const { ethereum } = window as any;
    if (!ethereum) {
      alert("Please open in the Binance App's dApp browser or install Binance Wallet extension.");
      return;
    }

    try {
      const prov = new ethers.BrowserProvider(ethereum);
      await prov.send("wallet_switchEthereumChain", [
        { chainId: `0x${CONFIG.chainId.toString(16)}` },
      ]);
      const accounts = await prov.send("eth_requestAccounts", []);
      const signer = await prov.getSigner();

      setWallet({
        address: accounts[0],
        chainId: CONFIG.chainId,
        isConnected: true,
        provider: prov,
        signer,
      });

      await contractService.init(prov);
      contractService.setMode("live");
      await marketContractService.init(signer);
      marketContractService.setMode("live");
      fetchListings();
    } catch (e) {
      console.error("Connect error:", e);
    }
  }, []);

  const fetchListings = useCallback(async () => {
    if (!wallet.provider) return;
    setLoading(true);
    try {
      await contractService.init(wallet.provider);
      contractService.setMode("live");
      await marketContractService.init(wallet.signer!);
      marketContractService.setMode("live");
      const result = await marketContractService.getListings();
      setListings(result.map((l: any) => ({
        tokenId: l.tokenId,
        seller: l.seller,
        price: l.price ?? l.priceBnb,
        priceBnb: l.priceBnb ?? formatPriceBnb(l.price),
        tier: l.tier ?? 1,
        active: l.active ?? true,
      })));
    } catch (e) {
      console.error(e);
      setError("Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [wallet.provider, wallet.signer]);

  useEffect(() => {
    if (!wallet.isConnected) {
      setListings([]);
      setLoading(false);
    } else {
      fetchListings();
    }
  }, [wallet.isConnected, fetchListings]);

  const handleBuy = (tokenId: number) => {
    if (!wallet.isConnected) {
      alert("Wallet not connected!");
      return;
    }
    const listing = listings.find(l => l.tokenId === tokenId);
    if (!listing) return;
    setActionPhase("buy");
    setListingPreview({ tokenId, price: listing.priceBnb });
  };

  const handleConfirmBuy = async () => {
    if (!listingPreview) return;
    setActionPhase("buy" as "buy" | "cancel" | "none");
    try {
      const listing = listings.find(l => l.tokenId === listingPreview.tokenId);
      if (!listing) return;
      await marketContractService.buy(listingPreview.tokenId, listing.price);
      await new Promise(r => setTimeout(r, 300));
      await fetchListings();
      setActionPhase("none");
      setListingPreview(null);
      alert(`Bought token #${listingPreview.tokenId}!`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Buy failed");
      setActionPhase("none");
    }
  };

  const handleCancel = async () => {
    if (!selectedTokenId) return;
    setActionPhase("confirming-cancel" as "none" | "buy" | "cancel" | "confirming-buy" | "confirming-cancel");
    try {
      await marketContractService.cancel(selectedTokenId);
      await new Promise(r => setTimeout(r, 300));
      await fetchListings();
      setActionPhase("none");
      setSelectedTokenId(null);
      alert(`Cancelled listing for token #${selectedTokenId}!`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
      setActionPhase("none");
    }
  };

  const stats = indexerData?.stats;

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-200 antialiased">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-yellow-500">Aegis Crown — Mininlist</h1>
            <p className="text-gray-400 mt-1">Minimal listing interface for quick trading</p>
          </div>
        </header>

        <p className="text-xs text-gray-500 text-center sm:text-left">
          Collectible only. No promised returns, no yield, no guaranteed value.
        </p>

        {stats && (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" aria-labelledby="minilist-stats">
            <h3 id="minilist-stats" className="sr-only">Collection Stats</h3>
            <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-700 text-center">
              <p className="font-bold text-yellow-400 text-lg">{stats.floorPriceBnb} BNB</p>
              <p className="text-xs text-gray-400">Floor</p>
            </div>
            <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-700 text-center">
              <p className="font-bold text-yellow-400 text-lg">{stats.totalVolumeBnb} BNB</p>
              <p className="text-xs text-gray-400">Volume</p>
            </div>
            <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-700 text-center">
              <p className="font-bold text-yellow-400 text-lg">{stats.listedCount}</p>
              <p className="text-xs text-gray-400">Listed</p>
            </div>
            <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-700 text-center">
              <p className="font-bold text-yellow-400 text-lg">{stats.ownersCount}</p>
              <p className="text-xs text-gray-400">Owners</p>
            </div>
          </section>
        )}

        {!wallet.isConnected ? (
          <section className="text-center py-16 border border-neutral-800 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950" aria-labelledby="connect-title">
            <h2 id="connect-title" className="text-2xl font-bold text-yellow-500 mb-4">Connect to Trade</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Connect your Binance Agentic Wallet to view and trade listings.
            </p>
            <button
              onClick={connectWallet}
              className="px-6 py-3 text-white font-medium bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
            >
              Connect Wallet
            </button>
          </section>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label htmlFor="search" className="sr-only">Search tokenId</label>
                <input
                  id="search"
                  type="text"
                  value={searchTokenId}
                  onChange={(e) => setSearchTokenId(e.target.value)}
                  placeholder="Search tokenId..."
                  className="w-full bg-neutral-800/50 border border-neutral-700 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedTier}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="bg-neutral-800/50 border border-neutral-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Tiers</option>
                  <option value="4">Mythic</option>
                  <option value="3">Legendary</option>
                  <option value="2">Epic</option>
                  <option value="1">Rare</option>
                  <option value="0">Common</option>
                </select>
                <button
                  onClick={fetchListings}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
                >
                  Refresh
                </button>
              </div>
            </div>

            <section aria-labelledby="listings-title">
              <h3 id="listings-title" className="sr-only">Active Listings</h3>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" role="status" aria-live="polite">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden animate-pulse">
                      <div className="h-40 bg-neutral-700" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-neutral-600 rounded w-3/4" />
                        <div className="h-3 bg-neutral-600 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-12 bg-neutral-800/50 rounded-xl">
                  <p className="text-gray-400">No listings found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" role="list" aria-label="Active NFT listings">
                  {listings
                    .filter(l => l.active)
                    .filter(l => selectedTier === "all" || l.tier === parseInt(selectedTier))
                    .filter(l => !searchTokenId || l.tokenId === parseInt(searchTokenId))
                    .map(l => {
                      const tier = l.tier;
                      const tierName = getTierInfo(tier)?.name?.split(" —")[0] ?? `Tier ${tier}`;
                      return (
                        <article 
                          key={l.tokenId} 
                          className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden hover:border-yellow-500 transition-colors group"
                          role="listitem"
                        >
                          <div className="relative h-40 bg-neutral-700">
                            <Image
                              src={getTierImage(tier)}
                              alt={tierName}
                              width={320}
                              height={240}
                              className="object-cover w-full h-full"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            />
                            <div className="absolute top-2 left-2">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                tier === 4 ? "bg-red-500/20 text-red-400" :
                                tier === 3 ? "bg-yellow-500/20 text-yellow-400" :
                                tier === 2 ? "bg-blue-500/20 text-blue-400" :
                                tier === 1 ? "bg-green-500/20 text-green-400" :
                                "bg-gray-500/20 text-gray-400"
                              }`}>
                                {getTierInfo(tier)?.name?.split(" —")[0] ?? `Tier ${tier}`}
                              </span>
                            </div>
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">#{l.tokenId}</span>
                              <span className="text-lg font-bold text-yellow-400">{l.priceBnb} BNB</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">Seller: {formatAddress(l.seller)}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => { setSelectedTokenId(l.tokenId); setActionPhase("buy"); setListingPreview({ tokenId: l.tokenId, price: l.priceBnb }); }}
                                  className="flex-1 py-1.5 text-xs text-white bg-green-600 rounded hover:bg-green-500 transition-colors"
                                >
                                  Buy
                                </button>
                                {wallet.address?.toLowerCase() === l.seller.toLowerCase() && (
                                  <button
                                    onClick={() => { setSelectedTokenId(l.tokenId); setActionPhase("cancel"); }}
                                    className="flex-1 py-1.5 text-xs text-white bg-red-600 rounded hover:bg-red-500 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                </div>
              )}
            </section>

            {actionPhase !== "none" && (
              <section className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                <div className="bg-neutral-900 rounded-2xl border border-neutral-700 p-6 max-w-md w-full">
                  <h3 id="confirm-title" className="text-lg font-semibold text-yellow-400 mb-4">
                    {actionPhase === "buy" ? `Buy Token #${listingPreview?.tokenId}` : `Cancel Listing #${selectedTokenId}`}
                  </h3>
                  <div className="space-y-3 text-sm">
                    {actionPhase === "buy" && listingPreview && (
                      <>
                        <div><span className="text-gray-400">Price:</span> <code className="text-white ml-2">{listingPreview.price} BNB</code></div>
                        <div><span className="text-gray-400">Fee (3%):</span> <code className="text-white ml-2">{(parseFloat(listingPreview.price) * 0.03).toFixed(4)} BNB</code></div>
                        <div><span className="text-gray-400">Total:</span> <code className="text-white ml-2">{(parseFloat(listingPreview.price) * 1.03).toFixed(4)} BNB</code></div>
                      </>
                    )}
                    {actionPhase === "cancel" && (
                      <p className="text-gray-300">Cancel listing #{selectedTokenId}?</p>
                    )}
                    <p className="text-xs text-gray-400">Transaction will be signed in the Binance App.</p>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => { setActionPhase("none"); setSelectedTokenId(null); setListingPreview(null); }}
                      className="flex-1 py-2 text-white bg-neutral-700 rounded-xl hover:bg-neutral-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={actionPhase === "buy" ? handleConfirmBuy : handleCancel}
                      className="flex-1 py-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors focus:ring-2 focus:ring-indigo-500"
                    >
                      {actionPhase === "buy" ? "Confirm Buy" : "Confirm Cancel"}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}