# RialoPredict — Rialo Builder Application

**To:** Rialo Team / Subzero Labs
**Re:** Early DevNet Access Request — Prediction Market Application
**From:** Kingsley (rialopred)

---

## Who We Are

We're an independent builder team that has spent the past several weeks building **RialoPredict** — a full-stack on-chain prediction market, built specifically for Rialo and designed to showcase the unique capabilities of your blockchain that are impossible on Ethereum or standard Solana.

We're not asking for access to explore. We're asking because we've already built the app, and we need devnet deployment access to complete it.

---

## What We Built

**RialoPredict** is a prediction market platform covering:

- ⚡ **1-minute markets** — BTC/ETH/USD/NGN price direction, resolving every 60 seconds
- ⚽ **Sports** — UEFA Champions League, Wimbledon, NBA Finals, 2026 World Cup
- 💪 **Wrestling** — WWE SummerSlam, Bash in Berlin
- 🏛 **Politics** — 2027 Nigerian Presidential Election, US Fed rate decisions
- 📈 **Economy** — US CPI inflation, Brent Crude, USD/NGN exchange rate

### Technical Stack

| Layer | Detail |
|---|---|
| Smart contract | Rust + Anchor, targeting Rialo RISC-V + SVM runtime |
| Frontend | React 18 + TypeScript, Vite, fully mobile-responsive PWA |
| Wallet support | Phantom, Solflare, Backpack, Ledger, **Email/Magic Link** |
| On-chain client | Custom TypeScript SDK wrapping all program instructions |
| Deploy pipeline | GitHub Actions → Vercel CI/CD, auto-preview on every PR |
| Testing | 9-test Anchor test suite covering full bet lifecycle |

### Why This Only Works on Rialo

The entire resolution layer of RialoPredict is built around Rialo's native primitives. Here's what we're doing that is **not possible on any other chain**:

**1. Native HTTP Oracle**
Our smart contract calls external APIs directly to resolve markets:
```rust
// No Chainlink. No keeper bot. Just this:
#[rialo::async_handler(event = "schedule_resolve")]
pub async fn resolve_market(ctx: Context<ResolveMarket>) -> Result<()> {
    let response = HttpClient::fetch(
        HttpRequest::get(&market.resolution_url).build()
    ).await?;
    // Parse result, set winner, distribute payouts
}
```

Resolution sources include Binance price API, FIFA API, BLS CPI data, Federal Reserve rate API, and WWE results. Zero oracle middleware.

**2. Async Event Scheduling**
At market creation, Rialo schedules the resolution wakeup:
```rust
emit_event("schedule_resolve", ScheduleResolvePayload {
    market:     market.key(),
    resolve_at: params.close_timestamp,
})?;
```
The contract wakes up at the exact close time, fetches the resolution URL, determines the winner, and distributes payouts — all on-chain, all automatic, no keeper bots.

**3. On Ethereum/Solana, this same flow requires:**
- A Chainlink oracle subscription
- A Gelato or Keep3r keeper bot running 24/7
- A manual admin resolution transaction
- A separate claim transaction for every winner

On Rialo: one contract, one deploy, everything runs itself.

---

## Code

The full project is available at:
**GitHub:** `github.com/[YOUR_USERNAME]/rialopred`

Highlights:
- `contracts/programs/prediction_market/src/lib.rs` — 350-line Rust contract with all Rialo-native features
- `src/lib/rialo.ts` — TypeScript SDK wrapping all instructions
- `contracts/tests/prediction_market.test.ts` — 9 passing tests
- `contracts/scripts/deploy.ts` — one-command devnet deployment

---

## What We Need

1. **Rialo DevNet RPC access** — to deploy the prediction_market program
2. **DevNet SOL airdrop** — ~10 SOL for deployment and seed transactions  
3. **Rialo SDK npm package** — `rialo-sdk` crate for the HTTP oracle and async engine
4. **Any documentation** on `rialo::async_handler` and `HttpClient` API surface

We're not asking for grants or tokens. Just the technical access to finish the deployment.

---

## Why Approve This

**It's ready.** Most builder applications come with a pitch deck and a prototype. We're coming with a complete full-stack app — 36 source files, 4,000+ lines, CI/CD pipeline, test suite, mobile PWA. The only missing piece is your devnet RPC.

**It demonstrates your unique value.** Every 60-second resolution is a live proof that Rialo can do something Ethereum, Solana, and Avalanche cannot — execute smart contracts with native web2 API calls, asynchronously, without middleware. That's a live, public demonstration that runs thousands of times per day.

**It targets an underserved market.** Prediction markets on-chain (Polymarket, Augur) are dominated by US/crypto audiences. We're building specifically for the Nigerian and African market — with USD/NGN pairs, local political events, African World Cup bets, and naira-denominated displays. This is a genuinely new audience for web3 prediction markets.

**It drives real usage.** 1-minute markets by definition generate high transaction volume. Even with a small user base, the contract gets called constantly — which stress-tests your async engine and HTTP oracle in a real production environment.

---

## Timeline

| When | What |
|---|---|
| Now | Frontend live on Vercel |
| Within 48h of devnet access | Contract deployed, all seed markets live |
| Week 2 | Marketing push, first real users |
| Week 4 | Add more markets based on user demand |
| When mainnet opens | Full mainnet migration |

---

## Contact

- **X/Twitter:** @[YOUR_HANDLE]
- **Email:** [YOUR_EMAIL]
- **Telegram:** @[YOUR_TELEGRAM]
- **GitHub:** github.com/[YOUR_USERNAME]/rialopred

We're ready to move the moment we have access.

— Kingsley
