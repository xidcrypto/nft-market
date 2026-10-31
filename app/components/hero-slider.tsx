"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getTierImage } from "../lib/tier-utils";

const TIER_DATA = [
  { tier: 0, name: "Common — Scout", character: "Scout", power: 10, supply: 3000, rarity: 60 },
  { tier: 1, name: "Rare — Validator", character: "Validator", power: 25, supply: 1250, rarity: 25 },
  { tier: 2, name: "Epic — Sentinel", character: "Sentinel", power: 50, supply: 600, rarity: 12 },
  { tier: 3, name: "Legendary — Genesis", character: "Genesis", power: 100, supply: 100, rarity: 2 },
  { tier: 4, name: "Mythic — Apex", character: "Apex", power: 150, supply: 50, rarity: 1 },
];

type MintedSlide = {
  tokenId: number;
  tier: number;
  owner: string | null;
  priceBnb: string | null;
  listed: boolean;
};

type Slide = {
  type: "tier" | "minted";
  tier?: number;
  tokenId?: number;
  owner?: string;
  priceBnb?: string;
  listed?: boolean;
  image: string;
  name: string;
  label: string;
};

function buildSlides(minted: MintedSlide[]): Slide[] {
  const slides: Slide[] = [];

  // Tier preview slides (always first)
  TIER_DATA.forEach((t) => {
    slides.push({
      type: "tier",
      tier: t.tier,
      image: getTierImage(t.tier),
      name: `${t.name} · ${t.character}`,
      label: "Tier Preview — mint yours",
    });
  });

  // Minted slides (after tier slides) - NO cloning, no looping
  minted.forEach((m) => {
    const tierName = ["Common", "Rare", "Epic", "Legendary", "Mythic"][m.tier] ?? "Common";
    slides.push({
      type: "minted",
      tokenId: m.tokenId,
      tier: m.tier,
      owner: m.owner ?? undefined,
      priceBnb: m.priceBnb ?? undefined,
      listed: m.listed,
      image: getTierImage(m.tier),
      name: `#${m.tokenId} · ${tierName}`,
      label: m.listed ? `Listed: ${m.priceBnb ?? "0"} BNB` : "Not listed",
    });
  });

  return slides;
}

export function HeroSlider({ minted }: { minted: MintedSlide[] }) {
  const slides = buildSlides(minted);
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect reduced motion
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const handler = () => setReducedMotion(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  // Tab visibility
  useEffect(() => {
    const handler = () => setIsTabHidden(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // Keyboard navigation (left/right arrow keys, no visual arrows)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setCurrent((prev) => Math.max(prev - 1, 0));
      if (e.key === "ArrowRight") setCurrent((prev) => Math.min(prev + 1, slides.length - 1));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [slides.length]);

  // Auto-play: moves forward only, STOPS at last slide
  useEffect(() => {
    if (isHovered || isTabHidden || slides.length <= 1) return;
    if (current >= slides.length - 1) return; // stop at last slide

    const timer = setInterval(() => {
      setCurrent((prev) => {
        if (prev >= slides.length - 1) return prev; // stop at last slide
        return prev + 1;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovered, isTabHidden, slides.length, current, reducedMotion]);

  // Touch swipe - finite, clamp at ends
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchEndX(0);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setTouchEndX(e.changedTouches[0].clientX);
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // swipe left -> next slide (clamp at last)
        setCurrent((prev) => Math.min(prev + 1, slides.length - 1));
      } else {
        // swipe right -> prev slide (clamp at first)
        setCurrent((prev) => Math.max(prev - 1, 0));
      }
    }
  }, [touchStartX, slides.length]);

  const goTo = (idx: number) => setCurrent(Math.max(0, Math.min(idx, slides.length - 1)));

  const slide = slides[current];
  const isFirst = current === 0;
  const isLast = current === slides.length - 1;

  return (
    <section className="relative w-full">
      {/* Slider container - NO navigation arrows */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-border bg-neutral-800/40"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slide track - finite, no cloning */}
        <div
          className={`flex transition-transform duration-500 ease-in-out ${reducedMotion ? "duration-0" : ""}`}
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((s, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-full min-w-[100%]"
            >
              <div className="relative w-full h-[420px] md:h-[560px] overflow-hidden">
                <Image
                  src={s.image}
                  alt={s.name}
                  width={800}
                  height={560}
                  className="w-full h-full object-cover object-center"
                  loading={idx === current || idx === (current + 1) % slides.length ? "eager" : "lazy"}
                  decoding="async"
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                {/* Badge tier label */}
                <div className="absolute top-4 left-4 z-20">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tighter border ${
                      s.type === "tier"
                        ? "border-accent-gold/30 bg-black/40 text-accent-gold"
                        : "border-white/20 bg-black/40 text-white"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {/* Content panel - padding on all sides, full title visible */}
                <div className="absolute bottom-0 left-0 right-0 z-20 p-6 md:p-8">
                  <div className="max-w-[600px]">
                    <h3 className="text-2xl md:text-3xl font-bold text-primary mb-2">{s.name}</h3>
                    {s.type === "tier" && (
                      <p className="text-secondary text-sm mb-4">
                        Power {TIER_DATA.find((t) => t.tier === s.tier)?.power ?? 10} ·
                        Supply {TIER_DATA.find((t) => t.tier === s.tier)?.supply ?? 0} ·
                        {TIER_DATA.find((t) => t.tier === s.tier)?.rarity ?? 0}% rarity
                      </p>
                    )}
                    {s.type === "minted" && (
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs text-secondary">Token #{s.tokenId}</span>
                        <span className={`text-xs font-medium ${s.listed ? "text-accent-gold" : "text-secondary"}`}>
                          {s.listed ? `Listed: ${s.priceBnb ?? "0"} BNB` : "Not listed"}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {s.type === "tier" ? (
                        <Link
                          href="/mint"
                          className="flex-1 py-4 text-center font-bold text-black bg-accent-gold rounded-xl focus:ring-2 focus:ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors duration-150"
                        >
                          Mint This Tier
                        </Link>
                      ) : (
                        <Link
                          href="/market"
                          className="flex-1 py-4 text-center font-bold text-black bg-accent-gold rounded-xl focus:ring-2 focus:ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors duration-150"
                        >
                          View in Market
                        </Link>
                      )}
                      <Link
                        href="/market"
                        className="flex-1 py-4 text-center font-medium text-secondary border border-accent-gold/30 rounded-xl hover:border-accent-gold/60 hover:text-accent-gold transition-colors duration-150"
                      >
                        View Market
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dot indicators - user-requested navigation only */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 focus:outline-none ${current === idx ? "bg-accent-gold" : "bg-white/30 hover:bg-white/50"}`}
                aria-label={`Go to slide ${idx + 1}`}
                aria-current={current === idx ? "true" : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
