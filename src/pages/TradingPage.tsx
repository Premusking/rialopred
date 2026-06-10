import { useState, useEffect, useRef } from "react";
import { useWallet } from "../components/WalletProvider";

const ASSETS = {
  BTC:    { sym: "BTC/USDT",  price: 105420, step: 0.003, fmt: (v: number) => "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
  ETH:    { sym: "ETH/USDT",  price: 3840,   step: 0.004, fmt: (v: number) => "$" + v.toFixed(2) },
  USDNGN: { sym: "USD/NGN",   price: 1580,   step: 0.002, fmt: (v: number) => "₦" + v.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
  SOL:    { sym: "SOL/USDT",  price: 178.40, step: 0.005, fmt: (v: number) => "$" + v.toFixed(2) },
};
type AssetKey = keyof typeof ASSETS;

interface Candle { o: number; h: number; l: number; c: number; v: number; }

interface Props { showToast: (msg: string) => void; }

function genCandles(asset: AssetKey, n: number): Candle[] {
  let p = ASSETS[asset].price;
  const candles: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const o = p; const chg = (Math.random() - .5) * p * ASSETS[asset].step;
    const h = o + Math.abs(chg) * 1.5 + Math.random() * p * .001;
    const l = o - Math.abs(chg) * 1.5 - Math.random() * p * .001;
    const c = o + chg; p = c;
    candles.push({ o: +o.toFixed(2), h: +h.toFixed(2), l: +l.toFixed(2), c: +c.toFixed(2), v: +(Math.random() * 2 + .2).toFixed(2) });
  }
  return candles;
}

export function TradingPage({ showToast }: Props) {
  const { connected } = useWallet();
  const [asset, setAsset] = useState<AssetKey>("BTC");
  const [prices, setPrices] = useState({ BTC: 105420, ETH: 3840, USDNGN: 1580, SOL: 178.40 });
  const [candles, setCandles] = useState<Record<AssetKey, Candle[]>>({
    BTC: genCandles("BTC", 40), ETH: genCandles("ETH", 40), USDNGN: genCandles("USDNGN", 40), SOL: genCandles("SOL", 40),
  });
  const [countdown, setCountdown] = useState(59);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Price tick
  useEffect(() => {
    const iv = setInterval(() => {
      setPrices((prev) => {
        const next = { ...prev };
        (Object.keys(ASSETS) as AssetKey[]).forEach((a) => {
          next[a] = +(prev[a] + (Math.random() - .5) * prev[a] * ASSETS[a].step).toFixed(a === "USDNGN" ? 0 : 2);
        });
        return next;
      });
      setCountdown((c) => (c <= 0 ? 59 : c - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Redraw candle chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth; const H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const data = candles[asset];
    if (!data.length) return;
    const padL = 60, padR = 8, padT = 10, padB = 24;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const n = data.length;
    const candleW = Math.max(2, chartW / n * 0.7);
    const gap = chartW / n;

    const allHigh = Math.max(...data.map(d => d.h));
    const allLow  = Math.min(...data.map(d => d.l));
    const range   = allHigh - allLow || 1;
    const toY     = (v: number) => padT + (1 - (v - allLow) / range) * chartH;

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath(); ctx.strokeStyle = "#ffffff08"; ctx.lineWidth = 1;
      ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      const val = allHigh - (range / 4) * i;
      ctx.fillStyle = "#6b7280"; ctx.font = "9px JetBrains Mono, monospace"; ctx.textAlign = "right";
      ctx.fillText(ASSETS[asset].fmt(val), padL - 4, y + 3);
    }

    // Candles
    data.forEach((d, i) => {
      const x = padL + i * gap + gap / 2;
      const isUp = d.c >= d.o;
      const col  = isUp ? "#00e5a0" : "#ff4d6d";
      const yO = toY(d.o); const yC = toY(d.c); const yH = toY(d.h); const yL = toY(d.l);
      // Wick
      ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();
      // Body
      const bodyTop = Math.min(yO, yC); const bodyH = Math.max(1, Math.abs(yO - yC));
      ctx.fillStyle = col;
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    });

    // X labels
    ctx.fillStyle = "#6b7280"; ctx.font = "9px JetBrains Mono"; ctx.textAlign = "center";
    [0, Math.floor(n/3), Math.floor(2*n/3), n-1].forEach(i => {
      const x = padL + i * gap + gap / 2;
      ctx.fillText(`T-${n-1-i}`, x, H - 4);
    });
  }, [candles, asset]);

  const quickBet = (dir: "UP" | "DOWN") => {
    if (!connected) { showToast("Connect wallet to bet"); return; }
    showToast(`1-min ${dir} on ${asset} placed! 1.9x payout`);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", minHeight: "calc(100vh - 98px)" }}>
      <div style={{ borderRight: "1px solid var(--b1)", overflowY: "auto", maxHeight: "calc(100vh - 98px)" }}>
        {/* Asset tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--b1)" }}>
          {(Object.keys(ASSETS) as AssetKey[]).map((a) => {
            const prev = ASSETS[a].price; const curr = prices[a];
            const pct  = ((curr - prev) / prev * 100).toFixed(3);
            return (
              <button key={a} onClick={() => setAsset(a)} style={{
                padding: "10px 14px", border: "none", background: "transparent",
                borderBottom: asset === a ? "2px solid var(--ac)" : "2px solid transparent",
                color: asset === a ? "var(--ac)" : "var(--mu)",
                fontFamily: "var(--ff)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 2,
              }}>
                <span>{a.replace("USDNGN","USD/NGN")}</span>
                <span style={{ fontFamily: "var(--fm)", fontSize: 10 }}>{ASSETS[a].fmt(curr)}</span>
                <span style={{ fontFamily: "var(--fm)", fontSize: 9, color: +pct >= 0 ? "var(--gn)" : "var(--rd)" }}>
                  {+pct >= 0 ? "+" : ""}{pct}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{ASSETS[asset].sym}</div>
              <div style={{ fontFamily: "var(--fm)", fontSize: 22, fontWeight: 500 }}>{ASSETS[asset].fmt(prices[asset])}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--rd)" }}>
              <span className="live-dot" />LIVE
            </div>
          </div>
          <div style={{ position: "relative", height: 220, width: "100%", background: "var(--s2)", borderRadius: 8, overflow: "hidden" }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} role="img" aria-label={`${ASSETS[asset].sym} candlestick chart`} />
          </div>
        </div>

        {/* Order book */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--b1)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mu2)", marginBottom: 10 }}>ORDER BOOK</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 10, color: "var(--mu)", paddingBottom: 4, borderBottom: "1px solid var(--b1)", marginBottom: 4 }}>
            <span>Price</span><span style={{ textAlign: "right" }}>Size</span><span style={{ textAlign: "right" }}>Total</span>
          </div>
          {Array.from({ length: 5 }, (_, i) => {
            const spread = prices[asset] * (0.0001 + i * 0.00008);
            const sz = (Math.random() * 2 + .1).toFixed(3);
            const ap = +(prices[asset] + spread).toFixed(2);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, fontFamily: "var(--fm)", padding: "3px 0", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: `${20 + i * 12}%`, background: "#ff4d6d08", borderRadius: 2 }} />
                <span style={{ color: "var(--rd)" }}>{ASSETS[asset].fmt(ap)}</span>
                <span style={{ textAlign: "right", color: "var(--mu2)" }}>{sz}</span>
                <span style={{ textAlign: "right", color: "var(--mu)" }}>{(+sz * 2.1).toFixed(3)}</span>
              </div>
            );
          })}
          <div style={{ textAlign: "center", padding: "6px 0", fontFamily: "var(--fm)", fontSize: 10, color: "var(--a4)", borderTop: "1px solid var(--b1)", borderBottom: "1px solid var(--b1)", margin: "4px 0" }}>
            Spread: {ASSETS[asset].fmt(prices[asset] * 0.0001)}
          </div>
          {Array.from({ length: 5 }, (_, i) => {
            const spread = prices[asset] * (0.0001 + i * 0.00008);
            const sz = (Math.random() * 2 + .1).toFixed(3);
            const bp = +(prices[asset] - spread).toFixed(2);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, fontFamily: "var(--fm)", padding: "3px 0", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${20 + i * 12}%`, background: "#00e5a008", borderRadius: 2 }} />
                <span style={{ color: "var(--gn)" }}>{ASSETS[asset].fmt(bp)}</span>
                <span style={{ textAlign: "right", color: "var(--mu2)" }}>{sz}</span>
                <span style={{ textAlign: "right", color: "var(--mu)" }}>{(+sz * 2.1).toFixed(3)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar */}
      <div className="desktop-only" style={{ padding: 14, overflowY: "auto", maxHeight: "calc(100vh - 98px)" }}>
        <div className="section-label">1-Min Prediction</div>
        <div style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--fm)", fontSize: 34, fontWeight: 500, color: "var(--a4)" }}>
              00:{String(countdown).padStart(2, "0")}
            </div>
            <div style={{ fontSize: 10, color: "var(--mu)", marginTop: 2 }}>until close</div>
            <div style={{ height: 4, background: "var(--s3)", borderRadius: 2, margin: "8px 0", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "var(--a4)", width: `${(countdown / 59) * 100}%`, borderRadius: 2, transition: "width 1s linear" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button onClick={() => quickBet("UP")} style={{ flex: 1, padding: 10, borderRadius: 7, border: "none", background: "var(--gn)", color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--ff)" }}>
              ↑ UP
            </button>
            <button onClick={() => quickBet("DOWN")} style={{ flex: 1, padding: 10, borderRadius: 7, border: "1px solid var(--rd)", background: "transparent", color: "var(--rd)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--ff)" }}>
              ↓ DOWN
            </button>
          </div>
          {[["Price", ASSETS[asset].fmt(prices[asset])], ["UP payout", "1.92x"], ["DOWN payout", "1.88x"], ["Pool", "$48.2K"]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--b1)", fontSize: 11 }}>
              <span style={{ color: "var(--mu)" }}>{l}</span>
              <span style={{ fontFamily: "var(--fm)" }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="section-label">Quick Stats</div>
        <div style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 10, padding: 12 }}>
          {[["24h volume","$2.4M"],["Active mkts","17"],["Total bets","1,842"],["Resolved","94"],["Network","Rialo DevNet"]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--b1)", fontSize: 11 }}>
              <span style={{ color: "var(--mu)" }}>{l}</span>
              <span style={{ fontFamily: "var(--fm)", color: l === "Network" ? "var(--a3)" : "var(--tx)" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
