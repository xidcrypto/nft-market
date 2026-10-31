"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { contractService } from "./lib/contracts";
import { CONFIG } from "./lib/config";
import { getTierInfo, formatPriceBnb, formatAddress } from "./lib/tier-utils";
import Image from "next/image";

export default function MintPage() {
  const [wallet, setWallet] = useState<{
    address: string | null;
    chainId: number | null;
    isConnected: boolean;
    pairingCode: string | null;
    qrCodeId: string | null;
  }>({
    address: null,
    chainId: null,
    isConnected: false,
    pairingCode: null,
    qrCodeId: null,
  });

  const [totalMinted, setTotalMinted] = useState(0);
  const [hasMinted, setHasMinted] = useState(false);
  const [agentBalance, setAgentBalance] = useState(0);
  const [challengeHex, setChallengeHex] = useState<string | null>(null);
  const [mining, setMining] = useState<{ isMining: boolean; progress: number; nonce: number | null; status: string }>({
    isMining: false,
    progress: 0,
    nonce: null,
    status: "idle",
  });
  const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);
  const [mintedTier, setMintedTier] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);

  const connectBinanceWallet = async () => {
    try {
      const connectionUrl = `https://web3.binance.com/en/agent-login?returnUrl=${encodeURIComponent(window.location.origin)}`;
      const connWindow = window.open(connectionUrl, "_blank");
      if (connWindow) {
        const checkConnection = setInterval(async () => {
          try {
            const provider = new ethers.BrowserProvider(window as any);
            const signer = await provider.getSigner();
            const addr = await signer.getAddress();
            const network = await provider.getNetwork();
            
            setWallet({
              address: addr,
              chainId: Number(network.chainId),
              isConnected: true,
              pairingCode: null,
              qrCodeId: null,
            });
            
            await contractService.init(provider);
            await refreshStatus(addr);
            clearInterval(checkConnection);
            connWindow?.close();
          } catch (e) {
            // Not connected yet
          }
        }, 2000);
        
        setTimeout(() => clearInterval(checkConnection), 30000);
      }
    } catch (e) {
      console.error("Connection error:", e);
      alert("Failed to connect Binance Wallet. Please open the Binance App and try again.");
    }
  };

  const refreshStatus = async (address: string) => {
    setTotalMinted(await contractService.totalMinted());
    setHasMinted(await contractService.hasMinted(address));
    setAgentBalance(await contractService.hasAgentId(address));
    const ch = await contractService.challengeFor(address);
    setChallengeHex(ch);
  };

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      refreshStatus(wallet.address);
    }
  }, [wallet.isConnected, wallet.address]);

  const handleMineNonce = () => {
    if (!wallet.address) return;
    setError(null);
    setSuccess(null);

    const workerCode = `
      self.onmessage = async function(ev) {
        const { wallet, contractAddress, chainId, targetBits } = ev.data;
        let nonce = 0;
        const maxNonce = 10000000;
        self.postMessage({ type: "progress", progress: 0 });
        
        function mine() {
          for (let i = 0; i < 1000; i++) {
            const data = ethers.solidityPacked(
              ["address", "address", "uint256", "uint256"],
              [wallet, contractAddress, chainId, nonce]
            );
            const hash = ethers.keccak256(data);
            
            const firstByte = parseInt(hash.slice(2, 4), 16);
            let zeros = 0;
            for (let b = 0; b < 16; b++) {
              const byte = parseInt(hash.slice(2 + b * 2, 4 + b * 2), 16);
              if (byte === 0) zeros += 8;
              else {
                zeros += Math.clz32(byte) - 24;
                break;
              }
            }
            
            if (zeros >= targetBits) {
              self.postMessage({ type: "found", nonce, hash });
              return;
            }
            
            nonce++;
            const progress = Math.min(100, Math.floor((nonce / maxNonce) * 100));
            self.postMessage({ type: "progress", progress });
          }
          
          if (nonce < maxNonce) {
            setTimeout(mine, 0);
          } else {
            self.postMessage({ type: "done", nonce: -1 });
          }
        }
        mine();
      };
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      const data = e.data;
      if (data.type === "progress") {
        setMining({
          isMining: true,
          progress: data.progress,
          nonce: mining.nonce,
          status: "searching",
        });
      } else if (data.type === "found") {
        setMining({
          isMining: false,
          progress: 100,
          nonce: data.nonce,
          status: "found",
        });
        worker.terminate();
      } else if (data.type === "done") {
        setError("Nonce search exceeded maximum attempts.");
        setMining({
          isMining: false,
          progress: 100,
          nonce: null,
          status: "done",
        });
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      console.error("Miner error:", err);
      setMining({ isMining: false, progress: 0, nonce: null, status: "error" });
    };

    setMining({ isMining: true, progress: 0, nonce: null, status: "starting" });
    worker.postMessage({
      wallet: wallet.address,
      contractAddress: CONFIG.aegisCrownAddress,
      chainId: CONFIG.chainId,
      targetBits: 16,
    });
  };

  const handleConfirmMint = async () => {
    if (!mining.nonce || !wallet.address) return;

    setMining({ ...mining, status: "confirming" });

    try {
      const tx = await contractService.mint(mining.nonce);
      
      setMintedTokenId(mining.nonce);
      const tier = await contractService.tierOf(mining.nonce);
      setMintedTier(tier);
      setSuccess(`Minted! Token #${mining.nonce} — Tier ${getTierInfo(tier)?.name ?? ""}`);
      setMining({ isMining: false, progress: 0, nonce: null, status: "idle" });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Mint failed");
      setMining({ ...mining, status: "idle" });
    }
  };

  const tierInfo = mintedTier ? getTierInfo(mintedTier) : null;
  const tierName = tierInfo?.name ?? "";

  return (
    <main className="min-h-screen bg-neutral-950 text-gray-200 antialiased">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <p className="text-xs text-gray-500 text-center sm:text-left">
          Collectible only. No promised returns, no yield, no guaranteed value.
        </p>

        {!wallet.isConnected ? (
          <section className="text-center py-16 border border-gray-800 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950" aria-labelledby="connect-title">
            <h2 id="connect-title" className="text-3xl sm:text-4xl font-bold text-yellow-500 mb-4">
              Aegis Crown
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto text-lg">
              Connect your Binance Agentic Wallet to mint your unique Aegis Crown NFT on BNB Chain (chainId 56).
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto justify-center">
              <button
                onClick={connectBinanceWallet}
                className="flex-1 px-6 py-3 text-white font-medium bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
              >
                Connect Binance Wallet
              </button>
              <button
                onClick={() => setShowConnect(true)}
                className="flex-1 px-4 py-2 text-sm text-gray-300 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
              >
                View Instructions
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8" aria-labelledby="stats-title">
              <h3 id="stats-title" className="sr-only">Minting Statistics</h3>
              <StatsCard 
                title="Total Minted" 
                value={`${totalMinted} / 5,000`} 
                color="text-yellow-500"
                icon={<CrownIcon className="w-6 h-6" />}
              />
              <StatsCard 
                title="Agent ID Balance" 
                value={agentBalance > 0 ? "1+" : "0"} 
                color="text-green-500"
                icon={<ShieldIcon className="w-6 h-6" />}
              />
              <StatsCard 
                title="Your Mint Status" 
                value={hasMinted ? "Yes" : "No"} 
                color={hasMinted ? "text-red-400" : "text-green-500"}
                icon={<CheckIcon className="w-6 h-6" />}
              />
            </section>

            {challengeHex && (
              <section className="bg-neutral-800/50 rounded-2xl p-4 border border-neutral-700 mb-6" aria-labelledby="challenge-title">
                <h3 id="challenge-title" className="text-sm font-semibold text-gray-300 mb-3">Your Challenge Hash</h3>
                <div className="text-xs text-gray-500 font-mono break-all bg-neutral-900 p-3 rounded-lg">
                  {challengeHex}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Minted using <code className="text-yellow-500">keccak256(challenge, nonce)</code> with ≥ 16 leading zero bits.
                </p>
              </section>
            )}

            <section className="bg-neutral-800/50 rounded-2xl p-4 border border-neutral-700 mb-6" aria-labelledby="mining-title">
              <h3 id="mining-title" className="text-sm font-semibold text-gray-300 mb-3">Nonce Mining</h3>
              {!mining.isMining ? (
                <div className="space-y-3">
                  <button
                    onClick={handleMineNonce}
                    disabled={!wallet.address || hasMinted}
                    className="w-full px-4 py-2 text-sm text-white bg-yellow-600 rounded-xl hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-neutral-950 transition-colors"
                  >
                    Mine for Valid Nonce
                  </button>
                  {hasMinted && (
                    <p className="text-xs text-gray-400 text-center">
                      You've already minted a crown. Visit the Market to trade.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Progress: {mining.progress}% ({mining.nonce ?? "..."} found)
                    </span>
                    <span className={`text-xs ${mining.progress > 20 ? "text-yellow-500" : "text-gray-400"}`}>
                      {mining.status === "searching" ? "Searching..." :
                       mining.status === "found" ? "FOUND!" :
                       mining.status === "done" ? "No solution found" : "Starting..."}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-neutral-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={mining.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-300"
                      style={{ width: `${mining.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </section>

            {mining.nonce !== null && mining.status === "found" && (
              <section className="bg-neutral-800/50 rounded-2xl p-4 border border-yellow-700/50 mb-6" aria-labelledby="mint-preview-title">
                <h3 id="mint-preview-title" className="text-sm font-semibold text-yellow-500 mb-3">Prepare Mint Transaction</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">Transaction will be signed in the Binance App.</p>
                  <div>
                    <span className="text-gray-400">Function:</span>{" "}
                    <code className="text-white">mint(uint256 nonce)</code>
                  </div>
                  <div>
                    <span className="text-gray-400">Parameters:</span>{" "}
                    <code className="text-white">{mining.nonce}</code>
                  </div>
                  <div>
                    <span className="text-gray-400">To:</span>{" "}
                    <code className="text-white font-mono">{CONFIG.aegisCrownAddress.slice(0, 20)}…</code>
                  </div>
                  <div>
                    <span className="text-gray-400">Value:</span>{" "}
                    <code className="text-white">0 BNB</code>
                  </div>
                </div>
                <button
                  onClick={handleConfirmMint}
                  className="mt-4 w-full px-6 py-3 text-sm text-white bg-green-600 rounded-xl hover:bg-green-500 transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-neutral-950"
                >
                  Confirm & Mint
                </button>
              </section>
            )}

            {mintedTokenId !== null && tierInfo && (
              <section className="bg-gradient-to-b from-neutral-900 to-neutral-950 rounded-2xl border border-yellow-700/30 p-8 text-center" aria-labelledby="minted-title">
                <div className="text-sm text-gray-400 mb-2">Your Aegis Crown</div>
                <h2 id="minted-title" className="text-3xl sm:text-4xl font-bold text-yellow-400 mb-3">Minted!</h2>
                <div className="bg-neutral-800 rounded-xl p-4 flex items-center justify-center gap-4 my-4">
                  <span className="text-4xl sm:text-5xl">👑</span>
                  <div>
                    <p className="text-white text-lg sm:text-xl font-bold">Token #{mintedTokenId}</p>
                    <p className="text-gray-400">
                      Tier: {tierName} — Power {tierInfo.power}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {error && (
              <section className="bg-red-950/50 border border-red-700/50 rounded-xl p-4" role="alert">
                <p className="text-sm text-red-300">{error}</p>
              </section>
            )}
          </>
        )}

        <footer className="mt-12 pt-8 border-t border-neutral-800 text-center text-sm text-gray-500">
          <p className="mb-2">Aegis Crown — NFT Collection on BNB Chain</p>
          <p>Collectible only. No promised returns, no yield, no guaranteed value.</p>
        </footer>
      </div>
    </main>
  );
}

function StatsCard({ title, value, color, icon }: { 
  title: string; 
  value: string; 
  color: string; 
  icon: React.ReactNode 
}) {
  return (
    <div className="bg-neutral-800/50 rounded-2xl p-4 border border-neutral-700 flex items-center gap-3">
      <div className={`p-2 rounded-xl ${color} bg-opacity-20`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-1">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>;
}

function ShieldIcon({ className }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}

function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>;
}