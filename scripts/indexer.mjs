#!/usr/bin/env node
/**
 * Aegis Crown Market Indexer
 * Reads Listed/Bought/Cancelled events from Aegis Market contract
 * and Transfer events from Aegis Crown contract.
 * Writes computed stats to public/market-data.json
 * 
 * Usage: node scripts/indexer.mjs
 * 
 * Requires in app/lib/config.ts (or env vars):
 * - aegisCrownAddress
 * - aegisMarketAddress
 * - chainId (56 for BSC)
 * - rpcUrl
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
};

const AEGIS_CROWN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

const AEGIS_MARKET_ABI = [
  "event Listed(uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event Bought(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 fee)",
  "event Cancelled(uint256 indexed tokenId, address indexed seller)",
];

async function main() {
  console.log("🔄 Starting Aegis Crown Market Indexer...");

  // Check if contract addresses are configured
  if (
    CONFIG.aegisCrownAddress === "0x0000000000000000000000000000000000000000" ||
    CONFIG.aegisMarketAddress === "0x0000000000000000000000000000000000000000"
  ) {
    console.warn("⚠️  Contract addresses not configured in config.ts or env vars.");
    console.warn("   Writing empty market-data.json with zeros...");
    writeEmptyOutput();
    return;
  }

  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const crownContract = new ethers.Contract(CONFIG.aegisCrownAddress, AEGIS_CROWN_ABI, provider);
  const marketContract = new ethers.Contract(CONFIG.aegisMarketAddress, AEGIS_MARKET_ABI, provider);

  // Get deployment block (for production, you'd know this; for now scan from 0 or recent)
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = 0; // In production, use deployment block

  console.log(`📦 Scanning blocks ${fromBlock} to ${latestBlock}...`);

  try {
    // Fetch all events in parallel
    const [listedEvents, boughtEvents, cancelledEvents, transferEvents] = await Promise.all([
      marketContract.queryFilter("Listed", fromBlock, latestBlock),
      marketContract.queryFilter("Bought", fromBlock, latestBlock),
      marketContract.queryFilter("Cancelled", fromBlock, latestBlock),
      crownContract.queryFilter("Transfer", fromBlock, latestBlock),
    ]);

    console.log(`📊 Found: ${listedEvents.length} Listed, ${boughtEvents.length} Bought, ${cancelledEvents.length} Cancelled, ${transferEvents.length} Transfers`);

    // Process events
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;

    // Active listings: listed but not cancelled/bought
    const listedMap = new Map();
    const cancelledSet = new Set();
    const boughtSet = new Set();

    for (const evt of listedEvents) {
      const tokenId = evt.args.tokenId.toString();
      listedMap.set(tokenId, {
        tokenId: Number(tokenId),
        seller: evt.args.seller,
        price: evt.args.price.toString(),
        blockNumber: evt.blockNumber,
        txHash: evt.transactionHash,
        timestamp: 0, // will fill below
      });
    }

    for (const evt of cancelledEvents) {
      const tokenId = evt.args.tokenId.toString();
      cancelledSet.add(tokenId);
      listedMap.delete(tokenId);
    }

    const blockNumbersForBought = [...new Set(boughtEvents.map(e => e.blockNumber))];
    const boughtBlockTimestamps = new Map();
    for (const blockNum of blockNumbersForBought) {
      const block = await provider.getBlock(blockNum);
      if (block) boughtBlockTimestamps.set(blockNum, block.timestamp * 1000);
    }

    for (const evt of boughtEvents) {
      const tokenId = evt.args.tokenId.toString();
      boughtSet.add(tokenId);
      listedMap.delete(tokenId);

      const price = evt.args.price;
      const fee = evt.args.fee;
      const total = price + fee;
      totalVolume += total;

      const timestamp = boughtBlockTimestamps.get(evt.blockNumber) || now;
      if (now - timestamp <= dayMs) volume24h += total;
      if (now - timestamp <= weekMs) volume7d += total;

      recentSales.push({
        tokenId: Number(tokenId),
        price: price.toString(),
        fee: fee.toString(),
        buyer: evt.args.buyer,
        seller: evt.args.seller,
        timestamp,
        txHash: evt.transactionHash,
      });
    }

    // Fill timestamps for active listings
    const listingBlocks = [...new Set([...listedMap.values()].map(l => l.blockNumber))];
    const blockTimestamps = new Map();
    for (const blockNum of listingBlocks) {
      const block = await provider.getBlock(blockNum);
      if (block) blockTimestamps.set(blockNum, block.timestamp * 1000);
    }
    for (const listing of listedMap.values()) {
      listing.timestamp = blockTimestamps.get(listing.blockNumber) || now;
    }

    const activeListings = [...listedMap.values()].sort((a, b) => a.price.localeCompare(b.price));

    // Floor price
    const floorPrice = activeListings.length > 0 ? activeListings[0].price : "0";

    // Total volume from Bought events
    let totalVolume = 0n;
    let volume24h = 0n;
    let volume7d = 0n;

    const recentSales = [];

    // Sort sales newest first
    recentSales.sort((a, b) => b.timestamp - a.timestamp);

    // Recent activity (listings + cancels + sales)
    const recentActivity = [];

    for (const evt of listedEvents) {
      const timestamp = blockTimestamps.get(evt.blockNumber) || now;
      recentActivity.push({
        type: "listed",
        tokenId: Number(evt.args.tokenId),
        price: evt.args.price.toString(),
        user: evt.args.seller,
        timestamp,
        txHash: evt.transactionHash,
      });
    }

    for (const evt of cancelledEvents) {
      const block = await provider.getBlock(evt.blockNumber);
      const timestamp = block ? block.timestamp * 1000 : now;
      recentActivity.push({
        type: "cancelled",
        tokenId: Number(evt.args.tokenId),
        user: evt.args.seller,
        timestamp,
        txHash: evt.transactionHash,
      });
    }

    for (const sale of recentSales) {
      recentActivity.push({
        type: "bought",
        tokenId: sale.tokenId,
        price: sale.price,
        buyer: sale.buyer,
        seller: sale.seller,
        timestamp: sale.timestamp,
        txHash: sale.txHash,
      });
    }

    recentActivity.sort((a, b) => b.timestamp - a.timestamp);
    const recentActivityTop50 = recentActivity.slice(0, 50);

    // Owners count from Transfer events
    const ownerBalances = new Map();
    for (const evt of transferEvents) {
      const from = evt.args.from;
      const to = evt.args.to;
      const tokenId = evt.args.tokenId.toString();

      if (from !== ethers.ZeroAddress) {
        const fromTokens = ownerBalances.get(from) || new Set();
        fromTokens.delete(tokenId);
        ownerBalances.set(from, fromTokens);
      }
      if (to !== ethers.ZeroAddress) {
        const toTokens = ownerBalances.get(to) || new Set();
        toTokens.add(tokenId);
        ownerBalances.set(to, toTokens);
      }
    }

    let ownersCount = 0;
    for (const tokens of ownerBalances.values()) {
      if (tokens.size > 0) ownersCount++;
    }

    // Total supply minted
    const totalMinted = ownerBalances.get(ethers.ZeroAddress)?.size || 0;
    // Actually, total minted is transfers FROM zero address
    let totalSupplyMinted = 0;
    for (const evt of transferEvents) {
      if (evt.args.from === ethers.ZeroAddress) totalSupplyMinted++;
    }

    // Listed count and percentage
    const listedCount = activeListings.length;
    const listedPercent = ((listedCount / 5000) * 100).toFixed(2);

    // Format output
    const output = {
      updatedAt: new Date().toISOString(),
      blockNumber: latestBlock,
      stats: {
        floorPrice: floorPrice,
        floorPriceBnb: parseFloat(ethers.formatEther(floorPrice)).toFixed(4),
        totalVolume: totalVolume.toString(),
        totalVolumeBnb: parseFloat(ethers.formatEther(totalVolume)).toFixed(4),
        volume24h: volume24h.toString(),
        volume24hBnb: parseFloat(ethers.formatEther(volume24h)).toFixed(4),
        volume7d: volume7d.toString(),
        volume7dBnb: parseFloat(ethers.formatEther(volume7d)).toFixed(4),
        listedCount,
        listedPercent: parseFloat(listedPercent),
        ownersCount,
        totalSupplyMinted,
        maxSupply: 5000,
      },
      listings: activeListings.map(l => ({
        tokenId: l.tokenId,
        seller: l.seller,
        price: l.price,
        priceBnb: parseFloat(ethers.formatEther(l.price)).toFixed(4),
        timestamp: l.timestamp,
      })),
      recentSales: recentSales.slice(0, 50).map(s => ({
        tokenId: s.tokenId,
        price: s.price,
        priceBnb: parseFloat(ethers.formatEther(s.price)).toFixed(4),
        buyer: s.buyer,
        seller: s.seller,
        timestamp: s.timestamp,
        timeAgo: formatTimeAgo(s.timestamp),
      })),
      recentActivity: recentActivityTop50.map(a => ({
        type: a.type,
        tokenId: a.tokenId,
        price: a.price ? a.price : undefined,
        priceBnb: a.price ? parseFloat(ethers.formatEther(a.price)).toFixed(4) : undefined,
        user: a.user,
        buyer: a.buyer,
        seller: a.seller,
        timestamp: a.timestamp,
        timeAgo: formatTimeAgo(a.timestamp),
      })),
    };

    // Write to public/market-data.json
    const outPath = MARKET_DATA_PATH;
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`✅ Written to ${outPath}`);
    console.log(`📈 Floor: ${output.stats.floorPriceBnb} BNB | Volume: ${output.stats.totalVolumeBnb} BNB | Listed: ${listedCount} | Owners: ${ownersCount} | Minted: ${totalSupplyMinted}/5000`);

  } catch (error) {
    console.error("❌ Indexer error:", error);
    writeEmptyOutput();
  }
}

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function writeEmptyOutput() {
  const output = {
    updatedAt: new Date().toISOString(),
    blockNumber: 0,
    stats: {
      floorPrice: "0",
      floorPriceBnb: "0",
      totalVolume: "0",
      totalVolumeBnb: "0",
      volume24h: "0",
      volume24hBnb: "0",
      volume7d: "0",
      volume7dBnb: "0",
      listedCount: 0,
      listedPercent: 0,
      ownersCount: 0,
      totalSupplyMinted: 0,
      maxSupply: 5000,
    },
    listings: [],
    recentSales: [],
    recentActivity: [],
  };
  const outPath = path.resolve("/root/nft/public/market-data.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`✅ Written empty data to ${outPath}`);
}

main();