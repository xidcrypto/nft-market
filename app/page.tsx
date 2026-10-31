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

  const [totalMinted, setTotalMinted] = React.useState(0);
  const [hasMinted, setHasMinted] = React.useState(false);
  const [agentBalance, setAgentBalance] = React.useState(0);
  const [challengeHex, setChallengeHex] = React.useState<string | null>(null);
  const [mining, setMining] = React.useState<{ isMining: boolean; progress: number; nonce: number | null; status: string }>({
    isMining: false,
    progress: 0,
    nonce: null,
    status: "idle",
  });
  const [mintedTokenId, setMintedTokenId] = React.useState<number | null>(null);
  const [mintedTier, setMintedTier] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [showConnect, setShowConnect] = React.useState(false);

  const connectBinanceWallet = async () => {
    try {
      // Generate Binance Agentic Wallet sign-in request
      const response = await (window as any).ethereum?.request?.({
        method: "eth_signTypedData_v4",
        params: [],
      });
      
      // Alternative: use the Binance App connection flow
      const connectionUrl = `https://web3.binance.com/en/agent-login?returnUrl=${encodeURIComponent(window.location.origin)}`;
      
      // Open in new tab for Binance App dBrowser
      const connWindow = window.open(connectionUrl, "_blank");
      if (connWindow) {
        // Poll for connection status
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
        
        // Timeout after 30 seconds
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
    if (wallet.isConnected) {
      refreshStatus(wallet.address!);
    }
  }, [wallet.isConnected]);

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
      // Two-step flow for Binance Agentic Wallet:
      // 1. Preview transaction via contractService.mint()
      // 2. User signs in Binance App
      // 3. Execute with requestId
      
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <p className="text-xs text-gray-500">
        Collectible only. No promised returns, no yield, no guaranteed value.
      </p>

      {!wallet.isConnected ? (
        <div className="text-center py-16 border border-gray-800 rounded-xl bg-gradient-to-b from-gray-900 to-black">
          <h2 className="text-3xl font-bold text-yellow-500 mb-4">Aegis Crown</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Connect your Binance Agentic Wallet to mint your unique Aegis Crown NFT on BNB Chain (chainId 56).
          </p>
          
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            <button
              onClick={connectBinanceWallet}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
            >
              Connect Binance Wallet
            </button>
            
            <p className="text-xs text-gray-400 text-center">
              Open the link above in the Binance Wallet App's dApp browser,<br />
              then scan to connect.
            </p>
          </div>
          
          <div className="mt-8 p-6 bg-gray-800 rounded border border-gray-700">
            <h4 className="font-bold text-yellow-400 mb-2">How to Connect</h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-300">
              <li>Open Binance App → Wallet → dApp Browser</li>
              <li>Click "Connect Wallet" on this site</li>
              <li>Approve the connection in the Binance App</li>
              <li>Your address will appear above</li>
            </ol>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Total Minted</p>
              <p className="text-2xl font-bold text-yellow-500">{totalMinted} / 5,000</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Agent ID Balance</p>
              <p className="text-2xl font-bold text-green-500">{agentBalance > 0 ? "1+" : "0"}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Your Mint Status</p>
              <p className={`text-2xl font-bold ${hasMinted ? "text-red-400" : "text-green-500"}`}>
                {hasMinted ? "Yes" : "No"}
              </p>
            </div>
          </div>

          {/* Challenge display */}
          {challengeHex && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Your Challenge Hash</h3>
              <div className="text-xs text-gray-500 font-mono break-all">
                {challengeHex}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Minted using <code className="text-yellow-500">keccak256(challenge, nonce)</code> with ≥ 16 leading zero bits.
              </p>
            </div>
          )}

          {/* Mining */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Nonce Mining</h3>
            {!mining.isMining ? (
              <div className="space-y-3">
                <button
                  onClick={handleMineNonce}
                  disabled={!wallet.address || hasMinted}
                  className="px-4 py-2 text-sm text-white bg-yellow-600 rounded hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mine for Valid Nonce
                </button>
                {hasMinted && (
                  <p className="text-xs text-gray-400">
                    You've already minted a crown. Visit the Market to trade.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Progress: {mining.progress}% ({mining.nonce ?? "..."} found)
                  </span>
                  <span className={`text-xs ${mining.progress > 20 ? "text-yellow-500" : "text-gray-400"}`}>
                    {mining.status === "searching" ? "Searching..." :
                     mining.status === "found" ? "FOUND!" :
                     mining.status === "done" ? "No solution found" : "Starting..."}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-200"
                    style={{ width: `${mining.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mint confirmation */}
          {mining.nonce !== null && mining.status === "found" && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-yellow-700/50">
              <h3 className="text-sm font-semibold text-yellow-500 mb-3">Prepare Mint Transaction</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">
                  With Binance Agentic Wallet, transactions are signed in the Binance App.
                </p>
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
                className="mt-4 px-6 py-3 text-sm text-white bg-green-600 rounded hover:bg-green-500 transition-colors"
              >
                Confirm & Mint
              </button>
            </div>
          )}

          {/* Result */}
          {mintedTokenId !== null && tierInfo && (
            <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl border border-yellow-700/30 p-8 text-center">
              <div className="text-sm text-gray-400 mb-2">Your Aegis Crown</div>
              <h2 className="text-3xl font-bold text-yellow-400 mb-3">Minted!</h2>
              <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-center gap-4 my-4">
                <span className="text-4xl">👑</span>
                <div>
                  <p className="text-white text-lg font-bold">Token #{mintedTokenId}</p>
                  <p className="text-gray-400">
                    Tier: {tierName} — Power {tierInfo.power}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-950/50 border border-red-700/50 rounded-lg p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}