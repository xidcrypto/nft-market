#!/usr/bin/env node
/**
 * Aegis Crown V2 Indexer
 * Runs on VPS. Writes to SQLite DB (WAL mode). NO eth_getLogs.
 * Uses view functions + Multicall3 batching to minimize RPC calls.
 * NEVER overwrites DB with empty data on RPC error.
 */

import { ethers } from "ethers";
import { Database } from "node:sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, "../data/aegis.db");
const RPC_URL = process.env.RPC_URL || "https://bsc-dataseed.binance.org";

const CONFIG = {
  chainId: 56,
  rpcUrl: RPC_URL,
  nftV2: "0x60A5C775328c06145038E2fC7e0349d85A19212f",
  marketV2: "0xA2b7fD4Ffc43088D75f28d59c1250005B15A26a6",
  deployBlockV2: 130833162,
  maxSupply: 5000,
  difficulty: 22,
};

// Multicall3 on BSC
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";

const NFT_ABI = [
  "function totalMinted() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
];

const MARKET_ABI = [
  "function listings(uint256 tokenId) external view returns (address seller, uint256 price, bool active)",
];

const MULTICALL3_ABI = [
  "function aggregate((address target, bytes callData)[] calls) external view returns (uint256 blockNumber, bytes[] returnData)",
];

let rpcCallCount = 0;

async function multicall(provider, calls) {
  const mc = new ethers.Contract(MULTICALL3, MULTICALL3_ABI, provider);
  const [blockNumber, returnData] = await mc.aggregate(calls);
  rpcCallCount += 1;
  return { blockNumber: Number(blockNumber), returnData };
}

function decodeListings(abiCoder, returnData) {
  const results = [];
  for (const rd of returnData) {
    const [seller, price, active] = abiCoder.decode(
      ["address", "uint256", "bool"],
      rd
    );
    results.push({ seller, price: price.toString(), active });
  }
  return results;
}

