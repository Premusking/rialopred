import { useState, useEffect, useCallback, useRef } from "react";

export type AssetKey = "BTC" | "ETH" | "USDNGN" | "SOL";

export interface AssetConfig {
  sym:   string;
  step:  number;                        // max % move per tick
  fmt:   (v: number) => string;
  color: string;
}

export const ASSET_CONFIG: Record<AssetKey, AssetConfig> = {
  BTC:    { sym: "BTC/USDT", step: 0.003, fmt: (v) => "$" + Math.round(v).toLocaleString(),              color: "#f7c948" },
  ETH:    { sym: "ETH/USDT", step: 0.004, fmt: (v) => "$" + v.toFixed(2),                                color: "#4f8ef7" },
  USDNGN: { sym: "USD/NGN",  step: 0.002, fmt: (v) => "₦" + Math.round(v).toLocaleString(),              color: "#00e5a0" },
  SOL:    { sym: "SOL/USDT", step: 0.005, fmt: (v) => "$" + v.toFixed(2),                                color: "#c084fc" },
};

export interface OHLCV {
  o: number; h: number; l: number; c: number; v: number;
  timestamp: number;
}

export interface PriceState {
  prices:    Record<AssetKey, number>;
  changes:   Record<AssetKey, number>;   // % change from session open
  candles:   Record<AssetKey, OHLCV[]>;
}

const INITIAL_PRICES: Record<AssetKey, number> = {
  BTC: 105_420, ETH: 3_840, USDNGN: 1_580, SOL: 178.40,
};

function genCandles(asset: AssetKey, n: number, startPrice?: number): OHLCV[] {
  let p = startPrice ?? INITIAL_PRICES[asset];
  const step = ASSET_CONFIG[asset].step;
  const candles: OHLCV[] = [];
  for (let i = 0; i < n; i++) {
    const o   = p;
    const chg = (Math.random() - 0.5) * p * step;
    const h   = o + Math.abs(chg) * 1.4 + Math.random() * p * 0.0005;
    const l   = o - Math.abs(chg) * 1.4 - Math.random() * p * 0.0005;
    const c   = o + chg;
    p = c;
    candles.push({
      o: +o.toFixed(2), h: +h.toFixed(2),
      l: +l.toFixed(2), c: +c.toFixed(2),
      v: +(Math.random() * 2 + 0.2).toFixed(2),
      timestamp: Date.now() - (n - i) * 60_000,
    });
  }
  return candles;
}

/**
 * usePrices — live price feed for all assets.
 *
 * In production: replace setInterval tick with a WebSocket subscription to
 * Rialo's on-chain price oracle or Binance/CoinGecko WS feed.
 *
 * Example production integration:
 *   const ws = new WebSocket("wss://stream.binance.com:9443/stream?streams=btcusdt@kline_1m/ethusdt@kline_1m");
 *   ws.onmessage = (msg) => { const { k } = JSON.parse(msg.data).data; updateCandle(k); };
 */
