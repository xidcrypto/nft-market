"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { contractService } from "../lib/contracts";
import { CONFIG } from "../lib/config";
import { formatAddress } from "../lib/tier-utils";

export function Header() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [totalMinted, setTotalMinted] = useState<number>(0);
  const [hasMinted, setHasMinted] = useState<boolean>(false);
  const [agentBalance, setAgentBalance] = useState<number>(0);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined") return;
    const { ethereum } = window as any;
    if (!ethereum) {
      alert("MetaMask not installed! Please install MetaMask to use this dApp.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();

      await provider.send("wallet_switchEthereumChain", [
        { chainId: `0x${CONFIG.chainId.toString(16)}` },
      ]);

      setWalletAddress(accounts[0]);
      setChainId(Number(network.chainId));
      setIsConnected(true);

      await contractService.init(provider);
      await refreshStatus(accounts[0]);
    } catch (e) {
      console.error("Connect error:", e);
    }
  }, []);

  const refreshStatus = useCallback(async (address: string) => {
    setTotalMinted(await contractService.totalMinted());
    setHasMinted(await contractService.hasMinted(address));
    setAgentBalance(await contractService.hasAgentId(address));
    const ch = await contractService.challengeFor(address);
    setChallenge(ch.slice(0, 10) + "\u2026");
  }, []);

  const isWrongNetwork = chainId !== null && chainId !== CONFIG.chainId;

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setChainId(null);
    setTotalMinted(0);
    setHasMinted(false);
    setAgentBalance(0);
    setChallenge(null);
    setIsConnected(false);
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

  return (
    <header className="bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-300 text-sm font-medium hover:text-white transition-colors"
          >
            <svg
              className="h-5 w-5 text-yellow-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Aegis Crown<br/>AEGIS
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link
              href="/market"
              className="text-gray-400 hover:text-yellow-400 transition-colors text-sm font-medium"
            >
              Market
            </Link>
            <Link
              href="/mininlist"
              className="text-gray-400 hover:text-yellow-400 transition-colors text-sm font-medium"
            >
              Mininlist
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}