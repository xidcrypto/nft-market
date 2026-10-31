import type { TierInfo } from "./types";
import { CONFIG } from "./config";
import { ethers } from "ethers";

// Canonical tier mapping: contract tierOf returns uint8 0-4
// 0 = common, 1 = rare, 2 = epic, 3 = legendary, 4 = mythic
export const TIER_IMAGES: Record<number, string> = {
  0: "/images/common.svg",
  1: "/images/rare.svg",
  2: "/images/epic.svg",
  3: "/images/legendary.svg",
  4: "/images/mythic.svg",
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

export function getTierNameFromNumber(tierNum: number): string | null {
  const info = getTierInfo(tierNum);
  return info ? info.name : null;
}

export function getTierImage(tierNum: number): string {
  return TIER_IMAGES[tierNum] || TIER_IMAGES[0];
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