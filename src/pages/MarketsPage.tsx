import { useState, useEffect, useRef } from "react";
import { MARKETS, CAT_META, fmtPool, fmtTimer, type Market, type MarketCategory } from "../lib/markets";
import { useWallet } from "../components/WalletProvider";

const CATS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "1min", label: "⚡ 1-Min" },
  { id: "crypto", label: "Crypto" },
  { id: "sports", label: "Sports" },
  { id: "worldcup", label: "⚽ World Cup" },
  { id: "wrestling", label: "Wrestling" },
  { id: "politics", label: "Politics" },
  { id: "economy", label: "Economy" },
];

interface Props { showToast: (msg: string) => void; }

export function MarketsPage({ showToast }: Props) {
  const { connected } = useWallet();
  const [cat, setCat] = useState("all");
  const [selMkt, setSelMkt] = useState<Market | null>(null);
  const [selOut, setSelOut] = useState<string | null>(null);
  const [selOdds, setSelOdds] = useState(1);
  const [betAmt, setBetAmt] = useState(50);
  const [bets, setBets] = useState<any[]>([]);
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);

  const filtered = cat === "all" ? MARKETS : MARKETS.filter((m) => m.cat === cat);

  // Timer tick
  useEffect(() => {
    const init: Record<string, number> = {};
    MARKETS.forEach((m) => { init[m.id] = m.endSecs; });
    setTimers(init);
    const iv = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        MARKETS.forEach((m) => {
          if (m.cat === "1min") {
            next[m.id] = 59 - (Math.floor(Date.now() / 1000) % 60);
          } else if (next[m.id] > 0) {
            next[m.id]--;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const pick = (m: Market, outcome: string, odds: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelMkt(m); setSelOut(outcome); setSelOdds(odds);
  };

  const placeBet = async () => {
    if (!connected) { showToast("Connect wallet first"); return; }
    if (!selMkt || !selOut) return;
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setBets((p) => [{ mkt: selMkt.title, out: selOut, amt: betAmt, odds: selOdds, pot: (betAmt * selOdds).toFixed(2), ts: "just now" }, ...p]);
    showToast(`Bet placed: $${betAmt} on ${selOut} @ ${selOdds.toFixed(2)}x`);
    setSelOut(null); setSelMkt(null);
    setPlacing(false);
  };

  const catMeta = (m: Market) => CAT_META[m.cat];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", minHeight: "calc(100vh - 98px)" }}>
      {/* Feed */}
      <div style={{ padding: "14px 20px", overflowY: "auto", maxHeight: "calc(100vh - 98px)" }}>
        {/* Category filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
          {CATS.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              padding: "4px 12px", borderRadius: 5, border: "1px solid var(--b2)",
              background: cat === c.id ? "var(--s3)" : "transparent",
              color: cat === c.id ? "var(--tx)" : "var(--mu)",
              fontFamily: "var(--ff)", fontSize: 12, cursor: "pointer", transition: "all .12s",
            }}>{c.label}</button>
          ))}
        </div>

        {/* Market cards */}
        {filtered.map((m) => {
          const secs = timers[m.id] ?? m.endSecs;
          const yRatio = 0.3 + Math.sin(m.id.charCodeAt(1)) * 0.2 + 0.2;
          const meta = catMeta(m);
          return (
            <div key={m.id} style={{
              background: "var(--s1)", border: `1px solid ${selMkt?.id === m.id ? "var(--ac)" : "var(--b1)"}`,
              borderRadius: 10, padding: 14, marginBottom: 8, cursor: "pointer", transition: "border-color .15s",
            }} onClick={() => setSelMkt(m)}>
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                    {m.cat === "1min" && <span className="live-dot" />}
                    <span style={{ padding: "2px 7px", borderRadius: 3, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30`, fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                      {meta.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{m.title}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "var(--fm)", fontSize: 14, fontWeight: 500 }}>{fmtPool(m.pool)}</div>
                  <div style={{ fontSize: 10, color: "var(--mu)" }}>pool</div>
                </div>
              </div>

              {/* Outcome buttons */}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                {m.outcomes.map((o, i) => {
                  const isPicked = selMkt?.id === m.id && selOut === o;
                  const isYes = i === 0 && m.type === "binary";
                  const isNo  = i === 1 && m.type === "binary";
                  return (
                    <button key={o} onClick={(e) => pick(m, o, m.odds[i], e)} style={{
                      flex: 1, minWidth: 72, padding: "7px 8px", borderRadius: 7,
                      border: `1px solid ${isPicked ? (isYes ? "var(--gn)" : isNo ? "var(--rd)" : "var(--ac)") : "var(--b2)"}`,
                      background: isPicked ? (isYes ? "#00e5a012" : isNo ? "#ff4d6d12" : "#00e5a012") : "var(--s2)",
                      cursor: "pointer", textAlign: "center", transition: "all .12s", fontFamily: "var(--ff)",
                    }}>
                      <div style={{ fontSize: 10, color: "var(--mu)" }}>{o}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: isYes ? "var(--gn)" : isNo ? "var(--rd)" : "var(--tx)" }}>
                        {m.odds[i].toFixed(2)}x
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div style={{ height: 3, borderRadius: 2, background: "var(--s3)", display: "flex", overflow: "hidden", marginBottom: 3 }}>
                <div style={{ width: `${(yRatio * 100).toFixed(0)}%`, background: "var(--gn)", transition: "width .5s" }} />
                <div style={{ flex: 1, background: "var(--rd)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "var(--fm)", color: "var(--mu)", marginBottom: 6 }}>
                <span style={{ color: "var(--gn)" }}>{(yRatio * 100).toFixed(0)}%</span>
                <span style={{ color: "var(--rd)" }}>{((1 - yRatio) * 100).toFixed(0)}%</span>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--mu)" }}>
                <span style={{ fontFamily: "var(--fm)", color: secs < 30 ? "var(--rd)" : "var(--a4)" }}>{fmtTimer(secs)}</span>
                <span>👥 {m.participants.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sidebar */}
      <div className="desktop-only" style={{ borderLeft: "1px solid var(--b1)", padding: 14, overflowY: "auto", maxHeight: "calc(100vh - 98px)" }}>
        <div className="section-label">Place Bet</div>
        <div style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          {!selOut ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--mu)", fontSize: 12 }}>
              <div style={{ fontSize: 24, opacity: .4, marginBottom: 8 }}>🎯</div>
              Pick an outcome to bet
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, lineHeight: 1.4, padding: "8px 10px", background: "var(--s2)", borderRadius: 6, borderLeft: "3px solid var(--ac)", marginBottom: 10 }}>{selMkt?.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 11 }}>
                <span>Outcome:</span>
                <span style={{ padding: "2px 8px", borderRadius: 4, background: "#00e5a020", color: "var(--ac)", fontWeight: 700, fontSize: 11 }}>{selOut}</span>
                <span style={{ color: "var(--a4)", fontFamily: "var(--fm)", fontSize: 11 }}>@ {selOdds.toFixed(2)}x</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: "var(--mu)", width: 60 }}>Stake</label>
                <input type="number" value={betAmt} min={1} max={1000}
                  onChange={(e) => setBetAmt(Math.max(1, +e.target.value || 50))}
                  className="field" style={{ flex: 1 }} />
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                {[10, 25, 50, 100, 250].map((v) => (
                  <button key={v} onClick={() => setBetAmt(v)} style={{
                    flex: 1, padding: "4px 0", borderRadius: 5, border: "1px solid var(--b1)",
                    background: "var(--s2)", color: "var(--mu)", fontSize: 10,
                    fontFamily: "var(--fm)", cursor: "pointer",
                  }}>{v}</button>
                ))}
              </div>
              {[["Stake", `$${betAmt}`], ["Odds", `${selOdds.toFixed(2)}x`], ["Potential win", `$${(betAmt * selOdds).toFixed(2)}`], ["Net profit", `+$${(betAmt * (selOdds - 1)).toFixed(2)}`]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0", borderBottom: "1px solid var(--b1)" }}>
                  <span style={{ color: "var(--mu)" }}>{l}</span>
                  <span style={{ fontFamily: "var(--fm)", color: l.includes("win") || l.includes("profit") ? "var(--gn)" : "var(--tx)" }}>{v}</span>
                </div>
              ))}
              <button onClick={placeBet} disabled={placing} style={{
                width: "100%", marginTop: 10, padding: 10, borderRadius: 7, border: "none",
                background: placing ? "var(--a4)" : "var(--ac)", color: "#000",
                fontFamily: "var(--ff)", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>{placing ? "Signing tx…" : "Place Bet on Rialo ↗"}</button>
            </>
          )}
        </div>

        <div className="section-label">My Recent Bets</div>
        {bets.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--mu)", padding: "8px 0" }}>No bets yet</div>
        ) : bets.slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--b1)", fontSize: 11 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{b.out}</div>
              <div style={{ color: "var(--mu)", fontSize: 10, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.mkt}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--mu)", fontFamily: "var(--fm)", fontSize: 10 }}>${b.amt}</div>
              <div style={{ color: "var(--a4)", fontFamily: "var(--fm)" }}>→${b.pot}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
