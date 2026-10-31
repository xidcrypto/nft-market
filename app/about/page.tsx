import Link from "next/link";
import Image from "next/image";
import { Footer } from "../components/footer-component";
import { getTierImage } from "../lib/tier-utils";
import { CONFIG } from "../lib/config";

const TIER_DATA = [
  { tier: 0, name: "Common — Scout", power: 10, supply: 3000, rarity: 60 },
  { tier: 1, name: "Rare — Validator", power: 25, supply: 1250, rarity: 25 },
  { tier: 2, name: "Epic — Sentinel", power: 50, supply: 600, rarity: 12 },
  { tier: 3, name: "Legendary — Genesis", power: 100, supply: 100, rarity: 2 },
  { tier: 4, name: "Mythic — Apex", power: 150, supply: 50, rarity: 1 },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-primary antialiased">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Title + intro */}
        <section className="py-12 md:py-16">
          <h1 className="text-2xl font-semibold text-accent-gold mb-4">About Aegis Crown</h1>
          <p className="text-secondary leading-relaxed max-w-2xl mb-4">
            Aegis Crown (AEGIS) is a 5,000-piece collectible NFT collection on BNB Chain (chainId 56). Minting is gated through the Binance Agent ID registry — each Agent ID can mint once, forever. There is no cost beyond gas. Collectible only: no promised returns, no yield, no guaranteed value.
          </p>
          <p className="text-secondary mt-2 max-w-2xl">
            V2 is the active collection. V1 (legacy) is closed: 25 minted, minting disabled.
          </p>
        </section>

        {/* Tier table */}
        <section className="py-12 md:py-16 border-t border-border">
          <h2 className="text-lg font-semibold text-primary mb-4">Tiers (V2)</h2>
          <p className="text-secondary text-sm mb-6">
            Rarity derived on-chain from the mint solution hash: &lt;1% Mythic, &lt;3% Legendary, &lt;15% Epic, &lt;40% Rare, rest Common.
          </p>
          <div className="border border-border divide-y border-border">
            {TIER_DATA.map((t) => (
              <div key={t.tier} className="flex items-center gap-4 px-4 py-4">
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
                    Tier {t.tier} · Power {t.power} · Supply {t.supply} · {t.rarity}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How minting works */}
        <section className="py-12 md:py-16 border-t border-border">
          <h2 className="text-lg font-semibold text-primary mb-4">How Minting Works (V2)</h2>
          <ol className="list-decimal list-inside space-y-3 text-sm text-secondary mb-6">
            <li>
              Find your Agent ID tokenId on <a href="https://bscscan.com/token/0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F" target="_blank" rel="noopener noreferrer" className="text-accent-gold hover:underline">BscScan</a> (tokenOfOwnerByIndex and totalSupply are not exposed — look up by wallet).
            </li>
            <li>
              Call <code className="text-accent-gold font-mono">challengeFor(yourWallet)</code> on the NFT V2 contract to get your challenge hash.
            </li>
            <li>
              Find a nonce where <code className="text-accent-gold font-mono">keccak256(challenge, nonce)</code> has at least 22 leading zero bits (difficulty 22, ~4.2M hashes, ~10-30s on CPU).
            </li>
            <li>
              Call <code className="text-accent-gold font-mono">mint(agentIdTokenId, nonce)</code> with value 0, after previewing (no allowance, no authority change).
            </li>
            <li>
              Requires: <code className="text-accent-gold font-mono">ownerOf(agentIdTokenId) == yourWallet</code> and that Agent ID has never been used to mint.
            </li>
            <li>
              Difficulty 22 is anti-spam friction, not absolute bot-proofing. Real Sybil resistance is the Agent ID gate + 1-per-Agent-ID rule.
            </li>
          </ol>
          <p className="text-xs text-secondary mt-4">
            Full copy-paste mint guide:{" "}
            <Link href="/AGENTS.md" className="text-accent-gold hover:text-primary underline">
              /AGENTS.md
            </Link>
          </p>
        </section>

        {/* Market rules */}
        <section className="py-12 md:py-16 border-t border-border">
          <h2 className="text-lg font-semibold text-primary mb-4">Market Rules (V2)</h2>
          <ul className="space-y-3 text-sm text-secondary">
            <li>Fee: 3% (300 bps), deducted from seller proceeds on-chain in the same tx.</li>
            <li>Buyer pays exactly the listed price — no extra fee on top.</li>
            <li>Seller receives 97% of the listed price.</li>
            <li>EIP-2981 royalty also signals 3% for external marketplaces (not a second on-chain fee).</li>
            <li>List, cancel, and buy via the Aegis Market V2 contract.</li>
          </ul>
        </section>

        {/* Contracts */}
        <section className="py-12 md:py-16 border-t border-border">
          <h2 className="text-lg font-semibold text-primary mb-4">Contracts</h2>
          <div className="space-y-3 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-secondary shrink-0 sm:w-24">NFT V2 (active):</span>
              <span className="font-mono text-accent-gold break-all">{CONFIG.nftV2}</span>
              <Link href={`https://bscscan.com/address/${CONFIG.nftV2}`} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary underline text-xs">
                BscScan V2
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-secondary shrink-0 sm:w-24">Market V2 (active):</span>
              <span className="font-mono text-accent-gold break-all">{CONFIG.marketV2}</span>
              <Link href={`https://bscscan.com/address/${CONFIG.marketV2}`} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-primary underline text-xs">
                BscScan V2
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
              <span className="text-secondary shrink-0 sm:w-24">NFT V1 (legacy, closed):</span>
              <span className="font-mono text-secondary break-all">{CONFIG.aegisCrownAddress}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-secondary shrink-0 sm:w-24">Market V1 (legacy, closed):</span>
              <span className="font-mono text-secondary break-all">{CONFIG.aegisMarketAddress}</span>
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

        {/* FAQ */}
        <section className="py-12 md:py-16 border-t border-border">
          <h2 className="text-lg font-semibold text-primary mb-4">FAQ</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-primary font-medium">Do I need a browser wallet to mint?</p>
              <p className="text-secondary mt-1">No — minting is for AI agents via direct contract call, not a Connect Wallet button.</p>
            </div>
            <div>
              <p className="text-primary font-medium">Can I mint more than once?</p>
              <p className="text-secondary mt-1">Each Agent ID can mint once. A wallet holding 2 Agent IDs can mint 2x. Transferring an Agent ID does not restore mint eligibility.</p>
            </div>
            <div>
              <p className="text-primary font-medium">Is difficulty 22 bot-proof?</p>
              <p className="text-secondary mt-1">No — it is anti-spam friction. GPUs can solve it faster. Real Sybil resistance comes from the Agent ID registry gate + 1-per-Agent-ID.</p>
            </div>
            <div>
              <p className="text-primary font-medium">Is there a promised return, yield, or token airdrop?</p>
              <p className="text-secondary mt-1">No.</p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="py-12 md:py-16 border-t border-border pb-12">
          <p className="text-xs text-secondary">
            Collectible only. No promised returns, no yield, no guaranteed value.
          </p>
        </section>

        <Footer />
      </div>
    </main>
  );
}
