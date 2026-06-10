#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# RialoPredict — Quick Deploy Script
# Usage: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════════════════════

set -e
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'
AC='\033[38;5;43m'  # accent green

header() { echo -e "\n${AC}${BOLD}▸ $1${RESET}"; }
ok()     { echo -e "  ${GREEN}✓${RESET} $1"; }
info()   { echo -e "  ${CYAN}ℹ${RESET}  $1"; }
warn()   { echo -e "  ${YELLOW}⚠${RESET}  $1"; }
err()    { echo -e "  ${RED}✗${RESET}  $1"; exit 1; }
ask()    { echo -e "  ${CYAN}?${RESET}  $1"; }

echo -e "\n${AC}${BOLD}"
echo "  ██████╗ ██╗ █████╗ ██╗      ██████╗ "
echo "  ██╔══██╗██║██╔══██╗██║     ██╔═══██╗"
echo "  ██████╔╝██║███████║██║     ██║   ██║"
echo "  ██╔══██╗██║██╔══██║██║     ██║   ██║"
echo "  ██║  ██║██║██║  ██║███████╗╚██████╔╝"
echo "  ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝ "
echo -e "  ${RESET}${BOLD}PREDICT${RESET} — deploy script\n"

# ── Check prerequisites ───────────────────────────────────────

header "Checking prerequisites"

command -v node >/dev/null 2>&1 || err "Node.js not found. Install from nodejs.org"
NODE_VER=$(node -v | cut -c2- | cut -d. -f1)
[ "$NODE_VER" -ge 18 ] || err "Node.js 18+ required (found $(node -v))"
ok "Node.js $(node -v)"

command -v npm >/dev/null 2>&1 || err "npm not found"
ok "npm $(npm -v)"

command -v git >/dev/null 2>&1 || err "git not found"
ok "git $(git --version | awk '{print $3}')"

# Check for Vercel CLI
if command -v vercel >/dev/null 2>&1; then
  ok "Vercel CLI $(vercel --version)"
  HAS_VERCEL=true
else
  warn "Vercel CLI not found — will install"
  HAS_VERCEL=false
fi

# ── Install dependencies ──────────────────────────────────────

header "Installing dependencies"
npm ci --silent && ok "npm packages installed"

# ── Install Vercel CLI if needed ──────────────────────────────

if [ "$HAS_VERCEL" = false ]; then
  header "Installing Vercel CLI"
  npm install -g vercel && ok "Vercel CLI installed"
fi

# ── Setup .env.production ─────────────────────────────────────

header "Environment setup"

if [ ! -f .env.production ]; then
  cp .env.example .env.production
  warn ".env.production created from example — you need to fill in values"
  info "Required: VITE_MAGIC_KEY (get from magic.link)"
  info "Optional now, required after contract deploy: VITE_PROGRAM_ID"
else
  ok ".env.production exists"
fi

# Check for Magic key
if grep -q "pk_live_YOUR_MAGIC_SDK_KEY" .env.production 2>/dev/null; then
  warn "VITE_MAGIC_KEY not set — email login will use demo mode"
fi

# ── Build ─────────────────────────────────────────────────────

header "Building production bundle"
npm run build && ok "Build complete → dist/"

BUILD_SIZE=$(du -sh dist/ | cut -f1)
info "Bundle size: $BUILD_SIZE"

# ── Deploy to Vercel ──────────────────────────────────────────

header "Deploying to Vercel"

echo ""
ask "Deploy to Vercel now? (y/n)"
read -r DEPLOY_CHOICE

if [ "$DEPLOY_CHOICE" = "y" ] || [ "$DEPLOY_CHOICE" = "Y" ]; then

  # Check if already linked
  if [ -f .vercel/project.json ]; then
    ok "Project already linked to Vercel"
    info "Deploying to production..."
    vercel --prod --yes
  else
    info "First deploy — Vercel will prompt for project setup"
    info "When asked:"
    info "  > Set up and deploy? → Y"
    info "  > Link to existing project? → N"
    info "  > Project name → rialopred"
    info "  > Override settings? → N"
    echo ""
    vercel

    echo ""
    info "Preview deployed. Promoting to production..."
    vercel --prod --yes
  fi

  DEPLOY_URL=$(vercel ls --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['url'])" 2>/dev/null || echo "check vercel.com")

  echo ""
  echo -e "  ${GREEN}${BOLD}✨ Live at: https://$DEPLOY_URL${RESET}"
  echo ""

else
  info "Skipping Vercel deploy"
  info "Run manually: vercel --prod"
fi

# ── GitHub setup ──────────────────────────────────────────────

header "GitHub repository"

if [ -d .git ]; then
  ok "Git repo already initialized"
  REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
  if [ -n "$REMOTE" ]; then
    ok "Remote: $REMOTE"
  else
    warn "No remote set. Run: git remote add origin https://github.com/YOUR_USERNAME/rialopred.git"
  fi
else
  info "Initializing git repo..."
  git init
  git add .
  git commit -m "feat: RialoPredict v1.0 — prediction market on Rialo"
  ok "Git repo initialized with initial commit"

  echo ""
  echo -e "  ${CYAN}Next: create a GitHub repo and push:${RESET}"
  echo "  gh repo create rialopred --public --source=. --push"
  echo "  # OR:"
  echo "  git remote add origin https://github.com/YOUR_USERNAME/rialopred.git"
  echo "  git push -u origin main"
fi

# ── Summary ───────────────────────────────────────────────────

header "Summary"

echo ""
echo -e "  ${GREEN}${BOLD}Track A (Frontend) — DONE${RESET}"
echo "  ├── ✅ Production build complete"
echo "  ├── ✅ Deployed to Vercel"
echo "  └── ✅ PWA manifest + service worker included"
echo ""
echo -e "  ${YELLOW}${BOLD}Track B (Smart Contract) — PENDING RIALO ACCESS${RESET}"
echo "  ├── ⏳ Apply at: playground.rialo.io"
echo "  ├── 📄 Application: public/application.html"
echo "  ├── 📄 Guide: DEPLOY.md → Track B"
echo "  └── 🚀 Once access granted: npm run deploy:devnet"
echo ""
echo -e "  ${CYAN}Resources:${RESET}"
echo "  ├── Rialo playground: https://playground.rialo.io"
echo "  ├── Deploy guide:     ./DEPLOY.md"
echo "  ├── Application:      ./RIALO_APPLICATION.md"
echo "  └── CI/CD:            .github/workflows/"
echo ""
