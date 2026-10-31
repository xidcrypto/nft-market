import type { TierInfo } from "./types";
import { CONFIG } from "./config";
import { ethers } from "ethers";

export const TIER_IMAGES: Record<number, string> = {
  1: "/images/common.svg",
  2: "/images/rare.svg",
  3: "/images/epic.svg",
  4: "/images/legendary.svg",
  5: "/images/mythic.svg",
};

export const TIER_COLORS: Record<number, string> = {
  1: "#9e9e9e",
  2: "#5cb85c",
  3: "#337ab7",
  4: "#f0ad44",
  5: "#ff6b6b",
};

export const TIER_NAMES: Record<number, string> = {
  1: "Common — Scout",
  2: "Rare — Validator",
  3: "Epic — Sentinel",
  4: "Legendary — Genesis",
  5: "Mythic — Apex",
};

export function getTierInfo(tierNum: number): TierInfo | null {
  if (tierNum < 1 || tierNum > 5) return null;
  return {
    name: TIER_NAMES[tierNum],
    power: CONFIG.tierPowers[tierNum - 1],
    item: CONFIG.tierItems[tierNum - 1],
    rarity: CONFIG.tierRarities[tierNum - 1],
    color: TIER_COLORS[tierNum],
    image: TIER_IMAGES[tierNum],
  };
}

export function getTierNameFromNumber(tierNum: number): string | null {
  const info = getTierInfo(tierNum);
  return info ? info.name : null;
}

export function getTierImage(tierNum: number): string {
  return TIER_IMAGES[tierNum] || TIER_IMAGES[1];
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

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function getDisclaimer(): string {
  return "Collectible only. No promised returns, no yield, no guaranteed value.";
}