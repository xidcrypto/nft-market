"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import Image from "next/image";
import { contractService, marketContractService } from "../lib/contracts";
import { CONFIG } from "../lib/config";
import { getTierInfo, formatPriceBnb, formatAddress, getTierImage } from "../lib/tier-utils";
import { formatTimeAgo } from "../lib/tier-utils";

type ActionPhase = "none" | "list" | "buy" | "cancel" | "confirming-buy" | "confirming-cancel" | "confirming-list";

type Listing = {
  tokenId: number;
  seller: string;
  price: string;
  priceBnb: string;
  timestamp: number;
  active: boolean;
};

type SortOption = "price-asc" | "price-desc" | "newest" | "rarity";

function parseTierFromToken(tokenId: number): number | null {
  const rand = tokenId % 5000;
  if (rand < 3000) return 1;
  if (rand < 4250) return 2;
  if (rand < 4850) return 3;
  if (rand < 4950) return 4;
  return 5;
}

function getTierNameFromTierNum(tierNum: number): string {
  const names: Record<number, string> = {
    1: "Common",
    2: "Rare",
    3: "Epic",
    4: "Legendary",
    5: "Mythic",
  };
  return names[tierNum] ?? "Unknown";
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
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [actionPhase, setActionPhase] = useState<ActionPhase>("none");
  const [listingPreview, setListingPreview] = useState<{ tokenId: number; price: string } | null>(null);

  const [sortBy, setSortBy] = useState<SortOption>("price-asc");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [searchTokenId, setSearchTokenId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"listings" | "activity">("listings");

  // Load market-data.json on mount
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

      setWalletAddress(accounts[0]);
      setProvider(prov);
      setSigner(signer);
      setIsConnected(true);

      await contractService.init(prov);
      await marketContractService.init(signer);
    } catch (e) {
      console.error("Connect error:", e);
    }
  }, []);

  const disconnectWallet = () => {
    setWalletAddress(null);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
  };

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

  // Live listings fallback
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

  // --- Derive data ---
  const indexerReady = marketData !== null;

  const stats = useMemo(() => {
    if (!marketData?.stats) return null;
    const s = marketData.stats;
    return {
      floorPrice: s.floorPriceBnb ?? "0",
      totalVolume: s.totalVolumeBnb ?? "0",
      volume24h: s.volume24hBnb ?? "0",
      volume7d: s.volume7dBnb ?? "0",
      listedCount: s.listedCount ?? 0,
      listedPercent: s.listedPercent ?? 0,
      ownersCount: s.ownersCount ?? 0,
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

    // Tier filter
    if (tierFilter !== "all") {
      const tierNum = parseTierFromToken(0); // placeholder
      // Filter by tier - we infer from tokenId
      const tierMapping: Record<string, number> = {
        common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5,
      };
      const targetTier = tierMapping[tierFilter] ?? 0;
      items = items.filter(l => parseTierFromToken(l.tokenId) === targetTier);
    }

    // Search filter
    if (searchTokenId) {
      const tid = parseInt(searchTokenId, 10);
      if (!isNaN(tid)) {
        items = items.filter(l => l.tokenId === tid);
      }
    }

    // Sort
    items.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return parseFloat(a.priceBnb) - parseFloat(b.priceBnb);
        case "price-desc":
          return parseFloat(b.priceBnb) - parseFloat(a.priceBnb);
        case "newest":
          return (b.timestamp ?? 0) - (a.timestamp ?? 0);
        case "rarity":
          const ta = parseTierFromToken(a.tokenId) ?? 1;
          const tb = parseTierFromToken(b.tokenId) ?? 1;
          return tb - ta;
        default:
          return 0;
      }
    });

    return items;
  }, [sourceListings, sortBy, tierFilter, searchTokenId]);

  const recentActivity = useMemo(() => {
    if (!marketData) return [];
    const rows = [];
    for (const s of marketData.recentSales ?? []) {
      rows.push({
        type: "sale",
        tokenId: s.tokenId,
        priceBnb: s.priceBnb,
        buyer: s.buyer,
        seller: s.seller,
        timeAgo: s.timeAgo ?? "",
      });
    }
    for (const a of marketData.recentActivity ?? []) {
      rows.push({
        type: a.type,
        tokenId: a.tokenId,
        priceBnb: a.priceBnb,
        buyer: a.buyer ?? "",
        seller: a.user ?? (a.seller ?? ""),
        timeAgo: a.timeAgo ?? "",
      });
    }
    rows.sort((a: any, b: any) => b.timestamp - a.timestamp);
    return rows.slice(0, 50);
  }, [marketData]);

  // --- Action handlers ---
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

  const handleCancel = async () => {
    if (!selectedTokenId) return;
    setActionPhase("confirming-cancel");
    try {
      await marketContractService.cancel(selectedTokenId);
      await new Promise(r => setTimeout(r, 300));
      await fetchLiveListings();
      setActionPhase("none");
      setSelectedTokenId(null);
      alert(`Cancelled listing for token #${selectedTokenId}!`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
      setActionPhase("none");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <p className="text-xs text-gray-500">
        Collectible only. No promised returns, no yield, no guaranteed value.
      </p>

      {!isConnected ? (
        <div className="text-center py-16 border border-gray-800 rounded-xl bg-gradient-to-b from-gray-900 to-black">
          <h1 className="text-3xl font-bold text-yellow-500 mb-4">Aegis Market</h1>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Trade unique Aegis Crown NFTs on BNB Chain. Connect your Binance Agentic Wallet.
          </p>
          <button
            onClick={connectWallet}
            className="px-6 py-3 text-white font-medium bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors inline-flex items-center gap-2"
          >
            Connect Wallet
          </button>
          <div className="mt-8 p-6 bg-gray-800 rounded border border-gray-700 max-w-md mx-auto text-left">
            <h4 className="font-bold text-yellow-400 mb-2">How to Connect</h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-300">
              <li>Open Binance App → Wallet → dApp Browser</li>
              <li>Visit this site in the dApp browser</li>
              <li>Click "Connect Wallet" and approve in the App</li>
            </ol>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          {stats ? (
            <div className="bg-gray-800/80 rounded-xl border border-gray-700 p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-yellow-400">Collection Stats</h3>
                <span className="text-xs text-gray-500">
                  Data updated: {new Date(marketData.updatedAt).toLocaleString()}
                  {!indexerReady && <span className="text-red-400"> (stale)</span>}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-400">
                <div>
                  <div className="font-medium text-yellow-400">{stats.floorPrice} BNB</div>
                  <div>Floor</div>
                </div>
                <div>
                  <div className="font-medium text-yellow-400">{stats.totalVolume} BNB</div>
                  <div>Total Volume</div>
                </div>
                <div>
                  <div className="font-medium text-yellow-400">{stats.volume24h} BNB</div>
                  <div>24h Volume</div>
                </div>
                <div>
                  <div className="font-medium text-yellow-400">{stats.volume7d} BNB</div>
                  <div>7d Volume</div>
                </div>
                <div>
                  <div className="font-medium text-yellow-400">{stats.listedCount}</div>
                  <div>Listed</div>
                </div>
                <div>
                  <div className="font-medium text-yellow-400">{stats.listedPercent.toFixed(2)}%</div>
                  <div>Listed %</div>
                </div>
                <div>
                  <div className="font-medium text-yellow-400">{stats.ownersCount}</div>
                  <div>Owners</div>
                </div>
                <div>
                  <div className="font-medium text-yellow-400">{stats.totalMinted}/{stats.maxSupply}</div>
                  <div>Minted</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 mb-6 text-center">
              <p className="text-gray-400">
                Indexer not run yet. Showing live data. Run <code className="text-yellow-500">node scripts/indexer.mjs</code> to enable indexed stats.
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-700 mb-4">
            <button
              onClick={() => setActiveTab("listings")}
              className={`pb-2 text-sm ${activeTab === "listings" ? "text-yellow-400 border-b-2 border-yellow-400" : "text-gray-400"}`}
            >
              Listings
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`pb-2 text-sm ${activeTab === "activity" ? "text-yellow-400 border-b-2 border-yellow-400" : "text-gray-400"}`}
            >
              Activity
            </button>
          </div>

          {/* Sort & Filter */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <select
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-gray-700/50 rounded border border-gray-600 px-2 py-1 text-sm text-white"
              >
                <option value="price-asc" selected={sortBy === "price-asc"}>Price Low→High</option>
                <option value="price-desc" selected={sortBy === "price-desc"}>Price High→Low</option>
                <option value="newest" selected={sortBy === "newest"}>Newest Listing</option>
                <option value="rarity" selected={sortBy === "rarity"}>Rarity (Mythic First)</option>
              </select>

              <select
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-gray-700/50 rounded border border-gray-600 px-2 py-1 text-sm text-white"
              >
                <option value="all" selected={tierFilter === "all"}>All Tiers</option>
                <option value="mythic" selected={tierFilter === "mythic"}>Mythic</option>
                <option value="legendary" selected={tierFilter === "legendary"}>Legendary</option>
                <option value="epic" selected={tierFilter === "epic"}>Epic</option>
                <option value="rare" selected={tierFilter === "rare"}>Rare</option>
                <option value="common" selected={tierFilter === "common"}>Common</option>
              </select>

              <input
                type="text"
                value={searchTokenId}
                onChange={(e) => setSearchTokenId(e.target.value)}
                placeholder="Search tokenId..."
                className="bg-gray-700/50 rounded border border-gray-600 px-2 py-1 text-sm text-white"
              />

              <button
                onClick={() => {
                  if (indexerReady) {
                    loadMarketData();
                  } else {
                    fetchLiveListings();
                  }
                }}
                className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Listings Grid */}
          {activeTab === "listings" && (
            <div className="space-y-6">
              {idxLoading || (loading && !indexerReady) ? (
                <p className="text-gray-500">Loading listings...</p>
              ) : sortedListings.length === 0 ? (
                <div className="text-center py-12 bg-gray-800/50 rounded-lg">
                  <p className="text-gray-400">No current listings</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedListings.map(l => {
                    const tier = parseTierFromToken(l.tokenId) ?? 1;
                    const tierInfo = getTierInfo(tier);
                    return (
                      <div key={l.tokenId} className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden transition-transform hover:border-yellow-500">
                        <div className="relative h-48 bg-gray-700">
                          <Image
                            src={getTierImage(tier)}
                            alt={tierInfo?.name ?? "Aegis Crown"}
                            width={400}
                            height={300}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-400">Token #{l.tokenId}</span>
                            <span className="text-xs font-medium text-yellow-400">
                              {tierInfo?.name?.split(" —")[0] ?? "Tier " + tier}
                            </span>
                          </div>
                          <div className="mb-2">
                            <span className="text-xs text-gray-400 block">Seller</span>
                            <span className="text-xs text-gray-300 truncate w-32">
                              {formatAddress(l.seller)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-300">Price</span>
                            <span className="text-xl font-medium text-yellow-400">
                              {l.priceBnb} BNB
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {actionPhase !== "none" && l.tokenId === selectedTokenId ? (
                              <>
                                <button
                                  onClick={() => setActionPhase("buy")}
                                  className="flex-1 px-2.5 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-500"
                                >
                                  Buy
                                </button>
                                <button
                                  onClick={() => setActionPhase("cancel")}
                                  className="flex-1 px-2.5 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-500"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setSelectedTokenId(l.tokenId)}
                                className="text-xs text-gray-400 hover:text-white"
                              >
                                View
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div>
              <div className="overflow-x-auto text-sm">
                <table className="min-w-full border border-gray-700 rounded-lg overflow-hidden text-gray-400">
                  <thead className="bg-gray-800/50">
                    <tr className="text-left text-xs">
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Token</th>
                      <th className="py-2 px-3">Tier</th>
                      <th className="py-2 px-3">Price</th>
                      <th className="py-2 px-3">Buyer</th>
                      <th className="py-2 px-3">Seller</th>
                      <th className="py-2 px-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((row, i) => (
                      <tr key={i} className="border-b border-gray-700">
                        <td className="py-2 px-3">{row.type}</td>
                        <td className="py-2 px-3">#{row.tokenId}</td>
                        <td className="py-2 px-3">{row.type === "sale" ? "—" : getTierNameFromTierNum(parseTierFromToken(row.tokenId) ?? 1)}</td>
                        <td className="py-2 px-3">{row.priceBnb ? row.priceBnb + " BNB" : "—"}</td>
                        <td className="py-2 px-3">{formatAddress(row.buyer)}</td>
                        <td className="py-2 px-3">{formatAddress(row.seller)}</td>
                        <td className="py-2 px-3">{row.timeAgo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confirm Purchase Preview */}
          {actionPhase === "buy" && listingPreview && (
            <div className="bg-gray-800/50 rounded-xl border border-yellow-700/50 p-4">
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
                <div>
                  <span className="text-gray-400">Fee (3%):</span>{" "}
                  <code className="text-white">{parseFloat(listingPreview.price) * 0.03} BNB</code>
                </div>
                <div>
                  <span className="text-gray-400">Total:</span>{" "}
                  <code className="text-white">{parseFloat(listingPreview.price) * 1.03} BNB</code>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Transaction will be signed in the Binance App.
                </p>
              </div>
              <button
                onClick={handleConfirmBuy}
                className="mt-4 px-6 py-3 text-sm text-white bg-green-600 rounded hover:bg-green-500 transition-colors"
              >
                Confirm & Sign
              </button>
            </div>
          )}

          {/* Agent Trading Note */}
          <div className="mt-8 pt-8 border-t border-gray-700 text-sm text-gray-500">
            <h3 className="font-bold text-yellow-400 mb-3">Agent Trading Note</h3>
            <p>
              Agents trade by calling the Marketplace contract directly from their agent wallet, following the
              skill.md protocol. Agents do NOT use MetaMask for trading.
            </p>
          </div>
        </>
      )}
    </div>
  );
}