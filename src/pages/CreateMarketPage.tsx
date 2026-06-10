import { useState } from "react";
import { useWallet } from "../components/WalletProvider";

interface Props { showToast: (msg: string) => void; }

const CATS = [
  { id:"crypto",    icon:"₿", label:"Crypto"    },
  { id:"sports",    icon:"⚽", label:"Sports"    },
  { id:"worldcup",  icon:"🏆", label:"World Cup" },
  { id:"wrestling", icon:"💪", label:"Wrestling" },
  { id:"politics",  icon:"🏛", label:"Politics"  },
  { id:"economy",   icon:"📈", label:"Economy"   },
  { id:"1min",      icon:"⚡", label:"1-Min"     },
];
const DURATIONS = [
  { id:"1m",  label:"1 min" },
  { id:"1h",  label:"1 hour" },
  { id:"1d",  label:"1 day" },
  { id:"7d",  label:"7 days" },
  { id:"30d", label:"30 days" },
  { id:"cus", label:"Custom" },
];
const RES_METHODS = [
  { id:"http",      label:"HTTP Oracle (Rialo native — recommended)" },
  { id:"manual",    label:"Manual admin resolution" },
  { id:"chainlink", label:"Chainlink price feed" },
  { id:"snapshot",  label:"Snapshot vote" },
];

