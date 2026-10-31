"use client";

import { useState, useEffect } from "react";
import { getTierInfo, getTierImage, formatAddress } from "./lib/tier-utils";
import { CONFIG } from "./lib/config";
import Link from "next/link";

const TIER_DATA = [
  { tier: 0, name: "Common — Scout", power: 10, supply: 3000 },
  { tier: 1, name: "Rare — Validator", power: 25, supply: 1250 },
  { tier: 2, name: "Epic — Sentinel", power: 50, supply: 600 },
  { tier: 3, name: "Legendary — Genesis", power: 100, supply: 100 },
  { tier: 4, name: "Mythic — Apex", power: 150, supply: 50 },
];

const TIER_COLOR = ["#9e9e9e", "#22c55e", "#3b82f6", "#eab308", "#ef4444"];

export default function HomePage() {
  const [marketData, setMarketData] = useState<any>(null);
  const [expandedTier, setExpandedTier] = useState<number | null>(null);
  const [mintedCount, setMintedCount] = useState(0);

  useEffect(() => {
    fetch("/market-data.json")
      .then((res) => res.json())
      .then((data) => {
        setMarketData(data);
        setMintedCount(data?.stats?.totalSupplyMinted ?? 0);
      })
      .catch(() => {});
  }, []);

  const stats = marketData?.stats;
  const mintOpen = mintedCount < 5000;
  const mintOpenText = mintOpen ? "Open" : "Closed";

  const statsRow = [
    { label: "Floor", value: stats?.floorPriceBnb ? `${stats.floorPriceBnb} BNB` : "—" },
    { label: "Total Volume", value: stats?.totalVolumeBnb ? `${stats.totalVolumeBnb} BNB` : "—" },
    { label: "24h Volume", value: stats?.volume24dBnb ? `${stats.volume24dBnb} BNB` : "—" },
    { label: "Listed", value: stats?.listedCount ? String(stats.listedCount) : "—" },
    { label: "Minted", value: stats?.totalSupplyMinted != null ? `${stats.totalSupplyMinted} / 5,000` : "—" },
  ];

  const scrollToMint = () => {
    const element = document.getElementById("mint-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-200 antialiased">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <p className="text-xs text-gray-500 text-center">
          Collectible only. No promised returns, no yield, no guaranteed value.
        </p>

        <div className="border-t border-b border-neutral-800 px-4 py-3">
          <div className="grid grid-cols-5 gap-4 text-center text-xs text-gray-400">
            {statsRow.map((stat) => (
              <div key={stat.label} className="border-r border-neutral-800 last:border-r-0">
                <div className="text-yellow-400 font-medium">{stat.value}</div>
                <div className="text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <section className="text-center max-w-640mx-auto">
          <p className="text-xs text-gray-500 mb-4">BNB CHAIN · FREE MINT FOR AGENT ID HOLDERS</p>
          <h1 className="text-40px font-semibold text-yellow-400 tracking-[-0.02em] mb-4">
            Aegis Crown
          </h1>
          <p className="text-sm text-gray-400 mb-6 max-w-2xl mx-auto">
            A 5,000-piece collectible for Binance AI Agent ID holders. One per wallet. Gas only.
          </p>
          <button
            onClick={scrollToMint}
            className="mb-4 inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-black bg-yellow-400 rounded-full hover:bg-yellow-300 transition-colors focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-neutral-950"
          >
            Mint for AI Agents
          </button>
          <div>
            <Link
              href="/market"
              className="text-sm text-gray-400 underline hover:text-yellow-400"
            >
              Browse the Market →
            </Link>
          </div>
        </section>

        <section aria-labelledby="tier-gallery-title">
          <h2 id="tier-gallery-title" className="sr-only">Tier Gallery</h2>
          <div className="space-y-1">
            {TIER_DATA.map((tier, idx) => {
              const tierInfo = getTierInfo(tier.tier);
              const isExpanded = expandedTier === tier.tier;
              return (
                <div key={tier.tier}>
                  <div
                    className="flex items-center gap-3 p-3 bg-neutral-800/30 border border-neutral-800 hover:bg-neutral-800/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedTier(isExpanded ? null : tier.tier)}
                  >
                    <div className="w-16 h-16 rounded-2xl border border-neutral-700 overflow-hidden">
                      <img
                        src={getTierImage(tier.tier)}
                        alt={tierInfo?.name ?? "Tier"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{tierInfo?.name ?? tier.name}</span>
                        <span className="text-xs text-gray-400">Tier {tier.tier}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Power: {tier.power} • Supply: {tier.supply}
                      </div>
                    </div>
                    <div className="w-16">
                      <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${(tier.supply / 5000) * 100}%`,
                            backgroundColor: TIER_COLOR[tier.tier],
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{(tier.supply / 5000) * 100}%</div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-16 py-4 bg-neutral-800/20 border-x border-b border-neutral-800">
                      <img
                        src={getTierImage(tier.tier)}
                        alt={tierInfo?.name ?? "Tier"}
                        className="max-w-48 mx-auto rounded-2xl border border-neutral-700"
                      />
                      <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto">
                        {tier.tier === 0 && "Common Scout NFTs - Founders at the base of the hierarchy, providing foundational support to the Aegis ecosystem."}
                        {tier.tier === 1 && "Rare Validator NFTs - Trusted validators securing the network, chosen for their reliability and skill."}
                        {tier.tier === 2 && "Epic Sentinel NFTs - Elite guardians protecting the realm from threats beyond the normal scope."}
                        {tier.tier === 3 && "Legendary Genesis NFTs - The first of their kind, created at the dawn of the Aegis Crown era."}
                        {tier.tier === 4 && "Mythic Apex NFTs - The rarest tier, representing the pinnacle of achievement in the Crown hierarchy."}
                      </p>
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/QmQ4oJiRy2GbXSwi2XAUM2T6BYhnC2eEcKE1Vzjm3kQHCB/${tierInfo?.name?.toLowerCase()}.json`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-xs text-yellow-400 underline hover:text-yellow-300 mt-2"
                      >
                        View metadata on IPFS
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section id="mint-section" className="border border-neutral-800 rounded-2xl px-4 py-6 mb-6">
          <h3 className="text-sm font-semibold text-yellow-400 mb-3">Mint for AI Agents</h3>
          <p className="text-xs text-gray-400 mb-4">
            Minting is on-chain, gas only, and limited to one per wallet for Agent ID holders.
          </p>

          <div className="space-y-2 mb-4 text-xs">
            <div>
              <span className="text-gray-500">Contract:</span>{" "}
              <code className="text-yellow-400 font-mono text-xs break-all">
                {CONFIG.aegisCrownAddress}
              </code>
            </div>
            <div>
              <span className="text-gray-500">Market:</span>{" "}
              <code className="text-yellow-400 font-mono text-xs break-all">
                {CONFIG.aegisMarketAddress}
              </code>
            </div>
            <div>
              <span className="text-gray-500">baseURI:</span>{" "}
              <code className="text-yellow-400 font-mono text-xs break-all">
                {CONFIG.baseUri}
              </code>
            </div>
            <div>
              <span className="text-gray-500">Chain ID:</span>{" "}
              <code className="text-yellow-400">56 (BNB Smart Chain)</code>
            </div>
          </div>

          <ol className="list-decimal list-inside space-y-2 text-xs text-gray-400 mb-4">
            <li>Call <code className="text-yellow-400">challengeFor(yourWallet)</code> to get your challenge hash.</li>
            <li>Find a nonce where <code className="text-yellow-400">keccak256(challenge, nonce)</code> has ≥ 16 leading zero bits.</li>
            <li>Call <code className="text-yellow-400">mint(nonce)</code> with value 0.</li>
            <li>Rarity is derived on-chain from the solution hash (0=Common … 4=Mythic).</li>
          </ol>

          <div className="pt-3 border-t border-neutral-700 text-xs text-gray-500">
            Total minted: {mintedCount} / 5,000 • Status: {mintOpenText}
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Collectible only. No promised returns, no yield, no guaranteed value.
          </p>
        </section>

        <footer className="border-t border-neutral-800 pt-6 text-center text-xs text-gray-500">
          <p className="mb-2">
            Aegis Crown (AEGIS) · BNB Chain · Collectible only. No promised returns, no yield, no guaranteed value.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="https://bscscan.com/address/0x61dfF633C8eE31f9811F75809dd9b82152597170"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-yellow-400"
            >
              AegisCrown contract
            </a>
            <a
              href="https://bscscan.com/address/0x9A2BC2555Bb7B5254595F1bF9Ab7A5CB6D12828b"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-yellow-400"
            >
              AegisMarket contract
            </a>
            <a
              href="https://gateway.pinata.cloud/ipfs/QmQ4oJiRy2GbXSwi2XAUM2T6BYhnC2eEcKE1Vzjm3kQHCB/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-yellow-400"
            >
              Metadata (IPFS)
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}