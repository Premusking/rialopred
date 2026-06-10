import { useState } from "react";
import { useWallet } from "../components/WalletProvider";

interface FaucetClaim {
  token: string;
  amount: number;
  txHash: string;
  ts: string;
}

interface Props {
  showToast: (msg: string) => void;
}

const FAUCET_TOKENS = [
  { symbol: "USDC",  amount: 1000, icon: "💵", color: "#2775ca", desc: "DevNet USDC for prediction betting" },
  { symbol: "SOL",   amount: 2,    icon: "◎",  color: "#9945ff", desc: "SOL for transaction fees on Rialo" },
  { symbol: "RIALO", amount: 500,  icon: "⬡",  color: "#00e5a0", desc: "Native governance + fee token" },
];

const COOLDOWN_HOURS = 24;

export function FaucetPage({ showToast }: Props) {
  const { connected, address, connect } = useWallet();
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<FaucetClaim[]>([]);
  const [customAddr, setCustomAddr] = useState("");

  const canClaim = (symbol: string) => {
    const last = claimed[symbol];
    if (!last) return true;
    return Date.now() - last > COOLDOWN_HOURS * 3600 * 1000;
  };

  const cooldownLeft = (symbol: string) => {
    const last = claimed[symbol];
    if (!last) return null;
    const remaining = COOLDOWN_HOURS * 3600 * 1000 - (Date.now() - last);
    if (remaining <= 0) return null;
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const doClaim = async (token: typeof FAUCET_TOKENS[0]) => {
    if (!connected) { showToast("Connect wallet first"); return; }
    if (!canClaim(token.symbol)) { showToast(`Next claim in ${cooldownLeft(token.symbol)}`); return; }
    setClaiming(token.symbol);
    await new Promise((r) => setTimeout(r, 1800));
    const txHash = "0x" + Math.random().toString(16).slice(2, 14).toUpperCase();
    setClaimed((p) => ({ ...p, [token.symbol]: Date.now() }));
    setHistory((p) => [
      { token: token.symbol, amount: token.amount, txHash, ts: "just now" },
      ...p,
    ]);
    setClaiming(null);
    showToast(`${token.amount} ${token.symbol} sent to your wallet!`);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>DevNet Faucet</div>
        <div style={{ fontSize: 12, color: "var(--mu)", lineHeight: 1.6 }}>
          Claim free testnet tokens to explore RialoPredict. Tokens have no real value — for development only.
          Limit: once per {COOLDOWN_HOURS}h per token.
        </div>
      </div>

      {!connected && (
        <div style={{ background: "var(--s1)", border: "1px solid var(--b2)", borderRadius: 10, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 12, color: "var(--mu)" }}>Connect a wallet to start claiming</div>
          <button
            onClick={() => connect("phantom")}
            style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: "var(--ac)", color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--ff)" }}
          >
            Connect Wallet
          </button>
        </div>
      )}

      {connected && (
        <div style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 10, padding: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#00e5a020", border: "2px solid var(--ac)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--ac)", fontWeight: 800 }}>✓</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Wallet connected</div>
            <div style={{ fontSize: 11, color: "var(--mu)", fontFamily: "var(--fm)" }}>{address}</div>
          </div>
        </div>
      )}

      {/* Token claim cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {FAUCET_TOKENS.map((tk) => {
          const ready = canClaim(tk.symbol);
          const cd = cooldownLeft(tk.symbol);
          const isClaming = claiming === tk.symbol;
          return (
            <div key={tk.symbol} style={{ background: "var(--s1)", border: `1px solid ${ready ? "var(--b2)" : "var(--b1)"}`, borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: tk.color + "20", border: `1px solid ${tk.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {tk.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{tk.symbol}</span>
                  <span style={{ padding: "2px 7px", borderRadius: 4, background: tk.color + "20", color: tk.color, fontSize: 10, fontWeight: 700, fontFamily: "var(--fm)" }}>
                    +{tk.amount.toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--mu)" }}>{tk.desc}</div>
                {cd && <div style={{ fontSize: 10, color: "var(--a4)", fontFamily: "var(--fm)", marginTop: 3 }}>Next claim in {cd}</div>}
              </div>
              <button
                onClick={() => doClaim(tk)}
                disabled={!connected || !ready || isClaming}
                style={{
                  padding: "9px 18px", borderRadius: 7, border: "none",
                  background: isClaming ? "var(--a4)" : ready ? "var(--ac)" : "var(--s3)",
                  color: isClaming || ready ? "#000" : "var(--mu)",
                  fontWeight: 700, fontSize: 12, cursor: ready && connected ? "pointer" : "default",
                  fontFamily: "var(--ff)", flexShrink: 0, minWidth: 90,
                  opacity: !connected ? 0.5 : 1, transition: "opacity .15s",
                }}
              >
                {isClaming ? "Claiming…" : cd ? "Cooldown" : "Claim"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom address airdrop */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--b1)", borderRadius: 10, padding: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--mu2)" }}>Airdrop to any address</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={customAddr}
            onChange={(e) => setCustomAddr(e.target.value)}
            placeholder="Paste Rialo / Solana wallet address…"
            style={{ flex: 1, background: "var(--s2)", border: "1px solid var(--b2)", borderRadius: 6, padding: "8px 12px", color: "var(--tx)", fontFamily: "var(--fm)", fontSize: 11, outline: "none" }}
          />
          <button
            onClick={() => { if (customAddr.length > 10) { showToast(`1000 USDC airdropped to ${customAddr.slice(0,8)}…`); setCustomAddr(""); } }}
            style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "var(--a3)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--ff)" }}
          >
            Airdrop
          </button>
        </div>
      </div>

      {/* Claim history */}
      {history.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "var(--mu)", textTransform: "uppercase", marginBottom: 8 }}>Claim History</div>
          {history.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--b1)", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ padding: "2px 7px", borderRadius: 3, background: "#00e5a020", color: "var(--gn)", fontSize: 10, fontWeight: 700 }}>CLAIMED</span>
                <span style={{ fontWeight: 600 }}>{h.amount.toLocaleString()} {h.token}</span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--a3)" }}>{h.txHash.slice(0, 14)}…</span>
                <span style={{ fontSize: 10, color: "var(--mu)" }}>{h.ts}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--mu)", fontSize: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: .4 }}>⬡</div>
          No claims yet — hit Claim to get started
        </div>
      )}
    </div>
  );
}
