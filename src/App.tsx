import { useState } from "react";
import { WalletProvider } from "./components/WalletProvider";
import { MarketsPage } from "./pages/MarketsPage";
import { TradingPage } from "./pages/TradingPage";
import { CreateMarketPage } from "./pages/CreateMarketPage";
import { FaucetPage } from "./pages/FaucetPage";
import { PortfolioPage, LeaderboardPage, ResolvedPage, SettingsPage } from "./pages/OtherPages";
import { Header } from "./components/Header";
import { NavBar } from "./components/NavBar";
import { Toast } from "./components/Toast";
import { useToast } from "./hooks/useToast";
import "./styles/globals.css";

export type Page =
  | "markets" | "trading" | "portfolio" | "leaderboard"
  | "create"  | "resolved" | "faucet"   | "settings";

export default function App() {
  const [page, setPage] = useState<Page>("markets");
  const { toast, showToast } = useToast();

  return (
    <WalletProvider>
      <div className="app">
        <Header onNavigate={setPage} showToast={showToast} />
        <NavBar current={page} onNavigate={setPage} />
        <main className="main-content" style={{ paddingBottom: 60 }}>
          {page === "markets"     && <MarketsPage     showToast={showToast} />}
          {page === "trading"     && <TradingPage     showToast={showToast} />}
          {page === "portfolio"   && <PortfolioPage />}
          {page === "leaderboard" && <LeaderboardPage />}
          {page === "create"      && <CreateMarketPage showToast={showToast} />}
          {page === "resolved"    && <ResolvedPage />}
          {page === "faucet"      && <FaucetPage      showToast={showToast} />}
          {page === "settings"    && <SettingsPage    showToast={showToast} />}
        </main>
        {toast && <Toast message={toast} />}
      </div>
    </WalletProvider>
  );
}
