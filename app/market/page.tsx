"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import Image from "next/image";
import { contractService, marketContractService } from "../lib/contracts";
import { CONFIG } from "../lib/config";
import { getTierInfo, formatPriceBnb, formatAddress, getTierImage, getTierBadgeClass } from "../lib/tier-utils";

type ActionPhase = "none" | "buy" | "confirming-buy";

type Listing = {
  tokenId: number;
  seller: string;
  price: string;
  priceBnb: string;
  timestamp: number;
  active: boolean;
};

type SortOption = "price-asc" | "price-desc";

function parseTierFromToken(tokenId: number): number | null {
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
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const [marketData, setMarketData] = useState<any>(null);
  const [liveListings, setLiveListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [idxLoading, setIdxLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPhase, setActionPhase] = useState<ActionPhase>("none");
  const [listingPreview, setListingPreview] = useState<{ tokenId: number; price: string } | null>(null);

  const [sortBy, setSortBy] = useState<SortOption>("price-asc");
  const [searchTokenId, setSearchTokenId] = useState<string>("");

  const loadMarketData = useCallback(async () => {
    setIdxLoading(true);
    try {
      const res = await fetch("/market-data.json");
      if (res.ok) {
        const data = await res.json();
        setMarketData(data);
      } else {
        setMarketData(null);
      }
    } catch (e) {
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
      const signer = await prov.getSigner();

      setWalletAddress(accounts[0]);
      setProvider(prov);
      setSigner(signer);
      setIsConnected(true);

      await contractService.init(prov);
      contractService.setMode("live");
      await marketContractService.init(signer);
      marketContractService.setMode("live");
    } catch (e) {
      console.error("Connect error:", e);
    }
  }, []);

  useEffect(() => {
    const { ethereum } = window as any;
    if (ethereum) {
      ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          connectWallet();
        }
      });
    }
  }, [connectWallet]);

  const fetchLiveListings = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      await contractService.init(provider);
      await marketContractService.init(signer!);
      const result = await marketContractService.getListings();
      const mapped: Listing[] = result.map((l: any) => ({
        tokenId: l.tokenId,
        seller: l.seller,
        price: l.price ?? l.priceBnb,
        priceBnb: l.priceBnb ?? formatPriceBnb(l.price),
        timestamp: 0,
        active: l.active,
      }));
      setLiveListings(mapped);
    } catch (e) {
      console.error(e);
      setLiveListings([]);
    } finally {
      setLoading(false);
    }
  }, [provider, signer]);

  useEffect(() => {
    if (!isConnected) {
      setLiveListings([]);
      setLoading(false);
    } else {
      fetchLiveListings();
    }
  }, [isConnected, fetchLiveListings]);

  const indexerReady = marketData !== null;

  const stats = useMemo(() => {
    if (!marketData?.stats) return null;
    const s = marketData.stats;
    return {
      floorPrice: s.floorPriceBnb ?? "—",
      totalVolume: s.totalVolumeBnb ?? "—",
      volume24h: s.volume24hBnb ?? "—",
      listedCount: s.listedCount ?? "—",
      ownersCount: s.ownersCount ?? "—",
      totalMinted: s.totalSupplyMinted ?? 0,
      maxSupply: s.maxSupply ?? 5000,
    };
  }, [marketData]);

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
        items = items.filter(l => l.tokenId === tid);
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

  const handleBuy = (tokenId: number) => {
    if (!isConnected) {
      alert("Wallet not connected!");
      return;
    }
    const listing = sortedListings.find(l => l.tokenId === tokenId);
    if (!listing) return;
    setActionPhase("buy");
    setListingPreview({ tokenId, price: listing.priceBnb });
  };

  const handleConfirmBuy = async () => {
    if (!listingPreview) return;
    setActionPhase("confirming-buy");
    try {
      const listing = sortedListings.find(l => l.tokenId === listingPreview.tokenId);
      if (!listing) return;
      await marketContractService.buy(listingPreview.tokenId, listing.price);
      await new Promise(r => setTimeout(r, 300));
      await fetchLiveListings();
      setActionPhase("none");
      setListingPreview(null);
      alert(`Bought token #${listingPreview.tokenId}!`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Buy failed");
      setActionPhase("none");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <p className="text-xs text-gray-500">
        Collectible only. No promised returns, no yield, no guaranteed value.
      </p>

      {stats ? (
        <div className="border-t border-b border-neutral-800 px-4 py-3">
          <div className="grid grid-cols-5 gap-4 text-center text-xs text-gray-400">
            <div className="border-r border-neutral-800">
              <div className="text-yellow-400 font-medium">{stats.floorPrice} BNB</div>
              <div className="text-gray-500">Floor</div>
            </div>
            <div className="border-r border-neutral-800">
              <div className="text-yellow-400 font-medium">{stats.totalVolume} BNB</div>
              <div className="text-gray-500">Total Vol</div>
            </div>
            <div className="border-r border-neutral-800">
              <div className="text-yellow-400 font-medium">{stats.volume24h} BNB</div>
              <div className="text-gray-500">24h Vol</div>
            </div>
            <div className="border-r border-neutral-800">
              <div className="text-yellow-400 font-medium">{stats.listedCount}</div>
              <div className="text-gray-500">Listed</div>
            </div>
            <div>
              <div className="text-yellow-400 font-medium">{stats.totalMinted}/{stats.maxSupply}</div>
              <div className="text-gray-500">Minted</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-b border-neutral-800 px-4 py-3">
          <div className="grid grid-cols-5 gap-4 text-center text-xs text-gray-400">
            <div className="border-r border-neutral-800">
              <div className="text-yellow-400 font-medium">—</div>
              <div className="text-gray-500">Floor</div>
            </div>
            <div className="border-r border-neutral-800">
              <div className="text-yellow-400 font-medium">—</div>
              <div className="text-gray-500">Total Vol</div>
            </div>
            <div className="border-r border-neutral-800">
              <div className="text-yellow-400 font-medium">—</div>
              <div className="text-gray-500">24h Vol</div>
            </div>
            <div className="border-r border-neutral-800">
              <div className="text-yellow-400 font-medium">—</div>
              <div className="text-gray-500">Listed</div>
            </div>
            <div>
              <div className="text-yellow-400 font-medium">—</div>
              <div className="text-gray-500">Minted</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          value={searchTokenId}
          onChange={(e) => setSearchTokenId(e.target.value)}
          placeholder="Search tokenId..."
          className="flex-1 bg-neutral-800/50 border border-neutral-700 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        />
        <select
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          value={sortBy}
          className="bg-neutral-800/50 border border-neutral-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        >
          <option value="price-asc">Price Low → High</option>
          <option value="price-desc">Price High → Low</option>
        </select>
      </div>

      {idxLoading || (loading && !indexerReady) ? (
        <p className="text-gray-500">Loading listings...</p>
      ) : sortedListings.length === 0 ? (
        <div className="text-center py-12 bg-neutral-800/50 rounded-lg">
          <p className="text-gray-400">No listings yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedListings.map(l => {
            const tier = parseTierFromToken(l.tokenId) ?? 0;
            const tierInfo = getTierInfo(tier);
            return (
              <div key={l.tokenId} className="flex items-center gap-4 p-3 bg-neutral-800/50 rounded-xl border border-neutral-700 hover:border-yellow-500/50 transition-colors">
                <div className="relative w-14 h-14 rounded-xl border border-neutral-700 overflow-hidden flex-shrink-0">
                  <div className={`absolute inset-0 ring-2 ring-inset ${getTierBadgeClass(tier)} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <Image
                    src={getTierImage(tier)}
                    alt={tierInfo?.name ?? "Aegis Crown"}
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white truncate">
                      Aegis Crown #{l.tokenId} — {tierInfo?.name?.split(" —")[0] ?? "Tier " + tier}
                    </span>
                    <span className="text-xl font-medium text-yellow-400 whitespace-nowrap">
                      {l.priceBnb} BNB
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Seller: {formatAddress(l.seller)}
                  </div>
                </div>
                {isConnected ? (
                  <button
                    onClick={() => handleBuy(l.tokenId)}
                    className="px-4 py-2 text-sm font-medium text-black bg-yellow-400 rounded-full hover:bg-yellow-300 transition-colors focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-neutral-950 whitespace-nowrap"
                  >
                    Buy
                  </button>
                ) : (
                  <button
                    onClick={connectWallet}
                    className="px-4 py-2 text-sm font-medium text-white bg-neutral-700 rounded-full hover:bg-neutral-600 transition-colors focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-950 whitespace-nowrap"
                  >
                    Connect EVM Wallet — for buying only
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {actionPhase === "buy" && listingPreview && (
        <div className="bg-neutral-800/50 rounded-xl border border-yellow-700/50 p-4">
          <h3 className="text-sm font-semibold text-yellow-500 mb-3">Confirm Purchase</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Token ID:</span>{" "}
              <code className="text-white">#{listingPreview.tokenId}</code>
            </div>
            <div>
              <span className="text-gray-400">Price:</span>{" "}
              <code className="text-white">{listingPreview.price} BNB</code>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Buyer pays exactly the listed price. The 3% marketplace fee is deducted from the seller's proceeds on-chain.
            </p>
            <p className="text-xs text-gray-400">
              Transaction will be signed in the connected wallet (MetaMask / Binance Wallet).
            </p>
          </div>
          <button
            onClick={handleConfirmBuy}
            className="mt-4 px-6 py-3 text-sm text-black bg-yellow-400 rounded-full hover:bg-yellow-300 transition-colors focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-neutral-950"
          >
            Confirm & Sign
          </button>
        </div>
      )}

      {!isConnected && (
        <div className="mt-8 pt-8 border-t border-neutral-800 text-sm text-gray-500">
          <p className="text-xs text-gray-500 mb-2">
            MetaMask / Binance Wallet extension. This is not Binance Agentic Wallet, and connecting does not grant mint access.
          </p>
        </div>
      )}
    </div>
  );
}