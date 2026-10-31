#!/usr/bin/env node
/**
 * Aegis Crown V2 API Server (optimized)
 * Runs on VPS at localhost:3001, reverse-proxied by nginx.
 * Read-only: GET endpoints only. No public write endpoints.
 * SQLite (WAL mode) is the single source of truth.
 * Optimizations: bounded LRU cache, single-flight, prepared statements,
 * DB pragmas, graceful overload mode, in-memory rate limiter.
 */

import { Database } from "node:sqlite";
import { createServer } from "node:http";
import { parse } from "node:url";
import zlib from "node:zlib";

const DB_PATH = process.env.DB_PATH || "/root/nft/data/aegis.db";
const API_PORT = Number(process.env.API_PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://aegis-crown.vercel.app";

// Cache TTL (seconds -> ms)
const CACHE_TTL_STATS = 30 * 1000;
const CACHE_TTL_LIST = 30 * 1000;
const MAX_CACHE_KEYS = 500;

// Rate limit: 100 req/min per IP for general API
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 100;

// Global overload: if total req/min > 2000, bump cache TTL to 60s
const OVERLOAD_THRESHOLD = 2000;
let overloadMode = false;
let reqCounter = 0;
let reqCounterResetAt = Date.now() + RATE_LIMIT_WINDOW;

let db;
const prepared = new Map(); // statement cache
const rateLimit = new Map(); // ip -> { count, resetAt }

// Bounded LRU cache: key -> { data, expiresAt, order }
const cache = new Map();
let cacheOrder = []; // LRU order (oldest first)

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key);
    cacheOrder = cacheOrder.filter((k) => k !== key);
    return null;
  }
  // Move to end (most recently used)
  cacheOrder = cacheOrder.filter((k) => k !== key);
  cacheOrder.push(key);
  return entry.data;
}

function cacheSet(key, data, ttlMs) {
  // Evict if at capacity
  while (cache.size >= MAX_CACHE_KEYS && cacheOrder.length > 0) {
    const oldest = cacheOrder.shift();
    cache.delete(oldest);
  }
  const entry = { data, expiresAt: Date.now() + ttlMs };
  cache.set(key, entry);
  cacheOrder.push(key);
  return data;
}

function getCacheTTL(baseTtl) {
  return overloadMode ? 60 * 1000 : baseTtl;
}

// Single-flight: key -> Promise
const singleFlight = new Map();

async function getCached(key, ttlMs, fetcher) {
  const cached = cacheGet(key);
  if (cached !== null) return { data: cached, fromCache: true };

  const pending = singleFlight.get(key);
  if (pending) return { data: await pending, fromCache: true };

  const promise = (async () => {
    try {
      const data = await fetcher();
      cacheSet(key, data, ttlMs);
      return data;
    } finally {
      singleFlight.delete(key);
    }
  })();
  singleFlight.set(key, promise);
  return { data: await promise, fromCache: false };
}

function rateLimitCheck(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

function trackRequest() {
  const now = Date.now();
  if (now > reqCounterResetAt) {
    reqCounter = 1;
    reqCounterResetAt = now + RATE_LIMIT_WINDOW;
    overloadMode = false;
  } else {
    reqCounter += 1;
    if (reqCounter > OVERLOAD_THRESHOLD) overloadMode = true;
  }
}

function weiToBnb(weiStr) {
  try {
    return (parseInt(weiStr) / 1e18).toFixed(4);
  } catch {
    return "0.0000";
  }
}

function json(res, status, obj, compressible = true) {
  const body = JSON.stringify(obj);
  const bodyBuf = Buffer.from(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": bodyBuf.length,
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    "Vary": "Origin, Accept-Encoding",
  });
  res.end(body);
}

function jsonCompressed(res, status, obj) {
  const body = JSON.stringify(obj);
  const bodyBuf = Buffer.from(body);
  const gzipped = zlib.gzipSync(bodyBuf, { level: 6 });
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Encoding": "gzip",
    "Content-Length": gzipped.length,
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    "Vary": "Origin, Accept-Encoding",
  });
  res.end(gzipped);
}

