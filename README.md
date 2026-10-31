# Aegis Crown (AEGIS) NFT Collection - Static Website

A static, no-backend website for the Aegis Crown NFT project on BNB Chain (chainId 56), featuring a collection marketplace with Element.market-style UI.

## Overview

- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + ethers v6
- **Features:** 
  - Static export ready for Vercel free tier
  - Mock-first development with live fallback
  - Indexer script for reading contract events
  - Element.market-style collection marketplace
  - Binance Agentic Wallet integration (MetaMask fallback)

## Pages

### Mint Page (/)
- Connect wallet button (Binance Agentic Wallet with MetaMask fallback)
- Display: totalMinted / 5,000, Agent ID balance, hasMinted status
- Challenge flow: show challengeFor(), mine nonce, call mint(nonce)
- Show tokenId and tier after mint

### Market Page (/market)
- **Stats Bar:** Floor price, Total Volume, 24h/7d Volume, Listed %, Owners, Total Minted
- **Listings Grid:** Sort by Price/Price (desc)/Newest/Rarity, filter by tier, search tokenId
- **Activity Tab:** Recent sales, recent listings/cancels (up to 50 entries)
- Each listing card: tier image, tokenId, tier name + Power, price in BNB, seller address
- Existing buy/list/cancel flows with preview before signing

## Key Features

### Element.market-Style Collection UI
- **Header Stats:** Real-time statistics from on-chain contract events
- **Filter & Sort:** Price (low→high, high→low), Newest, Rarity (Mythic→Common)
- **Tier Filter:** All, Mythic, Legendary, Epic, Rare, Common
- **Activity History:** Recent sales and listings/cancels in a combined timeline

### Indexer Script (scripts/indexer.mjs)
An automatic indexer that reads blockchain events and writes static data:

1. **Listed Events:** New NFT listings (seller, price, timestamp)
2. **Bought Events:** Completed sales (buyer, price, fee, timestamp)
3. **Cancelled Events:** Listing cancellations (seller, tokenId)
4. **Transfer Events:** NFT ownership changes (for owners count)

**Features:**
- Reads events via public BSC RPC (no backend required)
- Computes: floor price, volumes (24h, 7d, total), listed %, owners, total minted
- Writes to `public/market-data.json` (overwrites each run)
- Graceful fallback when indexer has not run

### Wallet Integration
- **Primary:** Binance Agentic Wallet (app connection flow)
- **Fallback:** MetaMask (standard web3 integration)
- Two-step transaction signing: preview → user confirmation in Binance App
- Agent ID check for minting (on-chain requirement)

### Rarity System
5 tiers with unique traits and images:
- **Common (Scout)**: 3,000 (60%), Power 10, Item None
- **Rare (Validator)**: 1,250 (25%), Power 25, Item Tiny Gem
- **Epic (Sentinel)**: 600 (12%), Power 50, Item Tiny Sparkle
- **Legendary (Genesis)**: 100 (2%), Power 100, Item Red Crystal Crown
- **Mythic (Apex)**: 50 (1%), Power 150, Item Red Crystal Crown + Tiny Star

## Installation & Setup

### Prerequisites
```bash
# Required tools
Node.js (>= 18) + npm
Vercel CLI (optional)
```

### Setup Steps
```bash
# Clone repository
# Navigate to project root

# Install dependencies
npm install

# Create .env.local (optional) with contract addresses:
# AEGIS_CROWN_ADDRESS=0x...
# AEGIS_MARKET_ADDRESS=0x...

# Local development
npm run dev
# Opens on http://localhost:3000

# Build for production
npm run build
# Generates static export in out/ directory

# Run indexer (after contracts deployed)
node scripts/indexer.mjs
```

## Deploy to Vercel

### Method A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

### Method B: Vercel Dashboard
1. Push code to a GitHub repository
2. Go to vercel.com and import the repository
3. Select Next.js framework
4No additional configuration required (uses next.config.ts static export)

## Config File to Fill After Deployment

Edit `app/lib/config.ts` to set your deployed contract addresses:

```typescript
export const CONFIG = {
  chainId: 56,
  rpcUrl: "https://bsc-dataseed.binance.org",
  explorerUrl: "https://bscscan.com",
  registryAddress: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  aegisCrownAddress: "0xYOUR_CONTRACT_ADDRESS_HERE",  // Replace with deployed NFT contract
  aegisMarketAddress: "0xYOUR_CONTRACT_ADDRESS_HERE", // Replace with deployed Marketplace contract
  creatorWallet: "0xYOUR_CREATOR_WALLET_ADDRESS",       // Replace with creator wallet
  maxSupply: 5000,
  royaltyPercent: 3,
  baseUri: "ipfs://QmQ4oJiRy2GbXSwi2XAUM2T6BYhnC2eEcKE1Vzjm3kQHCB/",
  // ... other config
};
```

