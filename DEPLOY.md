# RialoPredict — Go-Live Deployment Guide

## Overview

Two parallel tracks to go live:

| Track | What | Status |
|---|---|---|
| **A** | React frontend → Vercel | ✅ Ready now |
| **B** | Smart contract → Rialo DevNet | 🔜 Pending devnet access |

---

## Track A — Deploy Frontend to Vercel (do this today)

### Prerequisites
- Node.js 20+ installed
- Git installed
- GitHub account
- Vercel account (free at vercel.com)

---

### Step 1 — Install Vercel CLI
```bash
npm install -g vercel
vercel login     # opens browser, authenticate with GitHub/email
```

---

### Step 2 — Push to GitHub
```bash
cd rialopred

# Initialize git
git init
git add .
git commit -m "feat: RialoPredict v1.0 — prediction market on Rialo"

# Create repo on GitHub (install gh CLI first: brew install gh)
gh repo create rialopred --public --source=. --push

# OR manually:
# 1. Go to github.com/new
# 2. Create repo named "rialopred"
# 3. Then:
git remote add origin https://github.com/YOUR_USERNAME/rialopred.git
git branch -M main
git push -u origin main
```

---

### Step 3 — Set environment variables
Create a `.env.production` file (do NOT commit this):
```bash
cp .env.example .env.production
```

Fill in `.env.production`:
```env
VITE_RIALO_RPC_DEVNET=https://devnet.rialo.io/rpc
VITE_RIALO_RPC_TESTNET=https://testnet.rialo.io/rpc
VITE_PROGRAM_ID=PREDriAL0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_MAGIC_KEY=pk_live_YOUR_MAGIC_SDK_KEY
```

Get your Magic SDK key (for email login):
1. Go to magic.link
2. Create a new app → "RialoPredict"
3. Copy the Publishable Key
4. Paste as `VITE_MAGIC_KEY`

---

### Step 4 — Deploy to Vercel
```bash
# In your project root:
vercel

# Answer the prompts:
# > Set up and deploy? Y
# > Which scope? (select your account)
# > Link to existing project? N
# > Project name: rialopred
# > In which directory? ./
# > Override settings? N

# First deploy goes to a preview URL.
# For production:
vercel --prod
```

Your app is now live at:
```
https://rialopred.vercel.app
```
(or a custom domain — see Step 5)

---

### Step 5 — Add secrets to GitHub (for CI/CD)

Go to: `github.com/YOUR_USERNAME/rialopred/settings/secrets/actions`

Add these secrets:
```
VERCEL_TOKEN        → from vercel.com/account/tokens
VERCEL_ORG_ID       → from vercel.com/account (your team/personal ID)
VERCEL_PROJECT_ID   → from vercel.com/YOUR_USERNAME/rialopred/settings
VITE_RIALO_RPC_DEVNET   → https://devnet.rialo.io/rpc
VITE_PROGRAM_ID         → your deployed program ID (later)
VITE_MAGIC_KEY          → your Magic SDK publishable key
```

Get Vercel IDs:
```bash
vercel project ls   # shows project ID
vercel whoami       # shows org/team
# OR: cat .vercel/project.json after first deploy
```

After adding secrets — every `git push origin main` auto-deploys. Every PR gets a preview URL commented automatically.

---

### Step 6 — Custom domain (optional)
```bash
vercel domains add rialopred.xyz
# Follow DNS instructions in terminal
```

Or in Vercel dashboard: Project → Settings → Domains → Add

---

### Step 7 — Verify deploy
```bash
# Check build locally first:
npm run build
npm run preview   # preview at http://localhost:4173

# Then check live:
open https://rialopred.vercel.app
```

Expected pages working:
- ✅ `/` — Markets feed with live ticker
- ✅ Trading page with candlestick chart
- ✅ Portfolio tracker
- ✅ Leaderboard
- ✅ Create Market wizard
- ✅ Faucet (simulated until devnet)
- ✅ Wallet connect (Phantom, Solflare, Backpack, Email)
- ✅ Settings

---

## Track B — Deploy Smart Contract to Rialo DevNet

> Requires devnet access from Rialo team. Apply using the builder application in `RIALO_APPLICATION.md`.

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
solana --version

# Install Anchor CLI
npm install -g @coral-xyz/anchor-cli
anchor --version   # should be 0.29.x

