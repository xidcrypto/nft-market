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
    isConnected: boolean;
    signer: ethers.Signer | null;
  }>({
    address: null,
    isConnected: false,
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

  const loadIndexerData = useCallback(async () => {
    try {
      const res = await fetch("/market-data.json");
      if (res.ok) setListings((prev) => prev);
    } catch {}
  }, []);

  useEffect(() => {
    loadIndexerData();
  }, [loadIndexerData]);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined") return;
    const { ethereum } = window as any;
    if (!ethereum) {
      alert("Please install MetaMask or Binance Wallet extension to trade.");
      return;
    }
    try {
      const prov = new ethers.BrowserProvider(ethereum);
      await prov.send("wallet_switchEthereumChain", [
        { chainId: `0x${CONFIG.chainId.toString(16)}` },
      ]);
      const accounts = await prov.send("eth_requestAccounts", []);
      const signer = await prov.getSigner();
      setWallet({ address: accounts[0], isConnected: true, signer });
      await contractService.init(prov);
      await marketContractService.init(signer);
      fetchListings();
    } catch (e) {
      console.error("Connect error:", e);
    }
  }, []);

  const fetchListings = useCallback(async () => {
    if (!wallet.signer) return;
    setLoading(true);
    try {
      await marketContractService.init(wallet.signer);
      const result = await marketContractService.getListings();
      setListings(result.map((l: any) => ({
        tokenId: l.tokenId,
        seller: l.seller,
        price: l.price?.toString?.() ?? l.price,
        priceBnb: l.priceBnb ?? formatPriceBnb(l.price?.toString?.() ?? l.price),
        tier: 0,
        active: true,
      })));
    } catch (e) {
      setError("Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [wallet.signer]);

  useEffect(() => {
    if (!wallet.isConnected) {
      setListings([]);
      setLoading(false);
    } else {
      fetchListings();
    }
  }, [wallet.isConnected, fetchListings]);

  const [buyPreview, setBuyPreview] = useState<{ tokenId: number; price: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleBuy = (tokenId: number) => {
    if (!wallet.isConnected) {
      setBuyPreview(null);
      return;
    }
    const listing = listings.find((l) => l.tokenId === tokenId);
    if (!listing) return;
    setBuyPreview({ tokenId, price: listing.priceBnb });
  };

  const handleConfirmBuy = async () => {
    if (!buyPreview || !wallet.signer) return;
    setConfirming(true);
    try {
      const listing = listings.find((l) => l.tokenId === buyPreview.tokenId);
      if (!listing) return;
      const priceWei = ethers.parseUnits(listing.price, 18);
      const marketContract = new ethers.Contract(
        CONFIG.aegisMarketAddress,
        ["function buy(uint256 tokenId) external payable"],
        wallet.signer
      );
      const tx = await marketContract.buy(buyPreview.tokenId, { value: priceWei });
      await tx.wait();
      await fetchListings();
      setBuyPreview(null);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Buy failed");
      setConfirming(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-primary antialiased">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-accent-gold font-semibold tracking-tighter" style={{ fontSize: "clamp(24px, 5vw, 40px)", lineHeight: "1.1" }}>
              Aegis Crown — Mininlist
            </h1>
            <p className="text-secondary text-sm mt-1">Minimal listing interface for quick trading</p>
          </div>
          <button
            onClick={connectWallet}
            disabled={wallet.isConnected}
            className="px-6 py-2.5 text-sm font-medium text-black bg-accent-gold rounded-lg focus:ring-2 focus:ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors duration-150 disabled:opacity-50"
          >
            {wallet.isConnected ? "Connected" : "Connect EVM Wallet"}
          </button>
        </div>

        <p className="text-[10px] text-secondary text-center sm:text-left leading-none">
          Collectible only. No promised returns, no yield, no guaranteed value.
        </p>

        {loading ? (
          <p className="text-secondary text-center py-12">Loading listings…</p>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-secondary">No listings yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {listings
              .filter((l) => l.active)
              .map((l) => {
                const tier = l.tier;
                const tierInfo = getTierInfo(tier);
                const tierName = tierInfo?.name?.split(" —")[0] ?? `Tier ${tier}`;
                return (
                  <article
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
                      {!wallet.isConnected ? (
                        <button
                          onClick={() => handleBuy(l.tokenId)}
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
                  </article>
                );
              })}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 text-xs text-secondary bg-neutral-800/30 rounded-lg border border-border">
            {error}
          </div>
        )}

        {wallet.isConnected && !error && (
          <div className="mt-8 pt-8 border-t border-border text-[10px] text-secondary text-center">
            MetaMask / Binance Wallet extension. This is not Binance Agentic Wallet, and connecting does not grant mint access.
          </div>
        )}
      </div>
    </main>
  );
}
