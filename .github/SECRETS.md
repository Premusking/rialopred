# GitHub Secrets Setup

Go to: `github.com/YOUR_USERNAME/rialopred/settings/secrets/actions`

## Required for CI/CD Frontend Deploy

| Secret | How to get it |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Account → Tokens → Create |
| `VERCEL_ORG_ID` | `cat .vercel/project.json` after first deploy |
| `VERCEL_PROJECT_ID` | `cat .vercel/project.json` after first deploy |

## Required for Email Login (Magic SDK)

| Secret | How to get it |
|---|---|
| `VITE_MAGIC_KEY` | magic.link → New App → Publishable Key |

## Required for Contract Deployment (after Rialo devnet access)

| Secret | How to get it |
|---|---|
| `DEPLOY_KEYPAIR_JSON` | `cat ~/.config/solana/id.json` (your wallet keypair) |
| `VITE_PROGRAM_ID` | Output of `npm run deploy:devnet` |
| `VITE_RIALO_RPC_DEVNET` | Provided by Rialo team |
| `VERCEL_DEPLOY_HOOK` | vercel.com → Project → Settings → Git → Deploy Hooks |

## Adding a secret

```bash
# Via GitHub CLI:
gh secret set VERCEL_TOKEN --body "your-token-here"

# Or via web UI:
# Settings → Secrets → Actions → New repository secret
```