function initPreparedStatements() {
  prepared.set("countMints", db.prepare("SELECT COUNT(*) as c FROM mints"));
  prepared.set("countListings", db.prepare("SELECT COUNT(*) as c FROM listings"));
  prepared.set("countOwners", db.prepare("SELECT COUNT(DISTINCT owner) as c FROM mints"));
  prepared.set("floorListing", db.prepare(
    "SELECT price_wei FROM listings ORDER BY CAST(price_wei AS INTEGER) ASC LIMIT 1"
  ));
  prepared.set("lastSale", db.prepare(
    "SELECT sold_at, price_wei FROM sales ORDER BY sold_at DESC LIMIT 1"
  ));
  prepared.set("totalVolume", db.prepare(
    "SELECT COALESCE(SUM(CAST(price_wei AS INTEGER)), 0) as total FROM sales"
  ));
  prepared.set("volume24h", db.prepare(
    "SELECT COALESCE(SUM(CAST(price_wei AS INTEGER)), 0) as total FROM sales WHERE sold_at > datetime('now', '-1 day')"
  ));
  prepared.set("listMints", db.prepare(
    "SELECT token_id as tokenId, owner, agent_id_token_id as agentIdTokenId, tier, power, tx_hash as txHash, block_number as blockNumber, minted_at as mintedAt FROM mints ORDER BY token_id DESC LIMIT ? OFFSET ?"
  ));
  prepared.set("getMint", db.prepare(
    "SELECT token_id as tokenId, owner, agent_id_token_id as agentIdTokenId, tier, power, tx_hash as txHash, block_number as blockNumber, minted_at as mintedAt FROM mints WHERE token_id = ?"
  ));
  prepared.set("listListings", db.prepare(
    "SELECT token_id as tokenId, seller, price_wei as priceWei, listed_at as listedAt, tx_hash as txHash FROM listings ORDER BY CAST(price_wei AS INTEGER) ASC LIMIT ? OFFSET ?"
  ));
  prepared.set("listSales", db.prepare(
    "SELECT id, token_id as tokenId, seller, buyer, price_wei as priceWei, fee_wei as feeWei, tx_hash as txHash, block_number as blockNumber, sold_at as soldAt FROM sales ORDER BY sold_at DESC LIMIT ?"
  ));
}

async function handleStats() {
  const ttl = getCacheTTL(CACHE_TTL_STATS);
  const { data, fromCache } = await getCached("stats", ttl, async () => {
    const totalMinted = prepared.get("countMints").get().c;
    const listedCount = prepared.get("countListings").get().c;
    const floorRow = prepared.get("floorListing").get();
    const ownersCount = prepared.get("countOwners").get().c;
    const lastSaleRow = prepared.get("lastSale").get();
    const totalVolumeRow = prepared.get("totalVolume").get();
    const volume24hRow = prepared.get("volume24h").get();

    const floorPriceWei = floorRow ? floorRow.price_wei : null;

    return {
      totalMinted,
      maxSupply: 5000,
      listedCount,
      floorPriceWei: floorPriceWei ?? null,
      floorPriceBnb: floorPriceWei ? weiToBnb(floorPriceWei) : "0.0000",
      totalVolumeWei: totalVolumeRow.total.toString(),
      totalVolumeBnb: weiToBnb(totalVolumeRow.total.toString()),
      volume24hWei: volume24hRow.total.toString(),
      volume24hBnb: weiToBnb(volume24hRow.total.toString()),
      ownersCount,
      lastSaleAt: lastSaleRow ? lastSaleRow.sold_at : null,
    };
  });
  return { ...data, cached: fromCache };
}

async function handleMintsList(limit, offset, tier) {
  let sql = "SELECT token_id as tokenId, owner, agent_id_token_id as agentIdTokenId, tier, power, tx_hash as txHash, block_number as blockNumber, minted_at as mintedAt FROM mints";
  const params = [];
  const clauses = [];
  if (tier !== undefined) {
    clauses.push("tier = ?");
    params.push(tier);
  }
  if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
  sql += " ORDER BY token_id DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  const rows = db.prepare(sql).all(...params);
  return rows.map((r) => ({ ...r }));
}

async function handleMintsDetail(tokenId) {
  const row = db.prepare(
    "SELECT token_id as tokenId, owner, agent_id_token_id as agentIdTokenId, tier, power, tx_hash as txHash, block_number as blockNumber, minted_at as mintedAt FROM mints WHERE token_id = ?"
  ).get(tokenId);
  if (!row) return null;
  return row;
}

