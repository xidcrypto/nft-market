import Link from "next/link";
import Image from "next/image";
import { Footer } from "../components/footer-component";
import { getTierImage } from "../lib/tier-utils";
import { CONFIG } from "../lib/config";

const TIER_DATA = [
  { tier: 0, name: "Common — Scout", power: 10, supply: 3000 },
  { tier: 1, name: "Rare — Validator", power: 25, supply: 1250 },
  { tier: 2, name: "Epic — Sentinel", power: 50, supply: 600 },
  { tier: 3, name: "Legendary — Genesis", power: 100, supply: 100 },
  { tier: 4, name: "Mythic — Apex", power: 150, supply: 50 },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-primary antialiased pb-[56px] md:pb-0">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 md:space-y-20">

        {/* (a) Title + intro */}
        <section>
          <h1 className="text-2xl font-semibold text-accent-gold mb-4">About Aegis Crown</h1>
          <p className="text-secondary leading-relaxed max-w-2xl">
            Aegis Crown (AEGIS) is a 5,000-piece collectible NFT collection on BNB Chain. It is exclusively available for Binance Agent ID holders, with a strict limit of one per wallet and no cost beyond gas.
          </p>
        </section>

        {/* (b) Tier table */}
        <section>
          <h2 className="text-lg font-semibold text-primary mb-4">Tiers</h2>
          <div className="border border-border divide-y border-border">
            {TIER_DATA.map((t) => (
              <div key={t.tier} className="flex items-center gap-4 px-4 py-3">
                <div className="w-16 h-16 rounded-2xl border border-border overflow-hidden shrink-0 relative">
                  <Image
                    src={getTierImage(t.tier)}
                    alt={`${t.name} tier`}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                    decoding="async"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-secondary">
                    Tier {t.tier} · Power {t.power} · Supply {t.supply}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* (c) How minting works */}
        <section>
          <h2 className="text-lg font-semibold text-primary mb-4">How Minting Works</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-secondary">
            <li>Agent ID gated via registry {CONFIG.registryAddress}</li>
            <li>Call <code className="text-accent-gold font-mono">challengeFor(yourWallet)</code> → find nonce with <code className="text-accent-gold font-mono">keccak256(challenge, nonce)</code> ≥16 leading zero bits</li>
            <li>Call <code className="text-accent-gold font-mono">mint(nonce)</code> with value 0</li>
            <li>Rarity derived on-chain from the solution hash (0–4)</li>
          </ol>
          <p className="text-xs text-secondary mt-4">
            Full copy-paste mint guide:{" "}
            <Link href="/AGENTS.md" className="text-accent-gold hover:text-primary underline">
              /AGENTS.md
            </Link>
          </p>
        </section>

        {/* (d) Market rules */}
        <section>
          <h2 className="text-lg font-semibold text-primary mb-4">Market Rules</h2>
          <ul className="space-y-2 text-sm text-secondary">
            <li>Sell fee: 3% (deducted from seller proceeds on-chain)</li>
            <li>Buyer pays exactly the listed price</li>
            <li>Seller receives 97% of the listed price</li>
            <li>List, cancel, and buy via the AegisMarket contract</li>
          </ul>
        </section>

        {/* (e) Contracts */}
        <section>
          <h2 className="text-lg font-semibold text-primary mb-4">Contracts</h2>
          <div className="space-y-2 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-secondary shrink-0 sm:w-24">NFT:</span>
              <span className="font-mono text-accent-gold break-all">{CONFIG.aegisCrownAddress}</span>
              <Link href={`https://bscscan.com/address/${CONFIG.aegisCrownAddress}`} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary underline text-xs">
                BscScan
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-secondary shrink-0 sm:w-24">Market:</span>
              <span className="font-mono text-accent-gold break-all">{CONFIG.aegisMarketAddress}</span>
              <Link href={`https://bscscan.com/address/${CONFIG.aegisMarketAddress}`} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary underline text-xs">
                BscScan
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-secondary shrink-0 sm:w-24">Registry:</span>
              <span className="font-mono text-accent-gold break-all">{CONFIG.registryAddress}</span>
              <Link href={`https://bscscan.com/address/${CONFIG.registryAddress}`} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary underline text-xs">
                BscScan
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-secondary shrink-0 sm:w-24">Chain ID:</span>
              <span className="font-mono text-primary">56</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-secondary shrink-0 sm:w-24">MAX_SUPPLY:</span>
              <span className="font-mono text-primary">5000</span>
            </div>
          </div>
        </section>

        {/* (f) FAQ */}
        <section>
          <h2 className="text-lg font-semibold text-primary mb-4">FAQ</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-primary font-medium">Do I need a browser wallet to mint?</p>
              <p className="text-secondary mt-1">No — minting is for AI agents via contract call, not a Connect Wallet button.</p>
            </div>
            <div>
              <p className="text-primary font-medium">Is there a promised return, yield, or token airdrop?</p>
              <p className="text-secondary mt-1">No.</p>
            </div>
          </div>
        </section>

        {/* (g) Disclaimer */}
        <section className="pt-4 border-t border-border">
          <p className="text-xs text-secondary">
            Collectible only. No promised returns, no yield, no guaranteed value.
          </p>
        </section>

        <Footer />
      </div>
    </main>
  );
}
