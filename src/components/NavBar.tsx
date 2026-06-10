import type { Page } from "../App";

interface Props {
  current: Page;
  onNavigate: (page: Page) => void;
}

const TABS: { id: Page; label: string; icon: string; mobileLabel: string }[] = [
  { id: "markets",     label: "Markets",      icon: "📊", mobileLabel: "Markets"   },
  { id: "trading",     label: "Live Trading", icon: "⚡", mobileLabel: "Trade"     },
  { id: "portfolio",   label: "Portfolio",    icon: "💼", mobileLabel: "Portfolio" },
  { id: "leaderboard", label: "Leaderboard",  icon: "🏆", mobileLabel: "Leaders"   },
  { id: "create",      label: "Create",       icon: "＋", mobileLabel: "Create"    },
  { id: "resolved",    label: "Resolved",     icon: "✓",  mobileLabel: "Resolved"  },
  { id: "faucet",      label: "Faucet",       icon: "⬡",  mobileLabel: "Faucet"    },
  { id: "settings",    label: "Settings",     icon: "⚙",  mobileLabel: "Settings"  },
];

export function NavBar({ current, onNavigate }: Props) {
  return (
    <>
      {/* Desktop tabs */}
      <nav className="desktop-only" style={{
        display: "flex", gap: 2, padding: "8px 20px",
        background: "var(--s1)", borderBottom: "1px solid var(--b1)",
        overflowX: "auto",
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onNavigate(t.id)}
            style={{
              padding: "7px 14px", borderRadius: 6, border: current === t.id ? "1px solid var(--b2)" : "none",
              background: current === t.id ? "var(--s3)" : "transparent",
              color: current === t.id ? "var(--tx)" : "var(--mu)",
              fontFamily: "var(--ff)", fontSize: 12, fontWeight: 500,
              cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
              transition: "all .15s",
            }}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>

      {/* Mobile bottom nav */}
      <nav className="mobile-only" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "var(--s1)", borderTop: "1px solid var(--b1)",
        display: "flex", justifyContent: "space-around", padding: "8px 0 12px",
      }}>
        {TABS.slice(0, 5).map((t) => (
          <button
            key={t.id}
            onClick={() => onNavigate(t.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              color: current === t.id ? "var(--ac)" : "var(--mu)",
              fontFamily: "var(--ff)", fontSize: 9, fontWeight: current === t.id ? 700 : 500,
              transition: "color .15s", minWidth: 52,
            }}
          >
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            {t.mobileLabel}
          </button>
        ))}
      </nav>
    </>
  );
}