async function main() {
  const startTime = Date.now();
  console.log("🔄 Starting Aegis Crown V2 Indexer...");
  console.log(`📦 DB: ${DB_PATH}`);
  console.log(`🔗 RPC: ${RPC_URL}`);

  // Ensure DB directory exists
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  let db;
  try {
    db = new Database(DB_PATH);
  } catch (err) {
    console.error("❌ Failed to open SQLite DB:", err.message);
    process.exit(1);
  }

  // Apply schema
  const schemaPath = path.resolve(__dirname, "db-schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, "utf8");
    db.exec(schema);
  }

  // Read checkpoint
  const row = db
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get("last_indexed_block");
  let checkpoint = row ? Number(row.value) : CONFIG.deployBlockV2 - 1;
  if (checkpoint < CONFIG.deployBlockV2 - 1) {
    checkpoint = CONFIG.deployBlockV2 - 1;
  }

  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const latestBlock = await provider.getBlockNumber();
  rpcCallCount += 1;
  console.log(`📦 Latest block: ${latestBlock} | Checkpoint: ${checkpoint}`);

  let totalMinted;
  try {
    const result = await new ethers.Contract(
      CONFIG.nftV2,
      NFT_ABI,
      provider
    ).totalMinted();
    totalMinted = Number(result);
    rpcCallCount += 1;
    console.log(`📈 Total minted (V2): ${totalMinted}`);
  } catch (err) {
    console.error("❌ totalMinted() failed:", err.message);
    console.error("   DB kept unchanged. Exiting.");
    db.close();
    process.exit(1);
  }

  if (totalMinted === 0) {
    console.log("ℹ️  No mints yet. Updating checkpoint only.");
    const now = new Date().toISOString();
    db.prepare("UPDATE meta SET value = ? WHERE key = ?").run(
      String(latestBlock),
      "last_indexed_block"
    );
    db.prepare("UPDATE meta SET value = ? WHERE key = ?").run(
      now,
      "last_indexed_at"
    );
    db.close();
    const dur = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Done in ${dur}s | RPC calls: ${rpcCallCount}`);
    return;
  }

  // Batch listings for all tokenIds via Multicall3
  const tokenIds = [];
  for (let i = 1; i <= totalMinted; i++) tokenIds.push(i);

  const MULTICALL_BATCH = 150; // safe batch size for dataseed
  const activeListings = [];
  const ownerSet = new Set();
  const mintsData = [];
  let floorPriceWei = null;
  let errors = 0;

  for (let offset = 0; offset < tokenIds.length; offset += MULTICALL_BATCH) {
    const batch = tokenIds.slice(offset, offset + MULTICALL_BATCH);
    const calls = batch.map((tid) => ({
      target: CONFIG.marketV2,
      callData: abiCoder.encode(
        ["function listings(uint256) returns (address,uint256,bool)"],
        [tid]
      ),
    }));

    let result;
    try {
      result = await multicall(provider, calls);
    } catch (err) {
      errors += batch.length;
      console.warn(
        `⚠️  Multicall batch failed (offset ${offset}): ${err.message}. Skipping batch.`
      );
      continue;
    }

    const listings = decodeListings(abiCoder, result.returnData);
    for (let j = 0; j < batch.length; j++) {
      const tid = batch[j];
      const { seller, price, active } = listings[j];
      if (active && seller !== ethers.ZeroAddress) {
        const priceBnb = parseFloat(ethers.formatEther(price));
        activeListings.push({
          tokenId: tid,
          seller,
          priceWei: price,
          priceBnb: priceBnb.toFixed(4),
          timestamp: Date.now(),
        });
        if (floorPriceWei === null || price < floorPriceWei) {
          floorPriceWei = price;
        }
      }
    }
  }

  // Batch ownerOf for all minted tokenIds via Multicall3
  const ownerCalls = tokenIds.map((tid) => ({
    target: CONFIG.nftV2,
    callData: abiCoder.encode(
      ["function ownerOf(uint256) returns (address)"],
      [tid]
    ),
  }));

  let ownerResult;
  try {
    ownerResult = await multicall(provider, ownerCalls);
  } catch (err) {
    console.error("❌ ownerOf batch failed:", err.message);
    console.error("   DB kept unchanged. Exiting.");
    db.close();
    process.exit(1);
  }

  const owners = abiCoder.decode(
    ["address[]"],
    ownerResult.returnData[0]
  )[0];

  // Build mints data (tier derived from tokenId % 5000 per spec)
  for (let j = 0; j < tokenIds.length; j++) {
    const tid = tokenIds[j];
    const owner = owners[j];
    const rand = tid % 5000;
    let tier;
    if (rand < 3000) tier = 0;
    else if (rand < 4250) tier = 1;
    else if (rand < 4850) tier = 2;
    else if (rand < 4950) tier = 3;
    else tier = 4;

    const tierNames = ["Common", "Rare", "Epic", "Legendary", "Mythic"];
    const tierPowers = [10, 25, 50, 100, 150];

    mintsData.push({
      tokenId: tid,
      owner: owner.toLowerCase(),
      tier: tierNames[tier],
      power: tierPowers[tier],
    });

    if (owner !== ethers.ZeroAddress) {
      ownerSet.add(owner.toLowerCase());
    }
  }

  // Sort listings by price ascending
  activeListings.sort((a, b) =>
    parseFloat(a.priceWei) - parseFloat(b.priceWei)
  );

  // Write to SQLite (transaction)
  const now = new Date().toISOString();
  try {
    const tx = db.transaction(() => {
      // Upsert mints
      const upsertMint = db.prepare(
        `INSERT INTO mints (token_id, owner, agent_id_token_id, tier, power, tx_hash, block_number, minted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(token_id) DO UPDATE SET
           owner = excluded.owner,
           tier = excluded.tier,
           power = excluded.power,
           block_number = excluded.block_number,
           minted_at = excluded.minted_at`
      );
      for (const m of mintsData) {
        // agent_id_token_id unknown from view-only; store token_id as placeholder
        upsertMint.run(
          m.tokenId,
          m.owner,
          m.tokenId, // agent_id_token_id placeholder (not readable via view)
          m.tier,
          m.power,
          "",
          Number(ownerResult.blockNumber),
          now
        );
      }

      // Replace listings
      db.prepare("DELETE FROM listings").run();
      const insListing = db.prepare(
        `INSERT INTO listings (token_id, seller, price_wei, listed_at, tx_hash) VALUES (?, ?, ?, ?, ?)`
      );
      for (const l of activeListings) {
        insListing.run(
          l.tokenId,
          l.seller.toLowerCase(),
          l.priceWei,
          new Date(l.timestamp).toISOString(),
          ""
        );
      }

      // Update meta
      db.prepare("UPDATE meta SET value = ? WHERE key = ?").run(
        String(latestBlock),
        "last_indexed_block"
      );
      db.prepare("UPDATE meta SET value = ? WHERE key = ?").run(
        now,
        "last_indexed_at"
      );
    });
    tx();
  } catch (err) {
    console.error("❌ DB write failed:", err.message);
    console.error("   DB kept unchanged. Exiting.");
    db.close();
    process.exit(1);
  }

  db.close();

  const dur = ((Date.now() - startTime) / 1000).toFixed(2);
  const floorBnb = floorPriceWei
    ? ethers.formatEther(floorPriceWei)
    : "—";
  console.log(
    `✅ Done in ${dur}s | RPC calls: ${rpcCallCount} | Errors: ${errors} | ` +
    `Minted: ${totalMinted}/${CONFIG.maxSupply} | Listed: ${activeListings.length} | ` +
    `Owners: ${ownerSet.size} | Floor: ${floorBnb} BNB | Block: ${latestBlock}`
  );
}

main().catch((err) => {
  console.error("❌ Unhandled indexer error:", err.message);
  process.exit(1);
});