async function handleListings(limit, offset) {
  const ttl = getCacheTTL(CACHE_TTL_LIST);
  const cacheKey = `listings:${limit}:${offset}`;
  const { data, fromCache } = await getCached(cacheKey, ttl, async () => {
    const rows = prepared.get("listListings").all(limit, offset);
    return rows.map((r) => ({
      ...r,
      priceBnb: weiToBnb(r.priceWei),
    }));
  });
  return { data, fromCache };
}

async function handleSales(limit) {
  const rows = prepared.get("listSales").all(limit);
  return rows.map((r) => ({
    ...r,
    priceBnb: weiToBnb(r.priceWei),
    feeBnb: weiToBnb(r.feeWei),
  }));
}

async function handler(req, res) {
  trackRequest();
  const ip = req.socket.remoteAddress || "unknown";
  const rl = rateLimitCheck(ip);
  if (!rl.allowed) {
    res.writeHead(429, {
      "Content-Type": "application/json",
      "Retry-After": String(rl.retryAfter),
      "Access-Control-Allow-Origin": CORS_ORIGIN,
      "Access-Control-Allow-Methods": "GET",
    });
    res.end(JSON.stringify({ error: "rate limit exceeded", retryAfter: rl.retryAfter }));
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": CORS_ORIGIN,
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    json(res, 405, { error: "method not allowed" });
    return;
  }

  const parsed = parse(req.url, true);
  const pathname = parsed.pathname;
  const query = parsed.query;

  try {
    if (pathname === "/api/stats") {
      const data = await handleStats();
      jsonCompressed(res, 200, data);
    } else if (pathname === "/api/mints") {
      const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);
      const offset = Math.max(Number(query.offset) || 0, 0);
      const tier = query.tier !== undefined ? String(query.tier) : undefined;
      const data = await handleMintsList(limit, offset, tier);
      jsonCompressed(res, 200, { mints: data, count: data.length });
    } else if (pathname.match(/^\/api\/mints\/\d+$/)) {
      const tokenId = Number(pathname.split("/").pop());
      const data = await handleMintsDetail(tokenId);
      if (!data) {
        json(res, 404, { error: "mint not found" });
      } else {
        jsonCompressed(res, 200, data);
      }
    } else if (pathname === "/api/listings") {
      const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);
      const offset = Math.max(Number(query.offset) || 0, 0);
      const { data, fromCache } = await handleListings(limit, offset);
      jsonCompressed(res, 200, { listings: data, count: data.length, cached: fromCache });
    } else if (pathname === "/api/sales") {
      const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 50);
      const data = await handleSales(limit);
      jsonCompressed(res, 200, { sales: data, count: data.length });
    } else {
      json(res, 404, { error: "not found" });
    }
  } catch (err) {
    console.error("API error:", err.message);
    json(res, 500, { error: "internal server error" });
  }
}

async function main() {
  try {
    db = new Database(DB_PATH, { readonly: false });
    // PRAGMA optimizations
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA synchronous = NORMAL");
    db.exec("PRAGMA busy_timeout = 5000");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA temp_store = MEMORY");

    // Verify DB readable
    db.prepare("SELECT 1").get();

    initPreparedStatements();

    console.log("📦 SQLite DB:", DB_PATH, "(WAL, synchronous=NORMAL, busy_timeout=5000)");
    console.log("🚀 Aegis Crown V2 API listening on http://localhost:" + API_PORT);
    console.log("   CORS origin:", CORS_ORIGIN);
    console.log("   Rate limit:", RATE_LIMIT_MAX, "req/min per IP");
    console.log("   Cache TTL stats:", CACHE_TTL_STATS / 1000, "s, list:", CACHE_TTL_LIST / 1000, "s");
    console.log("   Max cache keys:", MAX_CACHE_KEYS);
  } catch (err) {
    console.error("❌ Failed to open SQLite DB:", err.message);
    process.exit(1);
  }

  const server = createServer(handler);
  server.listen(API_PORT, () => {
    console.log("   API ready on port", API_PORT);
  });
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
