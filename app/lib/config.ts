export const CONFIG = {
  chainId: 56,
  rpcUrl: "https://bsc-dataseed.binance.org",
  explorerUrl: "https://bscscan.com",
  registryAddress: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  aegisCrownAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  aegisMarketAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  creatorWallet: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  maxSupply: 5000,
  royaltyPercent: 3,
  baseUri: "https://your-domain.com/metadata/",
  tierNames: ["common", "rare", "epic", "legendary", "mythic"] as const,
  tierRarities: [60, 25, 12, 2, 1] as const,
  tierPowers: [10, 25, 50, 100, 150] as const,
  tierItems: ["None", "Tiny Gem", "Tiny Sparkle", "Red Crystal Crown", "Red Crystal Crown + Tiny Star"] as const,
} as const;

export type TierName = typeof CONFIG.tierNames[number];
export type Tier = 0 | 1 | 2 | 3 | 4;

export function getTierName(tier: Tier): TierName {
  return CONFIG.tierNames[tier];
}

export function tierFromNumber(tier: number): Tier | null {
  if (tier >= 0 && tier <= 4) return tier as Tier;
  return null;
}