# Add Rialo target (once devnet access confirmed)
rustup target add riscv32i-unknown-none-elf
```

### Step 1 — Configure for Rialo DevNet
```bash
# Set Rialo devnet RPC
solana config set --url https://devnet.rialo.io/rpc

# Create or use existing keypair
solana-keygen new --outfile ~/.config/solana/id.json
# OR use existing: solana-keygen pubkey ~/.config/solana/id.json

# Check balance
solana balance

# Airdrop SOL for fees (devnet only)
solana airdrop 2
```

### Step 2 — Update program ID
```bash
# Generate a new program keypair
solana-keygen new --outfile contracts/target/deploy/prediction_market-keypair.json

# Get the program ID
solana-keygen pubkey contracts/target/deploy/prediction_market-keypair.json
# → Copy this address

# Update Anchor.toml — replace placeholder with real program ID:
# [programs.devnet]
# prediction_market = "YOUR_REAL_PROGRAM_ID"

# Update lib.rs:
# declare_id!("YOUR_REAL_PROGRAM_ID");

# Update src/lib/rialo.ts:
# export const PROGRAM_ID = new PublicKey("YOUR_REAL_PROGRAM_ID");
```

### Step 3 — Build the contract
```bash
cd contracts
anchor build

# Verify build output:
ls target/deploy/
# prediction_market.so          ← compiled program
# prediction_market-keypair.json ← deployment keypair

# Generate IDL (needed by frontend):
anchor idl parse \
  --file programs/prediction_market/src/lib.rs \
  -o ../src/idl/prediction_market.json
```

### Step 4 — Deploy to Rialo DevNet
```bash
# From project root:
NETWORK=devnet npm run deploy:devnet

# This runs contracts/scripts/deploy.ts which:
# 1. Deploys the program binary
# 2. Creates devnet USDC mint
# 3. Funds the vault
# 4. Creates all 17 seed markets
# 5. Saves deployment.json

# Manual anchor deploy (alternative):
anchor deploy \
  --provider.cluster https://devnet.rialo.io/rpc \
  --provider.wallet ~/.config/solana/id.json
```

### Step 5 — Verify deployment
```bash
NETWORK=devnet npm run verify

# Expected output:
# ✅ Program deployed (X bytes)
# ✅ Vault funded: $10,000,000 USDC
# ✅ Market OK: "BTC/USDT — Higher in 60 seconds?"
# ✅ Market OK: "2026 FIFA World Cup Winner?"
# ... (17 markets total)
# ✅ All checks passed — RialoPredict is live on devnet
```

### Step 6 — Update frontend with real program ID
```bash
# Update .env.production:
VITE_PROGRAM_ID=YOUR_REAL_DEPLOYED_PROGRAM_ID

# Redeploy frontend:
vercel --prod
```

---

## CI/CD Pipeline Reference

After setup, every git push triggers:

```
git push origin main
      ↓
GitHub Actions (.github/workflows/ci.yml)
      ↓
  [lint] → typecheck + eslint
      ↓
  [build] → vite build with env secrets
      ↓
  [deploy-production] → vercel --prod
      ↓
Live at https://rialopred.vercel.app
```

PRs trigger preview deploys with URL comments automatically.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_RIALO_RPC_DEVNET`  | Yes | Rialo DevNet RPC URL |
| `VITE_RIALO_RPC_TESTNET` | No  | Rialo Testnet RPC URL |
| `VITE_PROGRAM_ID`        | Yes | Deployed program public key |
| `VITE_MAGIC_KEY`         | Yes | Magic SDK key for email login |
| `VERCEL_TOKEN`           | CI  | Vercel deploy token |
| `VERCEL_ORG_ID`          | CI  | Vercel org/team ID |
| `VERCEL_PROJECT_ID`      | CI  | Vercel project ID |

---

## Troubleshooting

**Build fails with "Cannot find module"**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Vercel deploy shows blank page**
- Check `vercel.json` has the `rewrites` rule for SPA routing
- Check browser console for CORS errors on RPC calls

**Wallet connect not working on live site**
- Ensure site is HTTPS (Vercel handles this automatically)
- Phantom/Solflare require HTTPS for wallet injection

**Contract deploy: insufficient funds**
```bash
solana airdrop 2 --url https://devnet.rialo.io/rpc
```

**"Program not executable" error**
```bash
anchor build   # rebuild first
anchor deploy  # then redeploy
```