export function usePrices(tickIntervalMs: number = 1200): PriceState & {
  addCandle:  (asset: AssetKey) => void;
  getOddsColor: (asset: AssetKey) => string;
} {
  const [state, setState] = useState<PriceState>(() => {
    const prices   = { ...INITIAL_PRICES } as Record<AssetKey, number>;
    const changes  = { BTC: 0, ETH: 0, USDNGN: 0, SOL: 0 } as Record<AssetKey, number>;
    const candles: Record<AssetKey, OHLCV[]> = {
      BTC: genCandles("BTC", 40), ETH: genCandles("ETH", 40),
      USDNGN: genCandles("USDNGN", 40), SOL: genCandles("SOL", 40),
    };
    return { prices, changes, candles };
  });

  const openPricesRef = useRef<Record<AssetKey, number>>({ ...INITIAL_PRICES });

  useEffect(() => {
    const iv = setInterval(() => {
      setState((prev) => {
        const prices  = { ...prev.prices };
        const changes = { ...prev.changes };
        const candles = { ...prev.candles };

        (Object.keys(ASSET_CONFIG) as AssetKey[]).forEach((a) => {
          const step = ASSET_CONFIG[a].step;
          const chg  = (Math.random() - 0.5) * prices[a] * step;
          prices[a]  = +(prices[a] + chg).toFixed(a === "USDNGN" ? 0 : 2);

          // Update % change from session open
          changes[a] = +((prices[a] - openPricesRef.current[a]) / openPricesRef.current[a] * 100).toFixed(4);

          // Extend the latest candle
          const cs = candles[a];
          if (cs.length > 0) {
            const last = { ...cs[cs.length - 1] };
            last.c = prices[a];
            last.h = Math.max(last.h, prices[a]);
            last.l = Math.min(last.l, prices[a]);
            candles[a] = [...cs.slice(0, -1), last];
          }
        });

        return { prices, changes, candles };
      });
    }, tickIntervalMs);

    return () => clearInterval(iv);
  }, [tickIntervalMs]);

  const addCandle = useCallback((asset: AssetKey) => {
    setState((prev) => {
      const last    = prev.candles[asset].at(-1);
      const newOpen = last?.c ?? prev.prices[asset];
      const newCandle = genCandles(asset, 1, newOpen)[0];
      newCandle.timestamp = Date.now();
      const candles = {
        ...prev.candles,
        [asset]: [...prev.candles[asset].slice(-59), newCandle],
      };
      return { ...prev, candles };
    });
  }, []);

  // New 1-min candle every 60s
  useEffect(() => {
    const iv = setInterval(() => {
      (Object.keys(ASSET_CONFIG) as AssetKey[]).forEach(addCandle);
    }, 60_000);
    return () => clearInterval(iv);
  }, [addCandle]);

  const getOddsColor = useCallback((asset: AssetKey) => {
    return state.changes[asset] >= 0 ? "#00e5a0" : "#ff4d6d";
  }, [state.changes]);

  return { ...state, addCandle, getOddsColor };
}

/**
 * useOrderBook — simulated order book for a given asset price.
 * In production: subscribe to Binance/Rialo DEX order book WebSocket.
 */
export function useOrderBook(midPrice: number, asset: AssetKey, depth: number = 8) {
  const [book, setBook] = useState<{
    asks: { price: number; size: number; total: number }[];
    bids: { price: number; size: number; total: number }[];
    spread: number;
  }>({ asks: [], bids: [], spread: 0 });

  useEffect(() => {
    const rebuild = () => {
      const asks: typeof book.asks = [];
      const bids: typeof book.bids = [];
      let ca = 0, cb = 0;
      for (let i = 0; i < depth; i++) {
        const spread = midPrice * (0.00008 + i * 0.00006);
        const asz  = +(Math.random() * 2.4 + 0.1).toFixed(3); ca += asz;
        asks.push({ price: +(midPrice + spread).toFixed(2), size: asz, total: +ca.toFixed(3) });
        const bsz  = +(Math.random() * 2.4 + 0.1).toFixed(3); cb += bsz;
        bids.push({ price: +(midPrice - spread).toFixed(2), size: bsz, total: +cb.toFixed(3) });
      }
      const spread = asks[0].price - bids[0].price;
      setBook({ asks, bids, spread });
    };
    rebuild();
    const iv = setInterval(rebuild, 2000);
    return () => clearInterval(iv);
  }, [midPrice, depth]);

  return book;
}

/**
 * useTicker — market-wide ticker items for the header ticker strip.
 */
export interface TickerItem {
  sym:   string;
  price: string;
  pct:   string;
  up:    boolean;
}

export function useTicker(): TickerItem[] {
  const { prices, changes } = usePrices(3000);
  const static_extras: TickerItem[] = [
    { sym: "BNB/USDT", price: "$624.10", pct: "-0.45%", up: false },
    { sym: "XRP/USDT", price: "$0.618",  pct: "+2.10%", up: true  },
    { sym: "GOLD",     price: "$2,358",  pct: "+0.12%", up: true  },
    { sym: "OIL/WTI",  price: "$84.20",  pct: "+0.87%", up: true  },
    { sym: "S&P500",   price: "5,892",   pct: "-0.31%", up: false },
  ];
  const live: TickerItem[] = (Object.keys(ASSET_CONFIG) as AssetKey[]).map((a) => ({
    sym:   ASSET_CONFIG[a].sym,
    price: ASSET_CONFIG[a].fmt(prices[a]),
    pct:   `${changes[a] >= 0 ? "+" : ""}${changes[a].toFixed(3)}%`,
    up:    changes[a] >= 0,
  }));
  return [...live, ...static_extras];
}
