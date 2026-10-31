import type { TierInfo } from "./types";
import { CONFIG } from "./config";
import { ethers } from "ethers";

export const TIER_IMAGES: Record<number, string> = {
  0: "https://i.postimg.cc/0NKxf2Rp/tier-common.webp",
  1: "https://i.postimg.cc/Jnw8dVMv/tier-rare.webp",
  2: "https://i.postimg.cc/W3MvBW4r/tier-epic.webp",
  3: "https://i.postimg.cc/90ChCd4G/tier-legendary.webp",
  4: "https://i.postimg.cc/vThdB49X/tier-mythic.webp",
};

export const TIER_COLORS: Record<number, string> = {
  0: "#9e9e9e",
  1: "#5cb85c",
  2: "#337ab7",
  3: "#f0ad44",
  4: "#ff6b6b",
};

export const TIER_NAMES: Record<number, string> = {
  0: "Common — Scout",
  1: "Rare — Validator",
  2: "Epic — Sentinel",
  3: "Legendary — Genesis",
  4: "Mythic — Apex",
};

export const TIER_BADGE_COLORS: Record<number, string> = {
  0: "border-gray-500/50 bg-gray-500/10 text-gray-400",
  1: "border-green-500/50 bg-green-500/10 text-green-400",
  2: "border-blue-500/50 bg-blue-500/10 text-blue-400",
  3: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
  4: "border-red-500/50 bg-red-500/10 text-red-400",
};

export function getTierInfo(tierNum: number): TierInfo | null {
  if (tierNum < 0 || tierNum > 4) return null;
  return {
    name: TIER_NAMES[tierNum],
    power: CONFIG.tierPowers[tierNum],
    item: CONFIG.tierItems[tierNum],
    rarity: CONFIG.tierRarities[tierNum],
    color: TIER_COLORS[tierNum],
    image: TIER_IMAGES[tierNum],
  };
}

export function getTierImage(tierNum: number): string {
  return TIER_IMAGES[tierNum] || TIER_IMAGES[0];
}

export function getTierBadgeClass(tierNum: number): string {
  return TIER_BADGE_COLORS[tierNum] || TIER_BADGE_COLORS[0];
}

export function formatAddress(addr: string | null | undefined): string {
  if (!addr || addr.length <= 10) return addr ?? "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatPriceBnb(weiString: string): string {
  try {
    const bnb = parseFloat(ethers.formatUnits(weiString, 18));
    return bnb.toFixed(4);
  } catch {
    return "0";
  }
}

export function getDisclaimer(): string {
  return "Collectible only. No promised returns, no yield, no guaranteed value.";
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}