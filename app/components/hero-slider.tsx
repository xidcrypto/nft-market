"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getTierImage } from "../lib/tier-utils";

// === Constants (single source of truth) ===
const AUTOPLAY_DELAY_MS = 9000;
const TRANSITION_MS = 900;
const RESUME_DELAY_MS = 10000;
const SWIPE_THRESHOLD_PX = 50;

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

  // Tier preview slides (always first, 5 slides)
  TIER_DATA.forEach((t) => {
    slides.push({
      type: "tier",
      tier: t.tier,
      image: getTierImage(t.tier),
      name: `${t.name} · ${t.character}`,
      label: "Tier Preview — mint yours",
    });
  });

  // Minted slides (after tier slides)
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
  const baseSlides = buildSlides(minted);
  const realCount = baseSlides.length;

  // Infinite track: [cloneOfLast, ...realSlides, cloneOfFirst]
  // Positions: 0 = clone of last, 1..realCount = real slides, realCount+1 = clone of first
  const slides: Slide[] =
    realCount > 1
      ? [baseSlides[realCount - 1], ...baseSlides, baseSlides[0]]
      : baseSlides;

  // `current` = position in extended track (0..slides.length-1).
  // Start at position 1 (real first slide) when looping.
  const [current, setCurrent] = useState(realCount > 1 ? 1 : 0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Suppress transition animation when jumping between clones (seamless loop)
  const [noTransition, setNoTransition] = useState(false);
  // Auto-play pause state: true when user interacted, waiting to resume
  const [autoplayPaused, setAutoplayPaused] = useState(false);

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
      if (realCount <= 1) return;
      setAutoplayPaused(true);
      if (e.key === "ArrowLeft") {
        const next = current - 1;
        if (next === 0) {
          // At first real slide (pos 1), going left loops to last real slide (pos realCount)
          setCurrent(0); // clone of last slide - animates 900ms
          setTimeout(() => {
            setNoTransition(true);
            setCurrent(realCount); // snap to real last slide without animation
            setTimeout(() => setNoTransition(false), 50);
          }, TRANSITION_MS);
        } else {
          setCurrent(next);
        }
      }
      if (e.key === "ArrowRight") {
        const next = current + 1;
        if (next > realCount) {
          // At last real slide (pos realCount), going right loops to first real slide (pos 1)
          setCurrent(realCount + 1); // clone of first slide - animates 900ms
          setTimeout(() => {
            setNoTransition(true);
            setCurrent(1); // snap to real first slide without animation
            setTimeout(() => setNoTransition(false), 50);
          }, TRANSITION_MS);
        } else {
          setCurrent(next);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [current, realCount]);

  // Auto-play: infinite loop, 9s interval, stops on hover/touch/tab hidden
  useEffect(() => {
    if (isHovered || isTabHidden || autoplayPaused || isDragging || realCount <= 1) return;

    const timer = setInterval(() => {
      const next = current + 1;
      if (next > realCount) {
        // At last real slide, loop to first real slide seamlessly (clone + snap)
        setCurrent(realCount + 1); // animate 900ms to clone of first
        setTimeout(() => {
          setNoTransition(true);
          setCurrent(1); // snap to real first slide without animation
          setTimeout(() => setNoTransition(false), 50);
        }, TRANSITION_MS);
      } else {
        setCurrent(next);
      }
    }, AUTOPLAY_DELAY_MS);
    return () => clearInterval(timer);
  }, [isHovered, isTabHidden, autoplayPaused, isDragging, realCount, current]);

  // Resume auto-play after RESUME_DELAY_MS of no interaction
  useEffect(() => {
    if (!autoplayPaused) return;
    const timer = setTimeout(() => {
      setAutoplayPaused(false);
    }, RESUME_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoplayPaused]);

  // After transition ends, if we landed on a clone, jump to real counterpart without animation
  // (handled inline in the handlers above via setTimeout TRANSITION_MS)

  // Real slide index for dots (0..realCount-1), mapping from extended track position
  const realIndex = realCount > 1 ? ((current - 1 + realCount) % realCount) : 0;

  const transitionDuration = reducedMotion ? 0 : TRANSITION_MS;

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (realCount <= 1) return;
    setAutoplayPaused(true);
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragCurrentX(e.clientX);
    setNoTransition(true);
  }, [realCount]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragCurrentX(e.clientX);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = dragStartX - dragCurrentX;
    if (Math.abs(diff) > SWIPE_THRESHOLD_PX) {
      if (diff > 0) {
        // drag left -> next slide
        const next = current + 1;
        if (next > realCount) {
          setCurrent(realCount + 1);
          setTimeout(() => {
            setNoTransition(true);
            setCurrent(1);
            setTimeout(() => setNoTransition(false), 50);
          }, TRANSITION_MS);
        } else {
          setCurrent(next);
        }
      } else {
        // drag right -> prev slide
        const next = current - 1;
        if (realCount > 1 && next === 0) {
          setCurrent(0);
          setTimeout(() => {
            setNoTransition(true);
            setCurrent(realCount);
            setTimeout(() => setNoTransition(false), 50);
          }, TRANSITION_MS);
        } else {
          setCurrent(next);
        }
      }
    }
    setTimeout(() => setAutoplayPaused(true), 100);
  }, [dragStartX, dragCurrentX, current, realCount]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (isDragging) {
      setIsDragging(false);
      setAutoplayPaused(true);
    }
  }, [isDragging]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (realCount <= 1) return;
    setAutoplayPaused(true);
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragCurrentX(e.touches[0].clientX);
    setNoTransition(true);
  }, [realCount]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    setDragCurrentX(e.touches[0].clientX);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = dragStartX - dragCurrentX;
    if (Math.abs(diff) > SWIPE_THRESHOLD_PX) {
      if (diff > 0) {
        const next = current + 1;
        if (next > realCount) {
          setCurrent(realCount + 1);
          setTimeout(() => {
            setNoTransition(true);
            setCurrent(1);
            setTimeout(() => setNoTransition(false), 50);
          }, TRANSITION_MS);
        } else {
          setCurrent(next);
        }
      } else {
        const next = current - 1;
        if (realCount > 1 && next === 0) {
          setCurrent(0);
          setTimeout(() => {
            setNoTransition(true);
            setCurrent(realCount);
            setTimeout(() => setNoTransition(false), 50);
          }, TRANSITION_MS);
        } else {
          setCurrent(next);
        }
      }
    }
    setTimeout(() => setAutoplayPaused(true), 100);
  }, [dragStartX, dragCurrentX, current, realCount]);

  const goTo = (idx: number) => {
    setAutoplayPaused(true);
    setNoTransition(false);
    setCurrent(idx + 1); // dot idx 0 -> position 1, etc.
  };

  const slide = slides[current];

  return (
    <section className="relative w-full">
      {/* Slider container - NO navigation arrows */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-border bg-neutral-800/40"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slide track - seamless loop with cloned ends */}
        <div
          className={`flex transition-transform duration-[${transitionDuration}ms] ease-in-out ${noTransition ? "duration-0" : ""} ${reducedMotion ? "duration-0" : ""}`}
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
                  loading={
                    idx === current ||
                    Math.abs(idx - current) === 1 ||
                    (idx === 0 && current === realCount) ||
                    (idx === realCount + 1 && current === 1)
                      ? "eager"
                      : "lazy"
                  }
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
                      <Link
                        href="/market"
                        className="flex-1 py-4 text-center font-bold text-black bg-accent-gold rounded-xl focus:ring-2 focus:ring-accent-gold focus:ring-offset-2 focus:ring-offset-background transition-colors duration-150"
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
        {realCount > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-3">
            {baseSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`w-3 h-3 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 ${realIndex === idx ? "bg-accent-gold" : "bg-white/30 hover:bg-white/50"}`}
                aria-label={`Go to slide ${idx + 1}`}
                aria-current={realIndex === idx ? "true" : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
