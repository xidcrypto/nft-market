"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONFIG } from "../lib/config";

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
}

export function WalletComponent() {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    provider: null,
    signer: null,
  });

  const switchChain = useCallback(async (provider: ethers.BrowserProvider) => {
    try {
      await provider.send("wallet_switchEthereumChain", [{
        chainId: `0x${CONFIG.chainId.toString(16)}`
      }]);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.send("wallet_addEthereumChain", [{
            chainId: `0x${CONFIG.chainId.toString(16)}`,
            rpcUrls: [CONFIG.rpcUrl],
            chainName: "BNB Smart Chain",
            blockExplorerUrls: [CONFIG.explorerUrl],
            nativeCurrency: {
              name: "BNB",
              symbol: "BNB",
              decimals: 18,
            },
          }]);
        } catch (addError) {
          console.error("Error adding chain:", addError);
        }
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;

      const { ethereum } = window as any;
      if (!ethereum) {
        alert("MetaMask not installed! Please install MetaMask to use this dApp.");
        return;
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      await switchChain(provider);

      setWalletState({
        address: accounts[0],
        chainId: Number(network.chainId),
        isConnected: true,
        provider,
        signer,
      });

      ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletState(prev => ({ ...prev, address: accounts[0] }));
        } else {
          disconnectWallet();
        }
      });

    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  }, [switchChain]);

  const disconnectWallet = useCallback(() => {
    setWalletState({
      address: null,
      chainId: null,
      isConnected: false,
      provider: null,
      signer: null,
    });
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

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    switchChain,
  };
}