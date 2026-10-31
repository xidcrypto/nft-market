# Aegis Crown (AEGIS) NFT Collection

A minimal, static website for the Aegis Crown NFT project on BNB Chain (chainId 56).

## Overview

- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + ethers v6
- **Features:**
  - Static export for Vercel
  - Indexer script for reading contract events
  - Minimal, museum-wall UI (no gradients, no animations, no clutter)

## Pages

### Homepage (/)
- Stats strip: Floor, Total Volume, 24h Volume, Listed, Minted
- Hero: "Aegis Crown" + one-sentence description
- Tier gallery: 5-row list (Common → Mythic) with expandable accordion
- Mint for AI Agents panel: copyable contract data + step guide
- Footer: BscScan links + IPFS metadata link

### Market Page (/market)
- Same stats strip
- Simple listings table: token image, "Aegis Crown #id — Tier", seller, price, Buy button
- Search by tokenId, sort Price low→high / high→low
- Empty state: "No listings yet."
- Connect EVM Wallet button (labelled "for buying only")

### Mininlist (/mininlist)
- Compact trading interface with same data

## Contracts (BSC chainId 56)
- AegisCrown NFT: `0x61dfF633C8eE31f9811F75809dd9b82152597170`
- AegisMarket: `0x9A2BC2555Bb7B5254595F1bF9Ab7A5CB6D12828b`
- Agent ID registry: `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`
- Creator/fee wallet: `0xD7F96c23Af0e65DC28A14111C994aa48701105D5`
- MAX_SUPPLY: 5000, 1 per wallet, free mint for Agent ID holders
- Sell fee: 3% deducted inside Market contract (buyer pays exactly listed price)
- baseURI: `ipfs://QmQ4oJiRy2GbXSwi2XAUM2T6BYhnC2eEcKE1Vzjm3kQHCB/`

## Tiers (0-based, no tier 5)
| Tier | Name | Power | Supply | Image |
|------|------|-------|--------|-------|
| 0 | Common — Scout | 10 | 3000 | postimg |
| 1 | Rare — Validator | 25 | 1250 | postimg |
| 2 | Epic — Sentinel | 50 | 600 | postimg |
| 3 | Legendary — Genesis | 100 | 100 | postimg |
| 4 | Mythic — Apex | 150 | 50 | postimg |

## Installation & Setup
```bash
npm install
npm run dev
# Run indexer to update market-data.json
node scripts/indexer.mjs
# Build
npm run build
```

## Deploy to Vercel
Project: `aegis-crown`  
Production: `https://aegis-crown.vercel.app`

```bash
vercel --prod
```

## Design Rules
- Palette: Background #0A0A0B, Surface #141416, Border #232326, Text #F5F5F4 / #A1A1AA, Accent gold #C9A227
- One sans family (Inter / system)
- Max width 1080px, centred
- No modals (except wallet connect), no toasts
- Hover: border colour change only

## Disclaimer
"Collectible only. No promised returns, no yield, no guaranteed value." — displayed on every page.

## License
MIT