export function CreateMarketPage({ showToast }: Props) {
  const { connected } = useWallet();
  const [step, setStep] = useState(1);
  const [cat, setCat]   = useState("crypto");
  const [title, setTitle] = useState("");
  const [desc,  setDesc]  = useState("");
  const [type, setType]   = useState<"binary"|"multi">("binary");
  const [opts, setOpts]   = useState(["YES","NO"]);
  const [resMethod, setResMethod] = useState("http");
  const [resUrl,  setResUrl]  = useState("");
  const [resPath, setResPath] = useState("");
  const [dur, setDur]   = useState("7d");
  const [deploying, setDeploying] = useState(false);
  const [deployed,  setDeployed]  = useState(false);

  const goStep = (n: number) => {
    if (n === 2 && !title.trim()) { showToast("Enter a market question first"); return; }
    setStep(n);
  };

  const addOpt = () => {
    if (opts.length >= 6) { showToast("Max 6 outcomes"); return; }
    setOpts([...opts, `Option ${String.fromCharCode(65 + opts.length)}`]);
  };
  const delOpt = (i: number) => {
    if (opts.length <= 2) { showToast("Need at least 2 outcomes"); return; }
    setOpts(opts.filter((_, idx) => idx !== i));
  };
  const editOpt = (i: number, v: string) => setOpts(opts.map((o, idx) => idx === i ? v : o));

  const deploy = async () => {
    if (!connected) { showToast("Connect wallet to deploy"); return; }
    setDeploying(true);
    await new Promise(r => setTimeout(r, 2000));
    setDeploying(false); setDeployed(true);
    showToast("Market deployed to Rialo DevNet! ✓");
  };

  const StepDot = ({ n }: { n: number }) => (
    <div style={{
      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
      border: `2px solid ${step > n ? "var(--ac)" : step === n ? "var(--ac)" : "var(--b2)"}`,
      background: step > n ? "var(--ac)" : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, color: step > n ? "#000" : step === n ? "var(--ac)" : "var(--mu)",
      transition: "all .2s",
    }}>{step > n ? "✓" : n}</div>
  );
  const StepLine = ({ n }: { n: number }) => (
    <div style={{ flex: 1, height: 2, background: step > n ? "var(--ac)" : "var(--b2)", transition: "background .2s" }} />
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px" }}>
      {/* Step bar */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
        {[1,2,3,4].map((n, i) => (
          <>{i > 0 && <StepLine key={`l${n}`} n={n-1} />}<StepDot key={n} n={n} /></>
        ))}
      </div>

      {/* ── Step 1: Details ── */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Market details</div>
          <div style={{ fontSize: 12, color: "var(--mu)", marginBottom: 18 }}>Choose a category and write a clear question</div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--mu2)", display: "block", marginBottom: 6 }}>Category</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginBottom: 16 }}>
            {CATS.map(c => (
              <div key={c.id} onClick={() => setCat(c.id)} style={{
                padding: 10, borderRadius: 8, border: `1px solid ${cat === c.id ? "var(--ac)" : "var(--b2)"}`,
                background: cat === c.id ? "#00e5a010" : "var(--s2)", cursor: "pointer",
                textAlign: "center", transition: "all .12s",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{c.label}</div>
              </div>
            ))}
          </div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--mu2)", display: "block", marginBottom: 6 }}>Market question</label>
          <input className="field" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Will BTC close above $110K on July 31?" style={{ marginBottom: 12 }} />
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--mu2)", display: "block", marginBottom: 6 }}>Description (optional)</label>
          <input className="field" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Add context or resolution criteria…" style={{ marginBottom: 16 }} />
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => goStep(2)}>Next — Outcomes →</button>
        </div>
      )}

      {/* ── Step 2: Outcomes ── */}
      {step === 2 && (
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Define outcomes</div>
          <div style={{ fontSize: 12, color: "var(--mu)", marginBottom: 18 }}>Add 2–6 possible outcomes for your market</div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--mu2)", display: "block", marginBottom: 6 }}>Prediction type</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["binary","multi"].map(t => (
              <button key={t} onClick={() => { setType(t as any); setOpts(t === "binary" ? ["YES","NO"] : ["Option A","Option B","Option C"]); }} style={{
                padding: "6px 14px", borderRadius: 5, border: "1px solid var(--b2)",
                background: type === t ? "var(--s3)" : "transparent",
                color: type === t ? "var(--tx)" : "var(--mu)",
                fontFamily: "var(--ff)", fontSize: 12, cursor: "pointer",
              }}>{t === "binary" ? "Binary (Yes/No)" : "Multiple choice"}</button>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            {opts.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input value={o} onChange={e => editOpt(i, e.target.value)} className="field" style={{ flex: 1 }} />
                {opts.length > 2 && (
                  <button onClick={() => delOpt(i)} style={{ width: 28, height: 36, borderRadius: 6, border: "1px solid var(--b1)", background: "transparent", color: "var(--mu)", cursor: "pointer", fontSize: 14 }}>✕</button>
                )}
              </div>
            ))}
            {type === "multi" && (
              <button onClick={addOpt} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--b2)", background: "transparent", color: "var(--mu)", fontSize: 12, fontFamily: "var(--ff)", cursor: "pointer", marginTop: 4 }}>
                + Add outcome
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => goStep(3)}>Next — Resolution →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Resolution ── */}
      {step === 3 && (
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Resolution & duration</div>
          <div style={{ fontSize: 12, color: "var(--mu)", marginBottom: 18 }}>Set how and when this market resolves on-chain</div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--mu2)", display: "block", marginBottom: 6 }}>Resolution method</label>
          <select className="field" value={resMethod} onChange={e => setResMethod(e.target.value)} style={{ marginBottom: 14 }}>
            {RES_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          {resMethod === "http" && (
            <>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--mu2)", display: "block", marginBottom: 6 }}>Resolution API URL</label>
              <input className="field" value={resUrl} onChange={e => setResUrl(e.target.value)}
                placeholder="https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd" style={{ marginBottom: 12 }} />
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--mu2)", display: "block", marginBottom: 6 }}>JSON path</label>
              <input className="field" value={resPath} onChange={e => setResPath(e.target.value)}
                placeholder="$.bitcoin.usd" style={{ marginBottom: 14 }} />
            </>
          )}
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--mu2)", display: "block", marginBottom: 6 }}>Duration</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(88px,1fr))", gap: 8, marginBottom: 16 }}>
            {DURATIONS.map(d => (
              <div key={d.id} onClick={() => setDur(d.id)} style={{
                padding: 10, borderRadius: 7, border: `1px solid ${dur === d.id ? "var(--ac)" : "var(--b2)"}`,
                background: dur === d.id ? "#00e5a010" : "var(--s2)", cursor: "pointer",
                textAlign: "center", fontSize: 12, fontWeight: 600, color: dur === d.id ? "var(--ac)" : "var(--tx)",
              }}>{d.label}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => goStep(4)}>Next — Preview →</button>
          </div>
        </div>
      )}

      {/* ── Step 4: Preview & Deploy ── */}
      {step === 4 && (
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Preview & deploy</div>
          <div style={{ fontSize: 12, color: "var(--mu)", marginBottom: 18 }}>Review before deploying to Rialo</div>
          <div style={{ background: "var(--s2)", border: "1px solid var(--b2)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
            {[
              ["Question", title || "Untitled market"],
              ["Category", CATS.find(c=>c.id===cat)?.label || cat],
              ["Type", type === "binary" ? "Binary" : "Multiple choice"],
              ["Outcomes", opts.join(", ")],
              ["Resolution", RES_METHODS.find(m=>m.id===resMethod)?.label.split("(")[0].trim()],
              ["Duration", DURATIONS.find(d=>d.id===dur)?.label],
              ["Network", "Rialo DevNet"],
              ["Creation fee", "0.05 SOL"],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--b1)", fontSize: 12 }}>
                <span style={{ color: "var(--mu)" }}>{l}</span>
                <span style={{ fontFamily: l === "Question" ? "var(--ff)" : "var(--fm)", textAlign: "right", maxWidth: 260, lineHeight: 1.3,
                  color: l === "Network" ? "var(--a3)" : l === "Creation fee" ? "var(--a4)" : "var(--tx)" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "var(--s2)", border: "1px solid var(--b1)", borderRadius: 8, padding: 10, fontSize: 11, color: "var(--mu)", lineHeight: 1.6, marginBottom: 14 }}>
            ℹ️ Deploying calls <code style={{ color: "var(--ac)", fontFamily: "var(--fm)" }}>prediction_market::create_market</code> on-chain. Rialo's async engine resolves and pays out automatically at close time.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(3)}>← Back</button>
          </div>
          {deployed ? (
            <div style={{ padding: 14, borderRadius: 9, background: "#00e5a015", border: "1px solid var(--ac)", textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--ac)" }}>
              ✓ Market deployed successfully!
            </div>
          ) : (
            <button onClick={deploy} disabled={deploying} style={{
              width: "100%", padding: 13, borderRadius: 9, border: "none",
              background: deploying ? "var(--a4)" : "var(--ac)", color: "#000",
              fontFamily: "var(--ff)", fontWeight: 800, fontSize: 14, cursor: "pointer",
            }}>
              {deploying ? "Deploying to Rialo…" : "🚀 Deploy to Rialo"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
