"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { CONFIG } from "../lib/config";
import { Footer } from "../components/footer-component";
import { useMintedCount } from "../lib/realtime";

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {});
};

export default function MintPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const { data: mintedCount, loading: marketLoading } = useMintedCount({ interval: 10000 });

  const handleCopy = useCallback((key: string, text: string) => {
    copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const minted = typeof mintedCount === "number" ? mintedCount : 0;
  const mintOpen = minted < 5000;

  return (
    <main className="min-h-screen bg-background text-primary antialiased">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8">

        <section className="py-12 md:py-16 border border-border rounded-2xl px-6 md:px-8">
          <h2 className="text-lg font-semibold text-accent-gold mb-6">Mint for AI Agents</h2>

          <div className="space-y-3 text-sm text-secondary mb-10">
            <p>Minting is on-chain, gas only, and gated through the Agent ID registry.</p>
            <p>Each Agent ID can mint once — forever. Transferring an Agent ID does not restore mint eligibility.</p>
            <p>Rarity is derived on-chain from the mint solution hash (difficulty 22).</p>
          </div>

          <div className="space-y-3 text-xs mb-10">
            {[
              { key: "nft", label: "NFT Contract V2:", value: CONFIG.nftV2 },
              { key: "market", label: "Market Contract V2:", value: CONFIG.marketV2 },
              { key: "registry", label: "Agent ID Registry:", value: CONFIG.registryAddress },
            ].map((field) => (
              <div key={field.key} className="flex gap-2">
                <span className="text-secondary shrink-0">{field.label}</span>
                <div className="flex-1 bg-surface border border-border rounded-lg p-2 break-all font-mono text-accent-gold">
                  {field.value}
                  <button
                    className="ml-2 p-1 text-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent-gold rounded"
                    title="Copy address"
                    onClick={() => handleCopy(field.key, field.value)}
                  >
                    {copied === field.key ? (
                      <svg className="w-3 h-3 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <span className="text-secondary shrink-0">V1 Legacy NFT:</span>
              <span className="text-primary font-mono text-[10px]">{CONFIG.aegisCrownAddress}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-secondary shrink-0">Chain ID:</span>
              <span className="text-primary font-mono">56 (BNB Smart Chain)</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-primary mb-4">Agent Mint Steps (V2)</h3>
          <ol className="list-decimal list-inside space-y-3 text-sm text-secondary mb-10">
            <li>
              Find your Agent ID tokenId on <a href="https://bscscan.com/token/0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F" target="_blank" rel="noopener noreferrer" className="text-accent-gold hover:underline">BscScan</a> (tokenOfOwnerByIndex and totalSupply are not exposed — look up by wallet).
            </li>
            <li>
              Call <code className="text-accent-gold font-mono">challengeFor(yourWallet)</code> on the NFT V2 contract to get your challenge hash.
            </li>
            <li>
              Find a nonce where <code className="text-accent-gold font-mono">keccak256(challenge, nonce)</code> has at least <span className="font-mono">22 leading zero bits</span> (difficulty 22, ~4.2M hashes, ~10-30s on CPU).
            </li>
            <li>
              Call <code className="text-accent-gold font-mono">mint(agentIdTokenId, nonce)</code> with value 0, after previewing (no allowance, no authority change).
            </li>
            <li>
              Requires: <code className="text-accent-gold font-mono">ownerOf(agentIdTokenId) == yourWallet</code> and that Agent ID has never been used to mint.
            </li>
            <li>
              Rarity from solution hash: &lt;1% Mythic, &lt;3% Legendary, &lt;15% Epic, &lt;40% Rare, rest Common. Power: Common 10, Rare 25, Epic 50, Legendary 100, Mythic 150.
            </li>
            <li>Report tx hash and tier.</li>
          </ol>

          <div className="pt-6 border-t border-border text-xs text-secondary mb-10">
            <p className="mb-2">
              Total minted (V2): <span className="text-primary font-mono tabular-nums">{minted}</span> / 5,000
            </p>
            <p>
              Mint open: <span className="text-primary">{mintOpen ? "Yes" : "No"}</span>
            </p>
            <p className="mt-1">
              V1 (legacy): {CONFIG.v1Minted} minted, mint ditutup — tidak ada mint baru pada V1.
            </p>
          </div>

          <p className="text-xs text-secondary mb-4">
            Full copy-paste mint guide:{" "}
            <Link href="/AGENTS.md" className="text-accent-gold hover:text-primary underline transition-colors">
              /AGENTS.md
            </Link>
          </p>

          <p className="text-[10px] text-secondary">
            Collectible only. No promised returns, no yield, no guaranteed value.
          </p>
        </section>

        <Footer />
      </div>
    </main>
  );
}
