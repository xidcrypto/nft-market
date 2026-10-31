"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type RealtimeOptions = {
  interval?: number;
  enabled?: boolean;
  pauseOnTabHidden?: boolean;
};

type RealtimeState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
};

export function useRealtime<T>(
  fetcher: () => Promise<T>,
  options: RealtimeOptions = {}
): RealtimeState<T> {
  const {
    interval = 15000,
    enabled = true,
    pauseOnTabHidden = true,
  } = options;

  const [state, setState] = useState<RealtimeState<T>>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const visibleRef = useRef(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!pauseOnTabHidden) return;

    const handleVisibility = () => {
      visibleRef.current = document.visibilityState === "visible";
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [pauseOnTabHidden]);

  const fetchData = useCallback(async () => {
    if (!enabled || (pauseOnTabHidden && !visibleRef.current)) return;

    try {
      const data = await fetcher();
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          data,
          loading: false,
          error: null,
          lastUpdated: Date.now(),
        }));
      }
    } catch (err) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err : new Error("Fetch failed"),
        }));
      }
    }
  }, [fetcher, enabled, pauseOnTabHidden]);

  useEffect(() => {
    fetchData();

    if (!enabled) return;

    const timerId = setInterval(fetchData, interval);
    return () => clearInterval(timerId);
  }, [fetchData, interval]);

  return state;
}

export function useMarketData(options: RealtimeOptions = {}) {
  return useRealtime<any>(
    async () => {
      const res = await fetch("/market-data.json");
      if (!res.ok) throw new Error("Failed to fetch market data");
      return res.json();
    },
    { interval: 15000, ...options }
  );
}

export function useMintedCount(options: RealtimeOptions = {}) {
  return useRealtime<number>(
    async () => {
      const res = await fetch("/market-data.json");
      if (!res.ok) throw new Error("Failed to fetch minted count");
      const data = await res.json();
      return data?.stats?.totalSupplyMinted ?? 0;
    },
    { interval: 10000, ...options }
  );
}

export function formatLastUpdated(timestamp: number | null): string {
  if (!timestamp) return "";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
