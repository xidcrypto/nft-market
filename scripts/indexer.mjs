#!/usr/bin/env node
/**
 * Aegis Crown Market Indexer
 * Uses view functions only (NO eth_getLogs) to avoid BSC dataseed rate limits.
 * Writes computed stats to public/market-data.json
 * 
 * Deploy block: 130795756 (NFT), 130795766 (Market)
 * NEVER scans from block 0, NEVER uses eth_getLogs on public dataseed.
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MARKET_DATA_PATH = path.resolve(__dirname, "../public/market-data.json");

const CONFIG = {
  chainId: 56,
  rpcUrl: "https://bsc-dataseed.binance.org",
  aegisCrownAddress: "0x61dfF633C8eE31f9811F75809dd9b82152597170",
  aegisMarketAddress: "0x9A2BC2555Bb7B5254595F1bF9Ab7A5CB6D12828b",
  DEPLOY_BLOCK: 130795756,
  MAX_SUPPLY: 5000,
};

const NFT_ABI = [
  "function totalMinted() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
];

const MARKET_ABI = [
  "function listings(uint256 tokenId) external view returns (address seller, uint256 price, bool active)",
];

async function main() {
  console.log("🔄 Starting Aegis Crown Market Indexer (view-function based)...");

  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const nftContract = new ethers.Contract(CONFIG.aegisCrownAddress, NFT_ABI, provider);
  const marketContract = new ethers.Contract(CONFIG.aegisMarketAddress, MARKET_ABI, provider);

  const latestBlock = await provider.getBlockNumber();
  console.log(`📦 Latest block: ${latestBlock}`);

  try {
    // Step 1: Get totalMinted from contract view function
    let totalMinted = 0;
    try {
      const result = await nftContract.totalMinted();
      totalMinted = Number(result);
      console.log(`📈 Total minted: ${totalMinted}`);
    } catch (err) {
      console.warn("⚠️  totalMinted() reverted, iterating ownerOf...");
      for (let i = 1; i <= CONFIG.MAX_SUPPLY; i++) {
        try {
          const owner = await nftContract.ownerOf(i);
          if (owner !== ethers.ZeroAddress) {
            totalMinted = i;
          }
        } catch {
          break;
        }
      }
      console.log(`📈 Total minted (via iteration): ${totalMinted}`);
    }

    // Step 2: Get all active listings by iterating tokenId 1..totalMinted
    const activeListings = [];
    const ownerSet = new Set();
    let floorPrice = null;

    console.log(`📋 Scanning listings for tokenId 1..${totalMinted}...`);
    for (let tokenId = 1; tokenId <= totalMinted; tokenId++) {
      try {
        const [seller, price, active] = await marketContract.listings(tokenId);
        if (active && seller !== ethers.ZeroAddress) {
          const priceBnb = parseFloat(ethers.formatEther(price)).toFixed(4);
          activeListings.push({
            tokenId,
            seller,
            price: price.toString(),
            priceBnb,
            timestamp: Date.now(),
          });
          if (floorPrice === null || parseFloat(priceBnb) < parseFloat(floorPrice)) {
            floorPrice = priceBnb;
          }
        }

        const owner = await nftContract.ownerOf(tokenId);
        if (owner !== ethers.ZeroAddress) {
          ownerSet.add(owner.toLowerCase());
        }
      } catch (err) {
        /* token not listed or error, skip */
      }
    }

    // Sort listings by price ascending
    activeListings.sort((a, b) => parseFloat(a.priceBnb) - parseFloat(b.priceBnb));

    // Step 3: Build output
    const output = {
      updatedAt: new Date().toISOString(),
      blockNumber: latestBlock,
      stats: {
        floorPrice: floorPrice ? ethers.parseUnits(floorPrice, 18).toString() : null,
        floorPriceBnb: floorPrice,
        totalVolume: "0",
        totalVolumeBnb: "0.0000",
        volume24h: "0",
        volume24hBnb: "0.0000",
        volume7d: "0",
        volume7dBnb: "0.0000",
        listedCount: activeListings.length,
        listedPercent: totalMinted > 0 ? ((activeListings.length / totalMinted) * 100).toFixed(2) : "0.00",
        ownersCount: ownerSet.size,
        totalSupplyMinted: totalMinted,
        maxSupply: CONFIG.MAX_SUPPLY,
      },
      listings: activeListings,
      recentSales: [],
      recentActivity: [],
    };

    // Step 4: Write to public/market-data.json ONLY on success
    fs.writeFileSync(MARKET_DATA_PATH, JSON.stringify(output, null, 2));
    console.log(`✅ Written to ${MARKET_DATA_PATH}`);
    console.log(`📊 Floor: ${output.stats.floorPriceBnb ?? "—"} BNB | Listed: ${activeListings.length} | Owners: ${ownerSet.size} | Minted: ${totalMinted}/${CONFIG.MAX_SUPPLY}`);

  } catch (error) {
    console.error("❌ Indexer error:", error.message);
    console.error("   Previous market-data.json kept (not overwritten)");
    process.exit(1);
  }
}

main();
