#!/usr/bin/env node
/**
 * Aegis Crown V2 API Server
 * Runs on VPS at localhost:3001, reverse-proxied by nginx.
 * Read-only: GET endpoints only. No public write endpoints.
 * SQLite (WAL mode) is the single source of truth.
 */

import { Database } from "node:sqlite";
import { createServer } from "node:http";
import { parse } from "node:url";

const DB_PATH = process.env.DB_PATH || "/root/aegis/data/aegis.db";
const API_PORT = Number(process.env.API_PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://aegis-crown.vercel.app";
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window per IP

const CACHE_TTL_STATS = 10 * 1000;   // 10 seconds
const CACHE_TTL_LIST  = 15 * 1000;   // 15 seconds

let db;
const rateLimit = new Map(); // ip -> { count, resetAt }

// Single-flight cache
const cache = new Map(); // key -> { data, expiresAt, pending: Promise }

async function getCached(key, ttlMs, fetcher) {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expiresAt > now) {
    return { data: entry.data, fromCache: true };
  }
  if (entry && entry.pending) {
    return { data: await entry.pending, fromCache: true };
  }
  const promise = (async () => {
    const data = await fetcher();
    cache.set(key, { data, expiresAt: Date.now() + ttlMs, pending: null });
    return data;
  })();
  cache.set(key, { data: null, expiresAt: now + ttlMs, pending: promise });
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

function weiToBnb(weiStr) {
  try {
    return (parseInt(weiStr) / 1e18).toFixed(4);
  } catch {
    return "0.0000";
  }
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  });
  res.end(body);
}

async function handleStats() {
  const { data, fromCache } = await getCached("stats", CACHE_TTL_STATS, async () => {
    const totalMintedRow = db.prepare("SELECT COUNT(*) as c FROM mints").get();
    const listedRow = db.prepare("SELECT COUNT(*) as c FROM listings").get();
    const floorRow = db.prepare(
      "SELECT price_wei FROM listings ORDER BY CAST(price_wei AS INTEGER) ASC LIMIT 1"
    ).get();
    const ownersRow = db.prepare("SELECT COUNT(DISTINCT owner) as c FROM mints").get();
    const lastSaleRow = db.prepare(
      "SELECT sold_at, price_wei FROM sales ORDER BY sold_at DESC LIMIT 1"
    ).get();

    const totalMinted = totalMintedRow.c;
    const listedCount = listedRow.c;
    const floorPriceWei = floorRow ? floorRow.price_wei : null;
    const ownersCount = ownersRow.c;
    const lastSaleAt = lastSaleRow ? lastSaleRow.sold_at : null;

    // Volume: sum of sales
    const volumeRow = db.prepare(
      "SELECT COALESCE(SUM(CAST(price_wei AS INTEGER)), 0) as total, COALESCE(SUM(CAST(fee_wei AS INTEGER)), 0) as fees FROM sales"
    ).get();
    const totalVolumeWei = volumeRow.total.toString();
    const volume24hRow = db.prepare(
      "SELECT COALESCE(SUM(CAST(price_wei AS INTEGER)), 0) as total FROM sales WHERE sold_at > datetime('now', '-1 day')"
    ).get();
    const volume24hWei = volume24hRow.total.toString();

    return {
      totalMinted,
      maxSupply: 5000,
      listedCount,
      floorPriceWei: floorPriceWei ?? null,
      floorPriceBnb: floorPriceWei ? weiToBnb(floorPriceWei) : "0.0000",
      totalVolumeWei,
      totalVolumeBnb: weiToBnb(totalVolumeWei),
      volume24hWei,
      volume24hBnb: weiToBnb(volume24hWei),
      ownersCount,
      lastSaleAt,
      cached: fromCache,
    };
  });
  return data;
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
  sql += " ORDER BY token_id DESC";
  if (limit !== undefined) {
    sql += " LIMIT ?";
    params.push(limit);
  }
  if (offset !== undefined) {
    sql += " OFFSET ?";
    params.push(offset);
  }
  const rows = db.prepare(sql).all(...params);
  return rows.map(r => ({
    ...r,
    priceBnb: null, // mints don't have price
  }));
}

