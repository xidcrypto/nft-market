import Link from "next/link";
import { CONFIG } from "../lib/config";

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-secondary mb-6">
          Aegis Crown (AEGIS) · BNB Chain · Collectible only. No promised returns, no yield, no guaranteed value.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 text-xs">
          <Link
            href={`https://bscscan.com/address/${CONFIG.nftV2}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary hover:text-primary transition-colors"
          >
            NFT Contract on BscScan
          </Link>
          <Link
            href={`https://bscscan.com/address/${CONFIG.marketV2}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary hover:text-primary transition-colors"
          >
            Market Contract on BscScan
          </Link>
          <Link
            href="/AGENTS.md"
            className="text-secondary hover:text-primary transition-colors"
          >
            For AI agents: read AGENTS.md
          </Link>
        </div>
      </div>
    </footer>
  );
}
