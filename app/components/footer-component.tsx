import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-secondary mb-4">
          Aegis Crown (AEGIS) · BNB Chain · Collectible only. No promised returns, no yield, no guaranteed value.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-6 text-xs">
          <Link
            href="https://bscscan.com/address/0x61dfF633C8eE31f9811F75809dd9b82152597170"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary hover:text-primary transition-colors"
          >
            AegisCrown on BscScan
          </Link>
          <Link
            href="https://bscscan.com/address/0x9A2BC2555Bb7B5254595F1bF9Ab7A5CB6D12828b"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary hover:text-primary transition-colors"
          >
            AegisMarket on BscScan
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
