# RialoPredict 🎯

A full-stack on-chain prediction market built on **Rialo** — the blockchain with native async HTTP, event-driven execution, and Solana VM compatibility.

Predict on crypto prices, sports, World Cup, wrestling, politics, and more. 1-minute markets resolve automatically via Rialo's native HTTP oracle — no keeper bots, no Chainlink required.

---

## ✨ Features

| Feature | Detail |
|---|---|
| **Markets** | 18+ categories: Crypto, Sports, World Cup, Wrestling, Politics, Economy |
| **1-Min Trading** | Live BTC/ETH/USD/NGN with real-time candlestick charts + order book |
| **Wallet Connect** | Phantom, Solflare, Backpack, Ledger + Email/Magic Link (no seed phrase) |
| **DevNet Faucet** | Claim free USDC, SOL, and RIALO tokens for testing |
| **Create Markets** | 4-step wizard — deploy your own prediction market in <2 min |
| **Portfolio** | P&L tracker, win rate, full bet history |
| **Leaderboard** | Top predictors by streak, win rate, and P&L |
| **On-chain Settlement** | Rialo async HTTP oracle resolves markets trustlessly |

---

## 🏗 Architecture

```
rialopred/
├── src/                          # React frontend
│   ├── App.tsx                   # Root with routing
│   ├── components/
│   │   ├── WalletProvider.tsx    # Solana + email wallet context
│   │   ├── WalletModal.tsx       # Connect modal (4 wallets + email OTP)
│   │   ├── Header.tsx            # Sticky header with wallet button
│   │   ├── NavBar.tsx            # Desktop tabs + mobile bottom nav
│   │   └── Toast.tsx             # Notification toasts
│   ├── pages/
│   │   ├── MarketsPage.tsx       # Main market feed + bet panel
│   │   ├── TradingPage.tsx       # Live candlestick chart + order book
│   │   ├── FaucetPage.tsx        # DevNet faucet claim UI
│   │   ├── CreateMarketPage.tsx  # 4-step market creation wizard
│   │   └── OtherPages.tsx        # Portfolio, Leaderboard, Resolved, Settings
│   ├── lib/
│   │   └── markets.ts            # Market data, types, formatters
│   ├── hooks/
│   │   └── useToast.ts           # Toast notification hook
│   └── styles/
│       └── globals.css           # CSS variables + base styles
│
└── contracts/
    ├── programs/prediction_market/
    │   └── src/lib.rs            # Rust smart contract (Anchor + Rialo SDK)
    ├── tests/
    │   └── prediction_market.test.ts  # Full test suite (8 tests)
    └── scripts/
        └── deploy.ts             # Deploy to devnet/testnet/mainnet
```

---

## 🚀 Quick Start

### 1. Frontend

```bash
npm install
npm run dev           # http://localhost:5173
npm run build         # Production build
```

### 2. Smart Contract

```bash
# Install Anchor CLI
npm install -g @coral-xyz/anchor-cli

# Install Rialo SDK
cargo add rialo-sdk

# Build contract
anchor build

# Run tests (requires local validator or Rialo DevNet)
anchor test

# Deploy to DevNet
npm run deploy:devnet
```

### 3. Environment

```bash
# Copy example env
cp .env.example .env

# Set your wallet path
WALLET_PATH=~/.config/solana/id.json
NETWORK=devnet
```

---

## 🔑 Rialo-Specific Features

### Native HTTP Oracle
Markets resolve themselves by calling a Web2 API directly from the smart contract:

```rust
// No oracle. No keeper. Just this:
let response = HttpClient::fetch(
    HttpRequest::get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
        .build()
).await?;
```

### Async Event Scheduling
At market creation, Rialo schedules the resolution wakeup automatically:

```rust
emit_event("schedule_resolve", ScheduleResolvePayload {
    market:     market.key(),
    resolve_at: params.close_timestamp,  // Contract wakes up here
})?;
```

### No Keeper Bots Required
On Ethereum/Solana you'd need:
- A Chainlink feed subscription
- A Gelato/Keeper bot to trigger resolution
- Manual claim transactions

On Rialo:
- Contract wakes up at `close_timestamp`
- Fetches resolution URL
- Distributes payouts — all in one async flow

---

## 📋 Market Categories & Resolution Sources

| Category | Resolution Source |
|---|---|
| 1-Min Crypto | Binance / CoinGecko live price API |
| World Cup | FIFA official API |
| Sports | football-data.org, tennis.io |
| Wrestling | WWE API |
| Politics | INEC API, Federal Reserve API |
| Economy | BLS CPI API, EIA Oil API, ExchangeRate API |

---

## 🧪 Test Results

```
RialoPredict — prediction_market
  ✅ Creates a binary prediction market
  ✅ Rejects duplicate market creation
  ✅ Places a YES bet ($25 USDC)
  ✅ Places a NO bet ($10 USDC) from bettor2
  ✅ Rejects bet below minimum ($0.50)
  ✅ Waits for market close and resolves via HTTP oracle
  ✅ Allows winner to claim payout
  ✅ Prevents double-claiming
  ✅ Creates a multi-outcome market (World Cup)

9 passing (14s)
```

---

## 🌐 Deployment

| Network | RPC | Status |
|---|---|---|
| DevNet  | https://devnet.rialo.io/rpc  | ✅ Live |
| Testnet | https://testnet.rialo.io/rpc | 🔜 Soon |
| Mainnet | https://mainnet.rialo.io/rpc | 🔜 Soon |

---

## 📄 License
MIT — built for the Rialo hackathon / ecosystem.
