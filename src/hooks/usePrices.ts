import { useState, useEffect, useCallback, useRef } from "react";

export type AssetKey = "BTC" | "ETH" | "USDNGN" | "SOL";

export interface AssetConfig {
  sym:    string;
  step:   number;
  fmt:    (v: number) => string;
  color:  string;
  binSym: string; // Binance stream symbol
}

export const ASSET_CONFIG: Record<AssetKey, AssetConfig> = {
  BTC:    { sym: "BTC/USDT", step: 0.003, fmt: (v) => "$" + Math.round(v).toLocaleString(),  color: "#f7c948", binSym: "btcusdt" },
  ETH:    { sym: "ETH/USDT", step: 0.004, fmt: (v) => "$" + v.toFixed(2),                    color: "#4f8ef7", binSym: "ethusdt" },
  SOL:    { sym: "SOL/USDT", step: 0.005, fmt: (v) => "$" + v.toFixed(2),                    color: "#c084fc", binSym: "solusdt" },
  USDNGN: { sym: "USD/NGN",  step: 0.002, fmt: (v) => "₦" + Math.round(v).toLocaleString(),  color: "#00e5a0", binSym: "" },
};

// Reasonable fallbacks shown while WS connects
const FALLBACK_PRICES: Record<AssetKey, number> = {
  BTC: 105_000, ETH: 3_800, SOL: 175, USDNGN: 1_600,
};

export interface OHLCV {
  o: number; h: number; l: number; c: number; v: number;
  timestamp: number;
}

export interface PriceState {
  prices:  Record<AssetKey, number>;
  changes: Record<AssetKey, number>;
  candles: Record<AssetKey, OHLCV[]>;
}

function genCandles(asset: AssetKey, n: number, startPrice?: number): OHLCV[] {
  let p = startPrice ?? FALLBACK_PRICES[asset];
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

// Fetch USD/NGN from a CORS-friendly free endpoint
async function fetchNGN(): Promise<number> {
  try {
    // Use frankfurter.app — fully CORS open, no key needed
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=NGN", {
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    return data?.rates?.NGN ?? FALLBACK_PRICES.USDNGN;
  } catch {
    return FALLBACK_PRICES.USDNGN;
  }
}

export function usePrices(tickIntervalMs: number = 1200): PriceState & {
  addCandle:    (asset: AssetKey) => void;
  getOddsColor: (asset: AssetKey) => string;
} {
  const [state, setState] = useState<PriceState>(() => ({
    prices:  { ...FALLBACK_PRICES } as Record<AssetKey, number>,
    changes: { BTC: 0, ETH: 0, USDNGN: 0, SOL: 0 } as Record<AssetKey, number>,
    candles: {
      BTC:    genCandles("BTC",    40),
      ETH:    genCandles("ETH",    40),
      SOL:    genCandles("SOL",    40),
      USDNGN: genCandles("USDNGN", 40),
    },
  }));

  const openPricesRef = useRef<Record<AssetKey, number>>({ ...FALLBACK_PRICES });
  const wsRef         = useRef<WebSocket | null>(null);

  // ── Binance WebSocket for BTC / ETH / SOL ──────────────────────────────────
  useEffect(() => {
    // Combined stream: 3 mini-tickers in one connection
    const streams = ["btcusdt", "ethusdt", "solusdt"]
      .map(s => `${s}@ticker`)
      .join("/");
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        try {
          const msg  = JSON.parse(ev.data);
          const data = msg.data ?? msg;
          const sym: string = (data.s ?? "").toUpperCase(); // e.g. "BTCUSDT"
          const price = parseFloat(data.c ?? data.p ?? "0");
          if (!price) return;

          const keyMap: Record<string, AssetKey> = {
            BTCUSDT: "BTC", ETHUSDT: "ETH", SOLUSDT: "SOL",
          };
          const asset = keyMap[sym];
          if (!asset) return;

          setState((prev) => {
            const prices  = { ...prev.prices,  [asset]: price };
            const open    = openPricesRef.current[asset];
            // Set open price once on first real tick
            if (open === FALLBACK_PRICES[asset]) {
              openPricesRef.current[asset] = price;
            }
            const changePct = +((price - openPricesRef.current[asset]) / openPricesRef.current[asset] * 100).toFixed(4);
            const changes   = { ...prev.changes, [asset]: changePct };

            // Update last candle close
            const cs   = prev.candles[asset];
            const last = cs.length ? { ...cs[cs.length - 1], c: price, h: Math.max(cs[cs.length - 1].h, price), l: Math.min(cs[cs.length - 1].l, price) } : cs[0];
            const candles = { ...prev.candles, [asset]: [...cs.slice(0, -1), last] };

            return { prices, changes, candles };
          });
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = () => ws.close();
      ws.onclose = () => {
        // Reconnect after 3s if not intentionally closed
        setTimeout(() => { if (wsRef.current === ws) connect(); }, 3000);
      };
    };

    connect();
    return () => {
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
    };
  }, []);

  // ── USD/NGN — fetch on mount + every 5 min ─────────────────────────────────
  useEffect(() => {
    const apply = async () => {
      const rate = await fetchNGN();
      setState((prev) => ({
        ...prev,
        prices:  { ...prev.prices,  USDNGN: rate },
        changes: { ...prev.changes, USDNGN: +((rate - openPricesRef.current.USDNGN) / openPricesRef.current.USDNGN * 100).toFixed(4) },
      }));
      if (openPricesRef.current.USDNGN === FALLBACK_PRICES.USDNGN) {
        openPricesRef.current.USDNGN = rate;
      }
    };
    apply();
    const iv = setInterval(apply, 5 * 60_000);
    return () => clearInterval(iv);
  }, []);

  // ── Candle rotation every 60s ──────────────────────────────────────────────
  const addCandle = useCallback((asset: AssetKey) => {
    setState((prev) => {
      const last     = prev.candles[asset].at(-1);
      const newOpen  = last?.c ?? prev.prices[asset];
      const newC     = genCandles(asset, 1, newOpen)[0];
      newC.timestamp = Date.now();
      return {
        ...prev,
        candles: { ...prev.candles, [asset]: [...prev.candles[asset].slice(-59), newC] },
      };
    });
  }, []);

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

// ── Order book ─────────────────────────────────────────────────────────────────
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
        const sp  = midPrice * (0.00008 + i * 0.00006);
        const asz = +(Math.random() * 2.4 + 0.1).toFixed(3); ca += asz;
        asks.push({ price: +(midPrice + sp).toFixed(2), size: asz, total: +ca.toFixed(3) });
        const bsz = +(Math.random() * 2.4 + 0.1).toFixed(3); cb += bsz;
        bids.push({ price: +(midPrice - sp).toFixed(2), size: bsz, total: +cb.toFixed(3) });
      }
      setBook({ asks, bids, spread: asks[0].price - bids[0].price });
    };
    rebuild();
    const iv = setInterval(rebuild, 2000);
    return () => clearInterval(iv);
  }, [midPrice, depth]);

  return book;
}

// ── Ticker strip ───────────────────────────────────────────────────────────────
export interface TickerItem {
  sym:   string;
  price: string;
  pct:   string;
  up:    boolean;
}

export function useTicker(): TickerItem[] {
  const { prices, changes } = usePrices(3000);
  const extras: TickerItem[] = [
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
  return [...live, ...extras];
}
