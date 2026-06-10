import { useState } from "react";
import { useWallet } from "./WalletProvider";
import { WalletModal } from "./WalletModal";
import type { Page } from "../App";

interface Props {
  onNavigate: (page: Page) => void;
  showToast: (msg: string) => void;
}

export function Header({ onNavigate, showToast }: Props) {
  const { connected, address, balanceUsdc } = useWallet();
  const [showWallet, setShowWallet] = useState(false);

  return (
    <>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 20px", background: "var(--s1)",
        borderBottom: "1px solid var(--b1)", position: "sticky", top: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800, letterSpacing: "-.5px", cursor: "pointer" }} onClick={() => onNavigate("markets")}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ac)", boxShadow: "0 0 10px var(--ac)" }} />
          RIALO<span style={{ color: "var(--ac)" }}>PREDICT</span>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {connected && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "var(--s2)", border: "1px solid var(--b2)",
              borderRadius: 20, padding: "5px 12px",
              fontFamily: "var(--fm)", fontSize: 11, color: "var(--ac)",
            }}>
              <span>💵</span>
              <span>{balanceUsdc.toLocaleString()} USDC</span>
            </div>
          )}

          <button
            onClick={() => setShowWallet(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: connected ? "var(--s2)" : "var(--ac)",
              color: connected ? "var(--ac)" : "#000",
              border: connected ? "1px solid var(--b2)" : "none",
              borderRadius: 20, padding: "6px 14px",
              fontFamily: "var(--ff)", fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}
          >
            {connected ? (
              <><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ac)", display: "inline-block" }} />{address}</>
            ) : "Connect Wallet"}
          </button>

          {/* Faucet button */}
          <button
            onClick={() => onNavigate("faucet")}
            title="DevNet Faucet"
            style={{
              width: 32, height: 32, borderRadius: 7, border: "1px solid var(--b2)",
              background: "var(--s2)", color: "var(--a4)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}
          >⬡</button>
        </div>
      </header>

      {showWallet && (
        <WalletModal onClose={() => setShowWallet(false)} showToast={showToast} />
      )}
    </>
  );
}
