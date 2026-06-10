#!/usr/bin/env ts-node
/**
 * RialoPredict — Deployment Script
 * Deploys the prediction_market program to Rialo DevNet
 * and creates seed markets for each category.
 *
 * Usage:
 *   yarn deploy:devnet       # Deploy to Rialo DevNet
 *   yarn deploy:testnet      # Deploy to Rialo Testnet
 *   yarn deploy:mainnet      # Deploy to Mainnet (requires multisig)
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN, web3 } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createMint,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "fs";
import path from "path";

// ── CONFIG ──────────────────────────────────────────────────────────────────

const NETWORKS: Record<string, string> = {
  devnet:   "https://devnet.rialo.io/rpc",
  testnet:  "https://testnet.rialo.io/rpc",
  mainnet:  "https://mainnet.rialo.io/rpc",
};

const NETWORK = (process.env.NETWORK || "devnet") as keyof typeof NETWORKS;
const RPC_URL = NETWORKS[NETWORK];
const PROGRAM_ID = new PublicKey("PREDriAL0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

// ── SEED MARKETS ────────────────────────────────────────────────────────────

const SEED_MARKETS = [
  {
    title:          "BTC/USDT — Higher in 60 seconds?",
    category:       "CryptoOneMin",
    outcomes:       ["YES", "NO"],
    resolutionUrl:  "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
    resolutionPath: "$.price",
    durationSecs:   60,
  },
  {
    title:          "ETH/USDT — Higher in 60 seconds?",
    category:       "CryptoOneMin",
    outcomes:       ["YES", "NO"],
    resolutionUrl:  "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
    resolutionPath: "$.price",
    durationSecs:   60,
  },
  {
    title:          "2026 FIFA World Cup Winner?",
    category:       "WorldCup",
    outcomes:       ["Brazil", "France", "England", "Argentina"],
    resolutionUrl:  "https://api.sports.io/football/world-cup/2026/winner",
    resolutionPath: "$.winner.name",
    durationSecs:   86400 * 20,
  },
  {
    title:          "Will US Fed cut rates in July 2026?",
    category:       "Politics",
    outcomes:       ["YES", "NO"],
    resolutionUrl:  "https://api.federalreserve.gov/data/rates/latest",
    resolutionPath: "$.decision",
    durationSecs:   86400 * 4,
  },
  {
    title:          "WWE SummerSlam 2026 — Universal Title?",
    category:       "Wrestling",
    outcomes:       ["CM Punk", "Cody Rhodes", "Roman Reigns", "Seth Rollins"],
    resolutionUrl:  "https://api.wwe.com/events/summerslam-2026/results",
    resolutionPath: "$.universal_champion",
    durationSecs:   86400 * 3,
  },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────

async function getProvider(wallet: anchor.Wallet) {
  const connection = new Connection(RPC_URL, "confirmed");
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

async function fundIfNeeded(connection: Connection, pk: PublicKey) {
  const bal = await connection.getBalance(pk);
  if (bal < 2 * LAMPORTS_PER_SOL) {
    console.log(`  Requesting airdrop for ${pk.toBase58().slice(0, 8)}…`);
    await connection.requestAirdrop(pk, 2 * LAMPORTS_PER_SOL);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

function loadWallet(): anchor.Wallet {
  const keyPath = process.env.WALLET_PATH || path.join(process.env.HOME!, ".config/solana/id.json");
  const raw = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  const kp = Keypair.fromSecretKey(Buffer.from(raw));
  return new anchor.Wallet(kp);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 RialoPredict Deployment`);
  console.log(`   Network: ${NETWORK} (${RPC_URL})`);
  console.log(`   Program: ${PROGRAM_ID.toBase58()}\n`);

  const wallet   = loadWallet();
  const provider = await getProvider(wallet);
  anchor.setProvider(provider);

  const connection = provider.connection;
  await fundIfNeeded(connection, wallet.publicKey);

  // Load IDL
  const idl = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../target/idl/prediction_market.json"), "utf8")
  );
  const program = new Program(idl, PROGRAM_ID, provider);

  // Create devnet USDC mint (skip on mainnet — use real USDC)
  let usdcMint: PublicKey;
  if (NETWORK !== "mainnet") {
    console.log("📦 Creating devnet USDC mint…");
    usdcMint = await createMint(connection, wallet.payer, wallet.publicKey, null, 6);
    console.log(`   USDC Mint: ${usdcMint.toBase58()}`);
    fs.writeFileSync("./devnet-usdc-mint.json", JSON.stringify({ mint: usdcMint.toBase58() }));
  } else {
    usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // mainnet USDC
  }

  // Create program vault
  const vaultUSDC = await getOrCreateAssociatedTokenAccount(
    connection, wallet.payer, usdcMint, wallet.publicKey
  );
  console.log(`   Vault USDC: ${vaultUSDC.address.toBase58()}`);

  if (NETWORK !== "mainnet") {
    await mintTo(connection, wallet.payer, usdcMint, vaultUSDC.address, wallet.payer, 10_000_000_000_000);
    console.log("   Minted 10M devnet USDC to vault\n");
  }

  // Deploy seed markets
  console.log(`📋 Creating ${SEED_MARKETS.length} seed markets…\n`);
  const deployedMarkets: string[] = [];

  for (const m of SEED_MARKETS) {
    const now = Math.floor(Date.now() / 1000);
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), wallet.publicKey.toBuffer(), Buffer.from(m.title)],
      PROGRAM_ID
    );

    try {
      await program.methods
        .createMarket({
          title:           m.title,
          category:        { [m.category.charAt(0).toLowerCase() + m.category.slice(1)]: {} },
          outcomes:        m.outcomes,
          resolutionUrl:   m.resolutionUrl,
          resolutionPath:  m.resolutionPath,
          closeTimestamp:  new BN(now + m.durationSecs),
        })
        .accounts({
          market:        marketPDA,
          creator:       wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log(`  ✅ ${m.title.slice(0, 50)}…`);
      console.log(`     PDA: ${marketPDA.toBase58()}\n`);
      deployedMarkets.push(marketPDA.toBase58());
    } catch (e: any) {
      console.error(`  ❌ Failed: ${e.message}\n`);
    }
  }

  // Save deployment manifest
  const manifest = {
    network:     NETWORK,
    rpcUrl:      RPC_URL,
    programId:   PROGRAM_ID.toBase58(),
    usdcMint:    usdcMint?.toBase58(),
    vaultUsdc:   vaultUSDC.address.toBase58(),
    deployer:    wallet.publicKey.toBase58(),
    markets:     deployedMarkets,
    deployedAt:  new Date().toISOString(),
  };

  fs.writeFileSync("./deployment.json", JSON.stringify(manifest, null, 2));
  console.log("📄 Deployment manifest saved to ./deployment.json");
  console.log("\n✨ Deployment complete!\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
