export const CONFIG = {
  chainId: 56,
  rpcUrl: "https://bsc-dataseed.binance.org",
  explorerUrl: "https://bscscan.com",
  registryAddress: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  aegisCrownAddress: "0x61dfF633C8eE31f9811F75809dd9b82152597170" as `0x${string}`,
  aegisMarketAddress: "0x9A2BC2555Bb7B5254595F1bF9Ab7A5CB6D12828b" as `0x${string}`,
  creatorWallet: "0xD7F96c23Af0e65DC28A14111C994aa48701105D5" as `0x${string}`,
  maxSupply: 5000,
  royaltyPercent: 3,
  baseUri: "ipfs://QmQ4oJiRy2GbXSwi2XAUM2T6BYhnC2eEcKE1Vzjm3kQHCB/",
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