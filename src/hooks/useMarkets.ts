import { useState, useEffect, useCallback, useRef } from "react";
import { MARKETS, fmtTimer, type Market } from "../lib/markets";

export interface MarketTimer {
  [id: string]: number;
}

export interface UseMarketsReturn {
  markets:  Market[];
  timers:   MarketTimer;
  filtered: (cat: string) => Market[];
  refresh:  () => void;
}

/**
 * useMarkets — live market feed with per-market countdown timers.
 *
 * In production: replaces static MARKETS with on-chain fetches via RialoClient.
 * In dev/demo:   uses static data with simulated timer ticks.
 */
export function useMarkets(): UseMarketsReturn {
  const [timers, setTimers] = useState<MarketTimer>(() => {
    const init: MarketTimer = {};
    MARKETS.forEach((m) => { init[m.id] = m.endSecs; });
    return init;
  });

  // Tick every second
  useEffect(() => {
    const iv = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        MARKETS.forEach((m) => {
          if (m.cat === "1min") {
            // 1-min markets cycle off wall-clock
            next[m.id] = 59 - (Math.floor(Date.now() / 1000) % 60);
            if (next[m.id] < 0) next[m.id] = 59;
          } else if (next[m.id] > 0) {
            next[m.id]--;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const filtered = useCallback(
    (cat: string) => cat === "all" ? MARKETS : MARKETS.filter((m) => m.cat === cat),
    []
  );

  const refresh = useCallback(() => {
    // In production: trigger a re-fetch from RialoClient.fetchAllMarkets()
    console.log("[useMarkets] refresh triggered");
  }, []);

  return { markets: MARKETS, timers, filtered, refresh };
}

/**
 * useMarketTimer — single-market countdown for detail views / bet panels.
 */
export function useMarketTimer(endSecs: number, is1Min: boolean): number {
  const [secs, setSecs] = useState(is1Min ? 59 - (Math.floor(Date.now() / 1000) % 60) : endSecs);

  useEffect(() => {
    const iv = setInterval(() => {
      if (is1Min) {
        setSecs(59 - (Math.floor(Date.now() / 1000) % 60));
      } else {
        setSecs((s) => Math.max(0, s - 1));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [is1Min]);

  return secs;
}
