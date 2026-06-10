import { useState } from "react";

// ─── Portfolio Page ──────────────────────────────────────────────────────────
export function PortfolioPage() {
  const BET_HISTORY = [
    { mkt:"ETH Higher in 60s?",            out:"YES",        amt:25,  pot:48.75, status:"win"     },
    { mkt:"Fed Rate Cut July 26",           out:"YES",        amt:50,  pot:105,   status:"win"     },
    { mkt:"BTC breaks $120K?",             out:"YES",        amt:25,  pot:60,    status:"loss"    },
    { mkt:"WWE — Cody Rhodes wins",        out:"Cody Rhodes", amt:30, pot:84,    status:"pending" },
    { mkt:"BTC Higher in 60s?",            out:"YES",        amt:50,  pot:96,    status:"pending" },
    { mkt:"US CPI above 3%?",              out:"NO",         amt:20,  pot:31.60, status:"pending" },
    { mkt:"2026 WC Winner — Brazil",       out:"Brazil",     amt:40,  pot:140,   status:"pending" },
    { mkt:"Djokovic wins Wimbledon",        out:"YES",        amt:30,  pot:84,    status:"win"     },
  ];
  const wins    = BET_HISTORY.filter(b => b.status === "win");
  const losses  = BET_HISTORY.filter(b => b.status === "loss");
  const pending = BET_HISTORY.filter(b => b.status === "pending");
  const pnl     = wins.reduce((s, b) => s + b.pot - b.amt, 0) - losses.reduce((s, b) => s + b.amt, 0);
  const wr      = wins.length ? Math.round(wins.length / (wins.length + losses.length) * 100) : 0;

  const stats = [
    { label:"Total P&L",    val: `${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(2)}`, color: pnl >= 0 ? "var(--gn)" : "var(--rd)" },
    { label:"Win Rate",     val: `${wr}%`,  color: "var(--a4)" },
    { label:"Total Staked", val: `$${BET_HISTORY.reduce((s, b) => s + b.amt, 0)}`, color: "var(--tx)" },
    { label:"Open Bets",    val: `${pending.length}`, color: "var(--a4)" },
    { label:"Wins",         val: `${wins.length}`,    color: "var(--gn)" },
    { label:"Losses",       val: `${losses.length}`,  color: "var(--rd)" },
  ];

  const scBadge = { win:"#00e5a020", loss:"#ff4d6d20", pending:"#f7c94820" };
  const scColor = { win:"var(--gn)", loss:"var(--rd)", pending:"var(--a4)" };
  const scLabel = { win:"Won", loss:"Lost", pending:"Pending" };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 860 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, color: "var(--mu)", letterSpacing: .5, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--fm)", color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Bet History</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 60px 80px 80px", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--b1)", fontSize: 10, color: "var(--mu)", textTransform: "uppercase", letterSpacing: .5 }}>
          <span>Market</span><span>Outcome</span><span>Stake</span><span>Potential</span><span>Status</span>
        </div>
        {BET_HISTORY.map((b, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 60px 80px 80px", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--b1)", fontSize: 12, alignItems: "center" }}>
            <span style={{ fontSize: 11, lineHeight: 1.3 }}>{b.mkt}</span>
            <span style={{ fontWeight: 600 }}>{b.out}</span>
            <span style={{ fontFamily: "var(--fm)", color: "var(--mu)" }}>${b.amt}</span>
            <span style={{ fontFamily: "var(--fm)", color: scColor[b.status as keyof typeof scColor] }}>${b.pot}</span>
            <span style={{ padding: "2px 7px", borderRadius: 3, background: scBadge[b.status as keyof typeof scBadge], color: scColor[b.status as keyof typeof scColor], fontSize: 10, fontWeight: 700, display: "inline-block" }}>
              {scLabel[b.status as keyof typeof scLabel]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Leaderboard Page ────────────────────────────────────────────────────────
export function LeaderboardPage() {
  const USERS = [
    { rank:1, name:"0xAbu",         addr:"0xA1...f9", streak:14, wr:73, bets:198, pnl:4820,  color:"#00e5a0" },
    { rank:2, name:"Kingsley.sol",  addr:"0xK9...21", streak:7,  wr:68, bets:142, pnl:2340,  color:"#4f8ef7" },
    { rank:3, name:"PredictKing",   addr:"0xP3...cc", streak:5,  wr:65, bets:310, pnl:1890,  color:"#f7c948" },
    { rank:4, name:"CryptoBet_NG",  addr:"0xCB...4e", streak:3,  wr:61, bets:87,  pnl:920,   color:"#ff6b35" },
    { rank:5, name:"SolanaOracle",  addr:"0xS7...b3", streak:2,  wr:58, bets:245, pnl:640,   color:"#c084fc" },
    { rank:6, name:"MktWizard",     addr:"0xMW...11", streak:0,  wr:54, bets:56,  pnl:210,   color:"#9ca3af" },
    { rank:7, name:"LagosTrader",   addr:"0xLT...7a", streak:1,  wr:51, bets:192, pnl:-180,  color:"#9ca3af" },
  ];
  const medals = ["🥇","🥈","🥉"];

  return (
    <div style={{ padding: "20px 24px", maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Top Predictors</span>
        <span style={{ fontFamily: "var(--fm)", fontSize: 11, color: "var(--mu)" }}>Updated every 5 min</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 70px 70px 60px 80px", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--b1)", fontSize: 10, color: "var(--mu)", textTransform: "uppercase", letterSpacing: .5 }}>
        <span>#</span><span>User</span><span>Streak</span><span>Win Rate</span><span>Bets</span><span>P&L</span>
      </div>
      {USERS.map((u) => (
        <div key={u.rank} style={{ display: "grid", gridTemplateColumns: "40px 1fr 70px 70px 60px 80px", gap: 8, padding: "12px 0", borderBottom: "1px solid var(--b1)", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--fm)", fontWeight: 700, fontSize: 14, color: u.rank <= 3 ? ["var(--a4)","var(--mu2)","#cd7f32"][u.rank-1] : "var(--mu)" }}>
            {u.rank <= 3 ? medals[u.rank-1] : u.rank}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: u.color + "20", border: `1.5px solid ${u.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: u.color, flexShrink: 0 }}>
              {u.name.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 10, color: "var(--mu)", fontFamily: "var(--fm)" }}>{u.addr}</div>
            </div>
          </div>
          <div style={{ fontFamily: "var(--fm)", fontSize: 12, color: "var(--a4)" }}>{u.streak > 0 ? `🔥 ${u.streak}` : u.streak}</div>
          <div style={{ fontFamily: "var(--fm)", fontSize: 12, color: "var(--mu2)" }}>{u.wr}%</div>
          <div style={{ fontFamily: "var(--fm)", fontSize: 12, color: "var(--mu)" }}>{u.bets}</div>
          <div style={{ fontFamily: "var(--fm)", fontSize: 12, fontWeight: 500, color: u.pnl >= 0 ? "var(--gn)" : "var(--rd)" }}>
            {u.pnl >= 0 ? "+" : ""}${Math.abs(u.pnl).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Resolved Page ───────────────────────────────────────────────────────────
export function ResolvedPage() {
  const RESOLVED = [
    { title:"ETH Higher in 60s? (14:23 UTC)", outcome:"YES", result:"Price UP +0.18%",         pool:18400,   winners:142,  payout:35200,   ts:"2m ago" },
    { title:"BTC Higher in 60s? (14:22 UTC)", outcome:"NO",  result:"Price DOWN -0.04%",        pool:22100,   winners:98,   payout:41200,   ts:"3m ago" },
    { title:"Will Fed cut rates June 2026?",   outcome:"NO",  result:"Fed held rates steady",    pool:1100000, winners:6820, payout:1870000, ts:"4h ago" },
    { title:"Djokovic wins Wimbledon R3?",      outcome:"YES", result:"Djokovic won 6-4 6-2",    pool:84000,   winners:1240, payout:148000,  ts:"6h ago" },
    { title:"USD/NGN above ₦1600 by Jun 5?",  outcome:"NO",  result:"Rate stayed at ₦1,580",   pool:42000,   winners:890,  payout:74000,   ts:"1d ago" },
    { title:"BTC close above $105K on Jun 4?", outcome:"YES", result:"Closed at $105,420",       pool:310000,  winners:4100, payout:542000,  ts:"1d ago" },
  ];
  return (
    <div style={{ padding: "20px 24px", maxWidth: 700 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Resolved Markets</div>
      {RESOLVED.map((r, i) => (
        <div key={i} style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 10, padding: 14, marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: r.outcome === "YES" ? "#00e5a020" : "#ff4d6d20", color: r.outcome === "YES" ? "var(--gn)" : "var(--rd)", fontSize: 14 }}>
            {r.outcome === "YES" ? "✓" : "✗"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{r.title}</div>
            <div style={{ fontSize: 11, color: "var(--mu)", marginBottom: 8 }}>{r.result}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 11, fontFamily: "var(--fm)" }}>
              <span style={{ color: "var(--mu)" }}>Pool: <span style={{ color: "var(--tx)" }}>${(r.pool/1000).toFixed(0)}K</span></span>
              <span style={{ color: "var(--mu)" }}>Winners: <span style={{ color: "var(--tx)" }}>{r.winners.toLocaleString()}</span></span>
              <span style={{ color: "var(--mu)" }}>Paid: <span style={{ color: "var(--gn)" }}>${(r.payout/1000).toFixed(0)}K</span></span>
              <span style={{ color: "var(--mu)" }}>{r.ts}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Settings Page ───────────────────────────────────────────────────────────
interface SettingsProps { showToast: (msg: string) => void; }
export function SettingsPage({ showToast }: SettingsProps) {
  const Section = ({ title, icon, children }: any) => (
    <div style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 10, marginBottom: 14, overflow: "hidden" }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--b1)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, color: "var(--mu2)" }}>
        <span>{icon}</span>{title}
      </div>
      {children}
    </div>
  );
  const Row = ({ label, sub, right }: any) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderBottom: "1px solid var(--b1)", fontSize: 12 }}>
      <div><div style={{ color: "var(--tx)" }}>{label}</div>{sub && <div style={{ fontSize: 10, color: "var(--mu)", marginTop: 2 }}>{sub}</div>}</div>
      {right}
    </div>
  );
  const Pills = ({ opts, def }: { opts: string[], def: string }) => {
    const [sel, setSel] = useState(def);
    return (
      <div style={{ display: "flex", gap: 4 }}>
        {opts.map(o => (
          <button key={o} onClick={() => { setSel(o); showToast("Setting updated"); }} style={{
            padding: "4px 10px", borderRadius: 4, border: "1px solid var(--b2)",
            background: sel === o ? "var(--s3)" : "transparent",
            color: sel === o ? "var(--tx)" : "var(--mu)",
            fontSize: 11, cursor: "pointer", fontFamily: "var(--ff)", transition: "all .12s",
          }}>{o}</button>
        ))}
      </div>
    );
  };
  const Toggle = ({ def = true }: { def?: boolean }) => {
    const [on, setOn] = useState(def);
    return (
      <div onClick={() => { setOn(!on); showToast(on ? "Disabled" : "Enabled"); }} style={{
        width: 36, height: 20, borderRadius: 10, background: on ? "var(--ac)" : "var(--s3)",
        border: "1px solid var(--b2)", cursor: "pointer", position: "relative", transition: "background .2s",
      }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--tx)", position: "absolute", top: 2, left: on ? 18 : 2, transition: "left .2s" }} />
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px" }}>
      <Section title="Display" icon="📊">
        <Row label="Odds format"     sub="How odds display across markets"   right={<Pills opts={["Decimal","American","Fractional"]} def="Decimal" />} />
        <Row label="Currency"                                                 right={<Pills opts={["USDC","USD","NGN"]} def="USDC" />} />
        <Row label="Chart type"                                               right={<Pills opts={["Candle","Line","Area"]} def="Candle" />} />
      </Section>
      <Section title="Notifications" icon="🔔">
        <Row label="Bet resolved"     sub="Alert when market closes"         right={<Toggle def={true} />} />
        <Row label="1-min market"     sub="Alert on new 60-sec window"        right={<Toggle def={true} />} />
        <Row label="Price alerts"     sub="Significant price moves"           right={<Toggle def={false} />} />
        <Row label="Leaderboard"      sub="When your rank changes"            right={<Toggle def={false} />} />
      </Section>
      <Section title="Network" icon="🌐">
        <Row label="RPC Endpoint"    right={<span style={{ fontFamily: "var(--fm)", fontSize: 11, color: "var(--a3)" }}>devnet.rialo.io/rpc</span>} />
        <Row label="Status"          right={<span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--fm)", fontSize: 11, color: "var(--gn)" }}><span className="live-dot" />Connected · 42ms</span>} />
        <Row label="Environment"     right={<Pills opts={["DevNet","Testnet","Mainnet"]} def="DevNet" />} />
      </Section>
      <Section title="Risk & Trading" icon="🛡">
        <Row label="Max bet / market" sub="Prevents oversized positions"      right={<div style={{ display: "flex", alignItems: "center", gap: 6 }}><input defaultValue="500" style={{ width: 70, background: "var(--s2)", border: "1px solid var(--b2)", borderRadius: 5, padding: "4px 8px", color: "var(--tx)", fontFamily: "var(--fm)", fontSize: 12, outline: "none" }} /><span style={{ fontSize: 11, color: "var(--mu)" }}>USDC</span></div>} />
        <Row label="Confirm before placing" sub="Confirmation dialog each bet" right={<Toggle def={true} />} />
        <Row label="Auto-claim winnings"    sub="Claim when market resolves"   right={<Toggle def={true} />} />
      </Section>
      <button onClick={() => showToast("Config exported!")} style={{
        width: "100%", padding: 11, borderRadius: 8, border: "1px solid var(--b2)",
        background: "transparent", color: "var(--mu2)", fontFamily: "var(--ff)", fontSize: 13,
        cursor: "pointer", fontWeight: 600,
      }}>
        Export config &amp; deployment guide ↗
      </button>
    </div>
  );
}
