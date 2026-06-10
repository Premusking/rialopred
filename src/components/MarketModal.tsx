import { useState, useEffect, useRef } from "react";
import { type Market, CAT_META, fmtPool, fmtTimer } from "../lib/markets";
import { useWallet } from "./WalletProvider";

interface Props {
  market:    Market;
  onClose:   () => void;
  showToast: (msg: string) => void;
}

export function MarketModal({ market, onClose, showToast }: Props) {
  const { connected } = useWallet();
  const [selOut, setSelOut]   = useState<string | null>(null);
  const [selOdds, setSelOdds] = useState(1);
  const [betAmt, setBetAmt]   = useState(50);
  const [placing, setPlacing] = useState(false);
  const [secs, setSecs]       = useState(market.endSecs);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Timer
  useEffect(() => {
    const iv = setInterval(() => {
      if (market.cat === "1min") {
        setSecs(59 - (Math.floor(Date.now() / 1000) % 60));
      } else {
        setSecs((s) => Math.max(0, s - 1));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [market.cat]);

  // Draw odds history sparkline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Simulate odds history
    const n = 24;
    const baseRatio = 0.35 + Math.sin(market.id.charCodeAt(1)) * 0.15 + 0.15;
    const data = Array.from({ length: n }, (_, i) => {
      const noise = (Math.random() - 0.5) * 0.12;
      return Math.max(0.05, Math.min(0.95, baseRatio + noise + (i / n) * 0.05));
    });

    const pad = { t: 8, r: 8, b: 20, l: 36 };
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
    const min = Math.max(0, Math.min(...data) - 0.05);
    const max = Math.min(1, Math.max(...data) + 0.05);
    const toX = (i: number) => pad.l + (i / (n - 1)) * cW;
    const toY = (v: number) => pad.t + (1 - (v - min) / (max - min)) * cH;

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH / 4) * i;
      ctx.beginPath(); ctx.strokeStyle = "#ffffff08"; ctx.lineWidth = 1;
      ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      const pct = Math.round((max - (max - min) / 4 * i) * 100);
      ctx.fillStyle = "#6b7280"; ctx.font = "9px JetBrains Mono,monospace";
      ctx.textAlign = "right"; ctx.fillText(pct + "%", pad.l - 3, y + 3);
    }

    // YES line
    ctx.beginPath(); ctx.strokeStyle = "#00e5a0"; ctx.lineWidth = 1.5; ctx.lineJoin = "round";
    data.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)); });
    ctx.stroke();

    // Fill under line
    ctx.beginPath();
    data.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)); });
    ctx.lineTo(toX(n - 1), pad.t + cH);
    ctx.lineTo(toX(0), pad.t + cH);
    ctx.closePath();
    ctx.fillStyle = "#00e5a012"; ctx.fill();

    // X labels
    ctx.fillStyle = "#6b7280"; ctx.font = "8px JetBrains Mono"; ctx.textAlign = "center";
    [0, 6, 12, 18, 23].forEach((i) => {
      ctx.fillText(`${23 - i}h`, toX(i), H - 3);
    });
  }, [market]);

  const doBet = async () => {
    if (!connected) { showToast("Connect wallet first"); return; }
    if (!selOut) return;
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1500));
    showToast(`Bet placed: $${betAmt} on ${selOut} @ ${selOdds.toFixed(2)}x`);
    setPlacing(false);
    onClose();
  };

  const meta     = CAT_META[market.cat];
  const yesRatio = 0.3 + Math.sin(market.id.charCodeAt(1)) * 0.2 + 0.2;
  const txId     = "0x" + Math.random().toString(16).slice(2, 10).toUpperCase();

  return (
    /* faux-viewport overlay — contributes layout height so iframe doesn't collapse */
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.72)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: 600,
    }}>
      <div style={{
        background: "var(--s1)", border: "1px solid var(--b2)", borderRadius: 14,
        padding: 20, width: 520, maxWidth: "95vw", position: "relative",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 12, width: 26, height: 26,
          borderRadius: 6, border: "1px solid var(--b1)", background: "var(--s2)",
          color: "var(--mu)", cursor: "pointer", fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>

        {/* Badge + title */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          {market.cat === "1min" && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--rd)" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--rd)", display: "inline-block" }} />
              LIVE
            </span>
          )}
          <span style={{ padding: "2px 7px", borderRadius: 3, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30`, fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            {meta.label}
          </span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, marginBottom: 14, paddingRight: 28 }}>
          {market.title}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
          {[
            { l: "Total Pool",    v: fmtPool(market.pool),              c: "var(--tx)" },
            { l: "Participants",  v: market.participants.toLocaleString(), c: "var(--tx)" },
            { l: "Closes In",     v: fmtTimer(secs),                    c: secs < 60 ? "var(--rd)" : "var(--a4)" },
          ].map((s) => (
            <div key={s.l} style={{ background: "var(--s2)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--fm)", fontSize: 16, fontWeight: 600, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: "var(--mu)", marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Odds history chart */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--mu2)", letterSpacing: 1, marginBottom: 6 }}>
            YES PROBABILITY — 24H
          </div>
          <div style={{ position: "relative", height: 100, background: "var(--s2)", borderRadius: 8, overflow: "hidden" }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }}
              role="img" aria-label={`${market.title} — odds history over 24 hours`} />
          </div>
        </div>

        {/* Outcome buttons */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(market.outcomes.length, 4)}, 1fr)`, gap: 8, marginBottom: 14 }}>
          {market.outcomes.map((o, i) => {
            const isPicked = selOut === o;
            const isYes    = i === 0 && market.type === "binary";
            const isNo     = i === 1 && market.type === "binary";
            const borderC  = isPicked ? (isYes ? "var(--gn)" : isNo ? "var(--rd)" : "var(--ac)") : "var(--b2)";
            const bgC      = isPicked ? (isYes ? "#00e5a012" : isNo ? "#ff4d6d12" : "#00e5a012") : "var(--s2)";
            return (
              <div key={o} onClick={() => { setSelOut(o); setSelOdds(market.odds[i]); }}
                style={{ padding: "10px 8px", borderRadius: 8, border: `1px solid ${borderC}`, background: bgC, cursor: "pointer", textAlign: "center", transition: "all .12s" }}>
                <div style={{ fontSize: 11, color: "var(--mu)" }}>{o}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color: isYes ? "var(--gn)" : isNo ? "var(--rd)" : "var(--tx)" }}>
                  {market.odds[i].toFixed(2)}x
                </div>
                <div style={{ fontSize: 9, color: "var(--mu)", marginTop: 2, fontFamily: "var(--fm)" }}>
                  {Math.round(i === 0 ? yesRatio * 100 : (1 - yesRatio) / (market.outcomes.length - 1) * 100)}% share
                </div>
              </div>
            );
          })}
        </div>

        {/* Bet panel — only when outcome selected */}
        {selOut && (
          <div style={{ background: "var(--s2)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 11 }}>
              Betting on:
              <span style={{ padding: "2px 8px", borderRadius: 4, background: "#00e5a020", color: "var(--ac)", fontWeight: 700, fontSize: 11 }}>{selOut}</span>
              <span style={{ color: "var(--a4)", fontFamily: "var(--fm)", fontSize: 11 }}>@ {selOdds.toFixed(2)}x</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: "var(--mu)", width: 50 }}>Stake</label>
              <input type="number" value={betAmt} min={1} max={1000}
                onChange={(e) => setBetAmt(Math.max(1, +e.target.value || 50))}
                style={{ flex: 1, background: "var(--s1)", border: "1px solid var(--b2)", borderRadius: 6, padding: "6px 10px", color: "var(--tx)", fontFamily: "var(--fm)", fontSize: 12, outline: "none" }} />
              <span style={{ fontSize: 11, color: "var(--mu)" }}>USDC</span>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
              {[10, 25, 50, 100, 250].map((v) => (
                <button key={v} onClick={() => setBetAmt(v)} style={{
                  flex: 1, padding: "4px 0", borderRadius: 5, border: "1px solid var(--b1)",
                  background: betAmt === v ? "var(--s3)" : "var(--s1)", color: betAmt === v ? "var(--tx)" : "var(--mu)",
                  fontSize: 11, fontFamily: "var(--fm)", cursor: "pointer",
                }}>{v}</button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0", borderBottom: "1px solid var(--b1)" }}>
              <span style={{ color: "var(--mu)" }}>Potential win</span>
              <span style={{ fontFamily: "var(--fm)", color: "var(--gn)", fontWeight: 600 }}>${(betAmt * selOdds).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0" }}>
              <span style={{ color: "var(--mu)" }}>Net profit</span>
              <span style={{ fontFamily: "var(--fm)", color: "var(--gn)" }}>+${(betAmt * (selOdds - 1)).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* On-chain info */}
        <div style={{ background: "var(--s2)", borderRadius: 8, padding: 10, fontSize: 10, color: "var(--mu)", lineHeight: 1.7, marginBottom: 14 }}>
          <span style={{ color: "var(--ac)", fontWeight: 700 }}>On-chain · Rialo DevNet</span> ·
          Contract: <span style={{ color: "var(--a3)", fontFamily: "var(--fm)" }}>PRED{txId}</span> ·
          Resolution: <span style={{ color: "var(--a3)", fontFamily: "var(--fm)" }}>Async HTTP oracle</span> ·
          Fee: <span style={{ color: "var(--a4)" }}>2%</span>
        </div>

        {/* CTA */}
        <button onClick={doBet} disabled={!selOut || placing}
          style={{
            width: "100%", padding: 12, borderRadius: 9, border: "none",
            background: placing ? "var(--a4)" : !selOut ? "var(--s3)" : "var(--ac)",
            color: !selOut ? "var(--mu)" : "#000",
            fontFamily: "var(--ff)", fontWeight: 800, fontSize: 14,
            cursor: selOut && !placing ? "pointer" : "default",
            transition: "opacity .15s",
          }}>
          {placing ? "Signing transaction…" : !selOut ? "Select an outcome above" : `Place $${betAmt} bet on Rialo ↗`}
        </button>
      </div>
    </div>
  );
}
