/**
 * Aegis Crown API client
 * Fetches from VPS API (NEXT_PUBLIC_API_URL) with 8s timeout.
 * Falls back to public/market-data.json (build-time static) when API is down.
 * Never shows a blank page.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const FALLBACK_PATH = "/market-data.json";
const FETCH_TIMEOUT = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("API timeout")), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function tryApi<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  try {
    return await withTimeout(fetchJson(`${API_URL}${path}`), FETCH_TIMEOUT);
  } catch {
    return null;
  }
}

async function tryFallback<T>(path: string): Promise<T | null> {
  try {
    return await fetchJson(path);
  } catch {
    return null;
  }
}

export type ApiStats = {
  totalMinted: number;
  maxSupply: number;
  listedCount: number;
  floorPriceWei: string | null;
  floorPriceBnb: string;
  totalVolumeWei: string;
  totalVolumeBnb: string;
  volume24hWei: string;
  volume24hBnb: string;
  ownersCount: number;
  lastSaleAt: string | null;
};

export type ApiListing = {
  tokenId: number;
  seller: string;
  priceWei: string;
  priceBnb: string;
  listedAt: string;
};

export type ApiMint = {
  tokenId: number;
  owner: string;
  tier: string;
  power: number;
  txHash: string;
  blockNumber: number;
  mintedAt: string;
};

export async function fetchStats(): Promise<{ data: ApiStats | null; source: "api" | "fallback" }> {
  const api = await tryApi<{ totalMinted: number; maxSupply: number; listedCount: number; floorPriceWei: string | null; floorPriceBnb: string; totalVolumeWei: string; totalVolumeBnb: string; volume24hWei: string; volume24hBnb: string; ownersCount: number; lastSaleAt: string | null }>("/api/stats");
  if (api) return { data: api, source: "api" };
  const fb = await tryFallback<any>(FALLBACK_PATH);
  const stats = fb?.stats ?? {};
  return {
    data: {
      totalMinted: stats.totalSupplyMinted ?? stats.totalMinted ?? 0,
      maxSupply: stats.maxSupply ?? 5000,
      listedCount: stats.listedCount ?? 0,
      floorPriceWei: stats.floorPrice ?? null,
      floorPriceBnb: stats.floorPriceBnb ?? "0.0000",
      totalVolumeWei: stats.totalVolume ?? "0",
      totalVolumeBnb: stats.totalVolumeBnb ?? "0.0000",
      volume24hWei: stats.volume24h ?? "0",
      volume24hBnb: stats.volume24hBnb ?? "0.0000",
      ownersCount: stats.ownersCount ?? 0,
      lastSaleAt: null,
    },
    source: "fallback",
  };
}

export async function fetchListings(): Promise<{ data: ApiListing[]; source: "api" | "fallback" }> {
  const api = await tryApi<{ listings: any[] }>("/api/listings");
  if (api?.listings) {
    return {
      data: api.listings.map((l: any) => ({
        tokenId: l.tokenId,
        seller: l.seller,
        priceWei: l.priceWei,
        priceBnb: l.priceBnb ?? "0.0000",
        listedAt: l.listedAt,
      })),
      source: "api",
    };
  }
  const fb = await tryFallback<any>(FALLBACK_PATH);
  const listings = fb?.listings ?? [];
  return {
    data: listings.map((l: any) => ({
      tokenId: l.tokenId,
      seller: l.seller,
      priceWei: l.price ?? "0",
      priceBnb: l.priceBnb ?? "0.0000",
      listedAt: new Date(l.timestamp ?? Date.now()).toISOString(),
    })),
    source: "fallback",
  };
}

export async function fetchMints(limit?: number, offset?: number, tier?: string): Promise<{ data: ApiMint[] }> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  if (tier) params.set("tier", tier);
  const path = `/api/mints${params.toString() ? "?" + params.toString() : ""}`;
  const api = await tryApi<{ mints: any[] }>(path);
  if (api?.mints) {
    return {
      data: api.mints.map((m: any) => ({
        tokenId: m.tokenId,
        owner: m.owner,
        tier: m.tier,
        power: m.power,
        txHash: m.txHash,
        blockNumber: m.blockNumber,
        mintedAt: m.mintedAt,
      })),
    };
  }
  return { data: [] };
}

export async function fetchSales(limit = 50): Promise<any[]> {
  const api = await tryApi<{ sales: any[] }>(`/api/sales?limit=${limit}`);
  if (api?.sales) return api.sales;
  return [];
}