async function handleMintsDetail(tokenId) {
  const row = db.prepare(
    "SELECT token_id as tokenId, owner, agent_id_token_id as agentIdTokenId, tier, power, tx_hash as txHash, block_number as blockNumber, minted_at as mintedAt FROM mints WHERE token_id = ?"
  ).get(tokenId);
  if (!row) return null;
  return row;
}

async function handleListings() {
  const { data, fromCache } = await getCached("listings", CACHE_TTL_LIST, async () => {
    const rows = db.prepare(
      "SELECT token_id as tokenId, seller, price_wei as priceWei, listed_at as listedAt, tx_hash as txHash FROM listings ORDER BY CAST(price_wei AS INTEGER) ASC"
    ).all();
    return rows.map(r => ({
      ...r,
      priceBnb: weiToBnb(r.priceWei),
    }));
  });
  return { data, fromCache };
}

async function handleSales(limit) {
  let sql = "SELECT id, token_id as tokenId, seller, buyer, price_wei as priceWei, fee_wei as feeWei, tx_hash as txHash, block_number as blockNumber, sold_at as soldAt FROM sales ORDER BY sold_at DESC";
  const params = [];
  if (limit !== undefined) {
    sql += " LIMIT ?";
    params.push(limit);
  }
  const rows = db.prepare(sql).all(...params);
  return rows.map(r => ({
    ...r,
    priceBnb: weiToBnb(r.priceWei),
    feeBnb: weiToBnb(r.feeWei),
  }));
}

async function handler(req, res) {
  const ip = req.socket.remoteAddress || "unknown";
  const rl = rateLimitCheck(ip);
  if (!rl.allowed) {
    res.writeHead(429, {
      "Content-Type": "application/json",
      "Retry-After": String(rl.retryAfter),
      "Access-Control-Allow-Origin": CORS_ORIGIN,
    });
    res.end(JSON.stringify({ error: "rate limit exceeded", retryAfter: rl.retryAfter }));
    return;
  }

  // CORS preflight
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
      json(res, 200, data);
    } else if (pathname === "/api/mints") {
      const limit = query.limit ? Number(query.limit) : undefined;
      const offset = query.offset ? Number(query.offset) : undefined;
      const tier = query.tier !== undefined ? String(query.tier) : undefined;
      const data = await handleMintsList(limit, offset, tier);
      json(res, 200, { mints: data, count: data.length });
    } else if (pathname.match(/^\/api\/mints\/\d+$/)) {
      const tokenId = Number(pathname.split("/").pop());
      const data = await handleMintsDetail(tokenId);
      if (!data) {
        json(res, 404, { error: "mint not found" });
      } else {
        json(res, 200, data);
      }
    } else if (pathname === "/api/listings") {
      const { data, fromCache } = await handleListings();
      json(res, 200, { listings: data, count: data.length, cached: fromCache });
    } else if (pathname === "/api/sales") {
      const limit = query.limit ? Number(query.limit) : undefined;
      const data = await handleSales(limit);
      json(res, 200, { sales: data, count: data.length });
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
    db = new Database(DB_PATH);
    // Verify DB is readable
    db.prepare("SELECT 1").get();
    console.log(`📦 SQLite DB: ${DB_PATH} (WAL)`);
  } catch (err) {
    console.error("❌ Failed to open SQLite DB:", err.message);
    console.error("   Run schema first: sqlite3 < DB_PATH < scripts/db-schema.sql");
    process.exit(1);
  }

  const server = createServer(handler);
  server.listen(API_PORT, () => {
    console.log(`🚀 Aegis Crown V2 API listening on http://localhost:${API_PORT}`);
    console.log(`   CORS origin: ${CORS_ORIGIN}`);
    console.log(`   Rate limit: ${RATE_LIMIT_MAX} req/min per IP`);
  });
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
