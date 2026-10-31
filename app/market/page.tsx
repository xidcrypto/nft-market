"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import Image from "next/image";
import { contractService, marketContractService } from "../lib/contracts";
import { CONFIG } from "../lib/config";
import { getTierInfo, formatPriceBnb, formatAddress, getTierImage } from "../lib/tier-utils";

type Listing = {
  tokenId: number;
  seller: string;
  price: string;
  priceBnb: string;
  timestamp: number;
  active: boolean;
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

  const [marketData, setMarketData] = useState<any>(null);
  const [liveListings, setLiveListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [idxLoading, setIdxLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortOption>("price-asc");
  const [searchTokenId, setSearchTokenId] = useState<string>("");

  const loadMarketData = useCallback(async () => {
    setIdxLoading(true);
    try {
      const res = await fetch("/market-data.json");
      if (res.ok) {
        const data = await res.json();
        setMarketData(data);
      }
    } catch {
      setMarketData(null);
    } finally {
      setIdxLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

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
      await contractService.init(prov);
      await marketContractService.init(s);
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

  const fetchLiveListings = useCallback(async () => {
    if (!signer) return;
    setLoading(true);
    try {
      await marketContractService.init(signer);
      const result = await marketContractService.getListings();
      const mapped: Listing[] = result.map((l: any) => ({
        tokenId: l.tokenId,
        seller: l.seller,
        price: l.price?.toString?.() ?? l.price,
        priceBnb: l.priceBnb ?? formatPriceBnb(l.price?.toString?.() ?? l.price),
        timestamp: 0,
        active: true,
      }));
      setLiveListings(mapped);
    } catch {
      setLiveListings([]);
    } finally {
      setLoading(false);
    }
  }, [signer]);

  useEffect(() => {
    if (!isConnected) {
      setLiveListings([]);
      setLoading(false);
    } else {
      fetchLiveListings();
    }
  }, [isConnected, fetchLiveListings]);

  const indexerReady = marketData !== null;

  const sourceListings: Listing[] = useMemo(() => {
    if (indexerReady && marketData?.listings) {
      return marketData.listings.map((l: any) => ({
        tokenId: l.tokenId,
        seller: l.seller,
        price: l.price,
        priceBnb: l.priceBnb ?? formatPriceBnb(l.price),
        timestamp: l.timestamp ?? 0,
        active: true,
      }));
    }
    return liveListings;
  }, [indexerReady, marketData, liveListings]);

  const sortedListings = useMemo(() => {
    let items = [...sourceListings];

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
  }, [sourceListings, sortBy, searchTokenId]);

  const [buyPreview, setBuyPreview] = useState<{ tokenId: number; price: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleBuy = (tokenId: number) => {
    if (!isConnected) {
      const listing = sortedListings.find((l) => l.tokenId === tokenId);
      setBuyPreview(listing ? { tokenId, price: listing.priceBnb } : null);
      return;
    }
    const listing = sortedListings.find((l) => l.tokenId === tokenId);
    if (!listing) return;
    setBuyPreview({ tokenId, price: listing.priceBnb });
  };

  const handleConfirmBuy = async () => {
    if (!buyPreview || !signer) return;
    setConfirming(true);
    try {
      const listing = sortedListings.find((l) => l.tokenId === buyPreview.tokenId);
      if (!listing) return;
      const priceWei = ethers.parseUnits(listing.price, 18);
      const marketContract = new ethers.Contract(
        CONFIG.aegisMarketAddress,
        [
          "function buy(uint256 tokenId) external payable",
        ],
        signer
      );
      const tx = await marketContract.buy(buyPreview.tokenId, { value: priceWei });
      await tx.wait();
      await fetchLiveListings();
      setBuyPreview(null);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Buy failed");
      setConfirming(false);
    }
  };

  const stats = useMemo(() => {
    if (!marketData?.stats) return null;
    const s = marketData.stats;
    return {
      floorPrice: s.floorPriceBnb ?? "—",
      totalVolume: s.totalVolumeBnb ?? "—",
      volume24h: s.volume24hBnb ?? "—",
      listedCount: s.listedCount ?? "—",
      totalMinted: s.totalSupplyMinted ?? 0,
      maxSupply: s.maxSupply ?? 5000,
    };
  }, [marketData]);

  const canBuy = isConnected;

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

      <p className="text-[10px] text-secondary uppercase tracking-widest text-center leading-none">
        Collectible only. No promised returns, no yield, no guaranteed value.
      </p>

      {/* Stats strip */}
      <div className="border-t border-border border-b border-border py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs text-secondary">
          {[
            { label: "Floor", value: stats?.floorPrice ? `${stats.floorPrice} BNB` : "—" },
            { label: "Total Vol", value: stats?.totalVolume ? `${stats.totalVolume} BNB` : "—" },
            { label: "24h Vol", value: stats?.volume24h ? `${stats.volume24h} BNB` : "—" },
            { label: "Listed", value: stats?.listedCount ?? "—" },
            { label: "Minted", value: stats ? `${stats.totalMinted}/${stats.maxSupply}` : "—" },
          ].map((stat) => (
            <div key={stat.label} className="border-r border-border last:border-r-0 py-1">
              <div className="text-accent-gold font-medium tabular-nums">{stat.value}</div>
              <div className="text-secondary">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          type="text"
          value={searchTokenId}
          onChange={(e) => setSearchTokenId(e.target.value)}
          placeholder="Search tokenId…"
          className="flex-1 bg-neutral-800/30 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm text-primary placeholder-secondary focus:ring-2 focus:ring-accent-gold focus:border-transparent outline-none transition-colors duration-150"
        />
        <select
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          value={sortBy}
          className="bg-neutral-800/30 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm text-primary focus:ring-2 focus:ring-accent-gold focus:border-transparent outline-none transition-colors duration-150"
        >
          <option value="price-asc">Price Low → High</option>
          <option value="price-desc">Price High → Low</option>
        </select>
      </div>

      {idxLoading || (loading && !indexerReady) ? (
        <p className="text-secondary text-center py-12">Loading listings…</p>
      ) : sortedListings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-secondary">No listings yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedListings.map((l) => {
            const tier = parseTierFromToken(l.tokenId);
            const tierInfo = getTierInfo(tier);
            const tierName = tierInfo?.name?.split(" —")[0] ?? `Tier ${tier}`;
            return (
              <div
                key={l.tokenId}
                className="bg-neutral-800/30 border border-border rounded-xl p-4 sm:flex sm:items-center sm:gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-14 h-14 sm:w-14 sm:h-14 rounded-xl border border-border overflow-hidden shrink-0">
                    <Image
                      src={getTierImage(tier)}
                      alt={tierName}
                      width={56}
                      height={56}
                      className="object-cover w-full h-full"
                      decoding="async"
                      priority={l.tokenId === sortedListings[0]?.tokenId}
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

                <div className="mt-4 sm:mt-0 sm:w-auto flex sm:flex-col items-center sm:items-end gap-3 sm:gap-0 w-full sm:w-auto">
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

      {!canBuy && !error && (
        <div className="mt-8 pt-8 border-t border-border text-[10px] text-secondary">
          MetaMask / Binance Wallet extension. This is not Binance Agentic Wallet, and connecting does not grant mint access.
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 text-xs text-secondary bg-neutral-800/30 rounded-lg border border-border">
          {error}
        </div>
      )}
    </div>
  );
}
