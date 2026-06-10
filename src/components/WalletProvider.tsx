import { createContext, useContext, useState, ReactNode } from "react";

export type WalletType = "phantom" | "solflare" | "backpack" | "ledger" | "email" | null;

export interface WalletState {
  connected: boolean;
  walletType: WalletType;
  address: string | null;
  email: string | null;
  balanceUsdc: number;
  balanceSol: number;
  connect: (type: WalletType, email?: string) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [balanceUsdc, setBalanceUsdc] = useState(0);
  const [balanceSol, setBalanceSol] = useState(0);

  const connect = async (type: WalletType, emailAddr?: string) => {
    // In production: integrate @solana/wallet-adapter or Magic SDK
    await new Promise((r) => setTimeout(r, 1200));
    const addr = emailAddr
      ? `${emailAddr.split("@")[0].slice(0, 6)}...rialo`
      : `${Math.random().toString(36).slice(2, 6).toUpperCase()}...${Math.random()
          .toString(36)
          .slice(2, 6)
          .toUpperCase()}`;
    setWalletType(type);
    setAddress(addr);
    setEmail(emailAddr || null);
    setBalanceUsdc(1250);
    setBalanceSol(2.41);
    setConnected(true);
  };

  const disconnect = () => {
    setConnected(false);
    setWalletType(null);
    setAddress(null);
    setEmail(null);
    setBalanceUsdc(0);
    setBalanceSol(0);
  };

  return (
    <WalletContext.Provider
      value={{ connected, walletType, address, email, balanceUsdc, balanceSol, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
