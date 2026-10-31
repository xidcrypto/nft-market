"use client";

import Image from "next/image";
import type { TierInfo } from "../lib/types";
import { getTierInfo } from "../lib/tier-utils";

interface RarityCardProps {
  tier: number;
  title?: string;
}

export function RarityCardComponent({ tier, title }: RarityCardProps) {
  const tierInfo = getTierInfo(tier);

  if (!tierInfo) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 opacity-50">
        <h3 className="text-gray-400">Unknown Tier</h3>
      </div>
    );
  }

  const rarityPercent = [60, 25, 12, 2, 1][tier - 1];

  return (
    <div className="group relative bg-gray-800 rounded-lg border border-gray-700 overflow-hidden transition-transform hover:scale-105 hover:border-yellow-500/30">
      <div className="relative h-48 bg-gradient-to-b from-gray-700 to-gray-800">
        <div
          className="absolute inset-0 flex items-center justify-center p-4"
        >
          <Image
            src={tierInfo.image}
            alt={`${tierInfo.name} - ${tierInfo.item}`}
            width={200}
            height={200}
            className="object-contain transition-transform group-hover:scale-110"
            priority={tier === 4 || tier === 5}
          />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">
            {tierInfo.name.split(" —")[0]}
          </h3>
          <span
            className="px-2 py-1 text-xs font-medium rounded-full"
            style={{ backgroundColor: `${tierInfo.color}20`, color: tierInfo.color }}
          >
            Tier {tier}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Rarity</span>
            <span className="text-white font-medium">{rarityPercent}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Power</span>
            <span className="text-white font-medium">{tierInfo.power}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Item</span>
            <span className="text-white text-right max-w-32 truncate">
              {tierInfo.item}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}