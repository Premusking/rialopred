import { createContext, useContext, useState, useCallback, ReactNode } from "react";

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
  addBalance: (token: "USDC" | "SOL" | "RIALO", amount: number) => void;
}

const WalletContext = createContext<WalletState | null>(null);

// Detect installed wallets via window injection
function getProvider(type: WalletType) {
  if (typeof window === "undefined") return null;
  const w = window as any;
  switch (type) {
    case "phantom":  return w?.phantom?.solana ?? w?.solana ?? null;
    case "solflare": return w?.solflare ?? null;
    case "backpack": return w?.xnft?.solana ?? w?.backpack ?? null;
    default:         return null;
  }
}

function isWalletInstalled(type: WalletType): boolean {
  const p = getProvider(type);
  if (!p) return false;
  if (type === "phantom")  return p.isPhantom  === true;
  if (type === "solflare") return p.isSolflare === true;
  if (type === "backpack") return true;
  return false;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected,    setConnected]    = useState(false);
  const [walletType,   setWalletType]   = useState<WalletType>(null);
  const [address,      setAddress]      = useState<string | null>(null);
  const [email,        setEmail]        = useState<string | null>(null);
  const [balanceUsdc,  setBalanceUsdc]  = useState(0);
  const [balanceSol,   setBalanceSol]   = useState(0);

  const connect = async (type: WalletType, emailAddr?: string) => {
    if (type === "email") {
      // Email / magic link — simulated (Magic SDK would go here)
      await new Promise((r) => setTimeout(r, 1200));
      const addr = `${emailAddr!.split("@")[0].slice(0, 6)}...rialo`;
      setWalletType("email");
      setAddress(addr);
      setEmail(emailAddr || null);
      setBalanceUsdc(1250);
      setBalanceSol(2.41);
      setConnected(true);
      return;
    }

    if (type === "ledger") {
      // Ledger requires @ledger-hw libs — show helpful message
      throw new Error("Ledger support coming soon. Use Phantom or Solflare for now.");
    }

    // Try to connect to actual browser wallet extension
    const provider = getProvider(type);

    if (!provider || !isWalletInstalled(type)) {
      // Wallet not installed — open install page
      const installUrls: Record<string, string> = {
        phantom:  "https://phantom.app/",
        solflare: "https://solflare.com/",
        backpack: "https://backpack.app/",
      };
      window.open(installUrls[type!] || "#", "_blank");
      throw new Error(`${type} not installed. Opening install page...`);
    }

    try {
      // Connect to the real wallet
      const response = await provider.connect();
      const pubkey: string = response?.publicKey?.toString()
        ?? provider.publicKey?.toString()
        ?? "";

      if (!pubkey) throw new Error("Could not retrieve public key");

      // Try to fetch real SOL balance
      let solBal = 0;
      try {
        const rpc = (import.meta as any).env?.VITE_RIALO_RPC_DEVNET || "https://api.devnet.solana.com";
        const res = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", id: 1, method: "getBalance",
            params: [pubkey, { commitment: "confirmed" }],
          }),
        });
        const json = await res.json();
        solBal = (json?.result?.value ?? 0) / 1e9;
      } catch { /* keep 0 */ }

      setWalletType(type);
      setAddress(pubkey.slice(0, 4) + "..." + pubkey.slice(-4));
      setEmail(null);
      setBalanceSol(+solBal.toFixed(4));
      setBalanceUsdc(0); // Real USDC balance would need token account lookup
      setConnected(true);
    } catch (err: any) {
      if (err?.code === 4001) throw new Error("Connection rejected by user.");
      throw err;
    }
  };

  const disconnect = useCallback(async () => {
    try {
      const provider = getProvider(walletType);
      if (provider?.disconnect) await provider.disconnect();
    } catch { /* ignore */ }
    setConnected(false);
    setWalletType(null);
    setAddress(null);
    setEmail(null);
    setBalanceUsdc(0);
    setBalanceSol(0);
  }, [walletType]);

  // Called by faucet to actually update the balance
  const addBalance = useCallback((token: "USDC" | "SOL" | "RIALO", amount: number) => {
    if (token === "USDC")  setBalanceUsdc((p) => +(p + amount).toFixed(2));
    if (token === "SOL")   setBalanceSol((p)  => +(p + amount).toFixed(4));
    // RIALO token balance could be tracked separately here
  }, []);

  return (
    <WalletContext.Provider
      value={{ connected, walletType, address, email, balanceUsdc, balanceSol, connect, disconnect, addBalance }}
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
