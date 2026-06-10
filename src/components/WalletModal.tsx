import { useState } from "react";
import { useWallet, WalletType } from "./WalletProvider";

interface Props {
  onClose: () => void;
  showToast: (msg: string) => void;
}

const WALLETS = [
  { id: "phantom",  label: "Phantom",   tag: "Most popular",      color: "#ab9ff2", bg: "#ab9ff215", icon: "P" },
  { id: "solflare", label: "Solflare",  tag: "Web + mobile",      color: "#fc8a15", bg: "#fc8a1515", icon: "S" },
  { id: "backpack", label: "Backpack",  tag: "xNFT wallet",       color: "#e33b3b", bg: "#e33b3b15", icon: "B" },
  { id: "ledger",   label: "Ledger",    tag: "Hardware wallet",   color: "#4f8ef7", bg: "#4f8ef715", icon: "L" },
];

export function WalletModal({ onClose, showToast }: Props) {
  const { connect, disconnect, connected, address, email, balanceUsdc, balanceSol, walletType } = useWallet();
  const [step, setStep] = useState<"choose" | "email" | "otp" | "connected">(connected ? "connected" : "choose");
  const [emailInput, setEmailInput] = useState("");
  const [otp, setOtp] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const handleWallet = async (id: string) => {
    setConnecting(id);
    await connect(id as WalletType);
    setConnecting(null);
    setStep("connected");
    showToast(`${WALLETS.find(w => w.id === id)?.label} connected!`);
  };

  const handleEmailSend = async () => {
    if (!emailInput.includes("@")) { showToast("Enter a valid email"); return; }
    setOtpSent(true);
    setStep("otp");
    showToast(`OTP sent to ${emailInput}`);
  };

  const handleOtpVerify = async () => {
    if (otp.length < 4) { showToast("Enter the 6-digit code"); return; }
    setConnecting("email");
    await connect("email", emailInput);
    setConnecting(null);
    setStep("connected");
    showToast(`Signed in as ${emailInput}`);
  };

  const handleDisconnect = () => {
    disconnect();
    setStep("choose");
    onClose();
    showToast("Wallet disconnected");
  };

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,.72)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 600 }}>
      <div style={{ background: "var(--s1)", border: "1px solid var(--b2)", borderRadius: 16, padding: 24, width: 360, position: "relative", maxWidth: "95vw" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "var(--s2)", border: "1px solid var(--b1)", borderRadius: 6, width: 28, height: 28, cursor: "pointer", color: "var(--mu)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

        {/* ── CHOOSE ── */}
        {step === "choose" && (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 5 }}>Connect to RialoPredict</div>
            <div style={{ fontSize: 12, color: "var(--mu)", marginBottom: 20, lineHeight: 1.5 }}>
              Use a Solana wallet or sign in with your email — no seed phrase required.
            </div>

            {/* Email option */}
            <div onClick={() => setStep("email")} style={{ display: "flex", alignItems: "center", gap: 12, padding: 13, borderRadius: 10, border: "1px solid var(--ac)", background: "#00e5a008", cursor: "pointer", marginBottom: 10, transition: "all .15s" }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "#00e5a020", border: "1px solid var(--ac)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>✉</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Email / Magic Link</div>
                <div style={{ fontSize: 10, color: "var(--ac)" }}>No wallet needed — sign in with email</div>
              </div>
              <div style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 4, background: "var(--ac)", color: "#000", fontSize: 9, fontWeight: 800 }}>NEW</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0", color: "var(--mu)", fontSize: 11 }}>
              <div style={{ flex: 1, height: 1, background: "var(--b2)" }} />OR CONNECT WALLET<div style={{ flex: 1, height: 1, background: "var(--b2)" }} />
            </div>

            {WALLETS.map((w) => (
              <div key={w.id} onClick={() => handleWallet(w.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 9, border: "1px solid var(--b2)", background: "var(--s2)", cursor: "pointer", marginBottom: 7, transition: "border-color .15s", opacity: connecting && connecting !== w.id ? .5 : 1 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: w.bg, border: `1px solid ${w.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: w.color, flexShrink: 0 }}>
                  {connecting === w.id ? "…" : w.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{w.label}</div>
                  <div style={{ fontSize: 10, color: "var(--mu)" }}>{w.tag}</div>
                </div>
                {connecting === w.id && <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--a4)", fontFamily: "var(--fm)" }}>Connecting…</div>}
              </div>
            ))}

            <div style={{ marginTop: 14, fontSize: 10, color: "var(--mu)", lineHeight: 1.6, textAlign: "center" }}>
              By connecting you agree to the{" "}
              <span style={{ color: "var(--a3)", cursor: "pointer" }}>Terms of Service</span> and{" "}
              <span style={{ color: "var(--a3)", cursor: "pointer" }}>Privacy Policy</span>
            </div>
          </>
        )}

        {/* ── EMAIL ENTRY ── */}
        {step === "email" && (
          <>
            <button onClick={() => setStep("choose")} style={{ background: "none", border: "none", color: "var(--mu)", cursor: "pointer", fontSize: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--ff)" }}>← Back</button>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 5 }}>Sign in with Email</div>
            <div style={{ fontSize: 12, color: "var(--mu)", marginBottom: 20, lineHeight: 1.5 }}>
              We'll send a one-time code to your inbox. A Rialo wallet is created automatically on first sign-in.
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mu2)", display: "block", marginBottom: 6 }}>Email address</label>
            <input
              type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={e => e.key === "Enter" && handleEmailSend()}
              style={{ width: "100%", background: "var(--s2)", border: "1px solid var(--b2)", borderRadius: 7, padding: "10px 12px", color: "var(--tx)", fontFamily: "var(--fm)", fontSize: 13, outline: "none", marginBottom: 12 }}
            />
            <button onClick={handleEmailSend} style={{ width: "100%", padding: 11, borderRadius: 8, border: "none", background: "var(--ac)", color: "#000", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "var(--ff)" }}>
              Send One-Time Code
            </button>
            <div style={{ marginTop: 12, padding: 10, background: "var(--s2)", borderRadius: 8, fontSize: 11, color: "var(--mu)", lineHeight: 1.6 }}>
              🔒 Powered by Magic SDK — your key is secured by a hardware security module. No seed phrase required.
            </div>
          </>
        )}

        {/* ── OTP VERIFY ── */}
        {step === "otp" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✉</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 5 }}>Check your inbox</div>
              <div style={{ fontSize: 12, color: "var(--mu)", lineHeight: 1.5 }}>
                We sent a 6-digit code to<br />
                <span style={{ color: "var(--ac)", fontFamily: "var(--fm)" }}>{emailInput}</span>
              </div>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mu2)", display: "block", marginBottom: 6 }}>Enter code</label>
            <input
              type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000" maxLength={6}
              style={{ width: "100%", background: "var(--s2)", border: "1px solid var(--b2)", borderRadius: 7, padding: "12px 16px", color: "var(--tx)", fontFamily: "var(--fm)", fontSize: 20, outline: "none", marginBottom: 12, textAlign: "center", letterSpacing: 8 }}
            />
            <button onClick={handleOtpVerify} disabled={otp.length < 6 || !!connecting} style={{ width: "100%", padding: 11, borderRadius: 8, border: "none", background: connecting ? "var(--a4)" : "var(--ac)", color: "#000", fontWeight: 800, fontSize: 13, cursor: otp.length >= 6 ? "pointer" : "default", fontFamily: "var(--ff)", opacity: otp.length < 6 ? .5 : 1 }}>
              {connecting ? "Verifying…" : "Verify & Connect"}
            </button>
            <button onClick={() => setStep("email")} style={{ width: "100%", padding: 9, borderRadius: 8, border: "1px solid var(--b2)", background: "transparent", color: "var(--mu)", fontSize: 12, cursor: "pointer", marginTop: 8, fontFamily: "var(--ff)" }}>
              Resend code
            </button>
          </>
        )}

        {/* ── CONNECTED ── */}
        {step === "connected" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#00e5a020", border: "2px solid var(--ac)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 24, color: "var(--ac)" }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
              {walletType === "email" ? "Signed in" : "Connected"}
            </div>
            <div style={{ fontSize: 12, color: "var(--mu)", marginBottom: 4 }}>
              {walletType === "email" ? email : WALLETS.find(w => w.id === walletType)?.label}
            </div>
            <div style={{ fontFamily: "var(--fm)", fontSize: 12, color: "var(--ac)", marginBottom: 16 }}>{address}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "var(--s2)", borderRadius: 8, padding: 12, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 18, fontWeight: 600, color: "var(--ac)" }}>{balanceUsdc.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "var(--mu)", marginTop: 3 }}>USDC</div>
              </div>
              <div style={{ background: "var(--s2)", borderRadius: 8, padding: 12, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--fm)", fontSize: 18, fontWeight: 600, color: "var(--a4)" }}>{balanceSol}</div>
                <div style={{ fontSize: 10, color: "var(--mu)", marginTop: 3 }}>SOL</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: "var(--ac)", color: "#000", fontWeight: 800, fontSize: 13, cursor: "pointer", marginBottom: 8, fontFamily: "var(--ff)" }}>
              Continue to App
            </button>
            <button onClick={handleDisconnect} style={{ width: "100%", padding: 9, borderRadius: 8, border: "1px solid var(--rd)", background: "transparent", color: "var(--rd)", fontSize: 12, cursor: "pointer", fontFamily: "var(--ff)", fontWeight: 600 }}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