**Indexer will automatically pick up new contract addresses on next run.**

## Indexer Refresh

Run the indexer after contract deployment and whenever you want to update market data:

```bash
# Refresh market data (updates public/market-data.json)
node scripts/indexer.mjs
```

**The page will show "Data updated: [timestamp]" and use the latest data.**

If the indexer fails or returns empty results, the page falls back to live reads from the contracts.

## Build Artifacts

The build produces:
- Static HTML/CSS/JS files (optimized for performance)
- images/: Tier SVG images (placeholder graphics)
- metadata/: JSON metadata files for each tier
- out/: Vercel-compatible static export directory

## Design

### Visual Style
- **Dark theme** with gold + red crystal accents
- **Hero uses the Legendary image** (golden robot agent with red crystal crown)
- **Rarity cards use their tier image** (no stock photos)
- **Mobile responsive** with responsive design
- **Load time under 3 seconds** on normal connections

### Components
- **Header:** Site title + navigation
- **Stats bar:** Key metrics at the top of the market page
- **Listing cards:** Tier image, token info, price, seller
- **Activity table:** Recent transactions and events
- **Filter panel:** Sort and filter controls

## Key Rules

### For Development
- Never invent contract addresses, prices, or launch dates
- Use placeholders in config.ts until contracts are deployed
- Mock-first for new UI features (stats, filters, activity)
- Always fall back to live reads when indexer data is unavailable

### For Users
- All UI copy and metadata descriptions are in ENGLISH
- Disclaimer: "Collectible only. No promised returns, no yield, no guaranteed value." (displayed on both pages)
- No personal agent names, handles, or wallets displayed anywhere
- Creator only referred to as "Aegis Crown" / "the creator wallet"

## File Structure

```
/app/
├── layout.tsx                    # Root layout with Header component
├── page.tsx                      # Mint page
├── market/                       # Market page with Element.market features
│   └── page.tsx
├── components/
│   ├── header-component.tsx      # Navigation header
│   └── wallet-component.tsx      # Wallet connection hook
├── lib/                           # Shared code
│   ├── config.ts                 # Contract addresses (fill after deployment)
│   ├── contracts.ts             # Contract ABIs and services
│   ├── tier-utils.ts            # Rarity utilities
│   └── types.ts                # TypeScript interfaces
├── metadata/                     # NFT metadata files
│   ├── common.json
│   ├── rare.json
│   │   ... and so on
│
├── public/
│   ├── images/                 # Tier placeholder images
│   │   ├── common.svg
│   │   ├── rare.svg
│   │   └── ...
│   └── market-data.json         # Indexer output (read-only)
├── next.config.ts               # Static export configuration
└── scripts/                     # Indexer script
    └── indexer.mjs            # Read blockchain events
```

## API Endpoints

The static site uses `fetch()` for all client-side data requests:

- **Market data:** Reads from `/market-data.json` (via relative path)
- **Contract calls:** Via ethers v6 with public BSC RPC
- **Wallet connection:** Uses standard Web3 provider interfaces

## Testing

### Local Development
```bash
# Run dev server
npm run dev
# Open http://localhost:3000

# Test indexer
node scripts/indexer.mjs

# Check static build
npm run build
ls out/
```

### Build Validation
```bash
# Ensure no TypeScript errors
npm run build

# Verify static export
ls out/ | grep -E "^(index|market|api)" | head -10
```

## Frequently Asked Questions

### Q: Can I use this on mobile?
A: Yes! The site is fully responsive and optimized for mobile devices.

### Q: Does it work with Binance Wallet?
A: Yes, Binance Agentic Wallet is the primary integration. MetaMask is also supported as fallback.

### Q creating on-chain activity
A: Use the indexer script `node scripts/indexer.mjs` to update the market data after new events occur.

### Q: What happens if the indexer fails?
A: The page gracefully falls back to live reads from the contracts, with clear "Data stale" notification.

## License

Distributed under the terms of the MIT License.

## Credits

- Aegis Crown project team
- Next.js contributors
- Tailwind CSS community
- ethers v6 team
- All NFT artists and metadata creators
