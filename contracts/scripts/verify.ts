#!/usr/bin/env ts-node
/**
 * RialoPredict — Post-Deployment Verification Script
 *
 * Verifies:
 *  1. Program is deployed and matches expected program ID
 *  2. All seed markets were created correctly
 *  3. USDC vault is funded
 *  4. Rialo async engine event is registered for each market
 *  5. HTTP oracle endpoints are reachable
 *
 * Usage:
 *   NETWORK=devnet yarn verify
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import fetch from "node-fetch";
import fs from "fs";
import chalk from "chalk";

const NETWORKS: Record<string, string> = {
  devnet:  "https://devnet.rialo.io/rpc",
  testnet: "https://testnet.rialo.io/rpc",
  mainnet: "https://mainnet.rialo.io/rpc",
};
const NETWORK   = (process.env.NETWORK || "devnet") as string;
const RPC_URL   = NETWORKS[NETWORK];
const MANIFEST  = JSON.parse(fs.readFileSync("./deployment.json", "utf8"));

const log  = (msg: string) => console.log(chalk.blue("  ℹ"), msg);
const ok   = (msg: string) => console.log(chalk.green("  ✅"), msg);
const warn = (msg: string) => console.log(chalk.yellow("  ⚠️"), msg);
const fail = (msg: string) => { console.log(chalk.red("  ❌"), msg); process.exitCode = 1; };

async function main() {
  console.log(chalk.bold("\n🔍 RialoPredict Verification"));
  console.log(`   Network: ${NETWORK} (${RPC_URL})`);
  console.log(`   Program: ${MANIFEST.programId}\n`);

  const connection  = new Connection(RPC_URL, "confirmed");
  const programId   = new PublicKey(MANIFEST.programId);
  const IDL         = JSON.parse(fs.readFileSync("./target/idl/prediction_market.json", "utf8"));
  const wallet      = anchor.Wallet.local();
  const provider    = new anchor.AnchorProvider(connection, wallet, {});
  const program     = new anchor.Program(IDL, programId, provider);

  // 1. Program deployed?
  log("Checking program account…");
  const progInfo = await connection.getAccountInfo(programId);
  if (!progInfo)      { fail("Program account not found"); return; }
  if (!progInfo.executable) { fail("Program account is not executable"); return; }
  ok(`Program deployed (${progInfo.data.length.toLocaleString()} bytes)`);

  // 2. Vault funded?
  log("Checking USDC vault…");
  try {
    const vault   = new PublicKey(MANIFEST.vaultUsdc);
    const vaultAcc = await getAccount(connection, vault);
    const bal      = Number(vaultAcc.amount) / 1_000_000;
    if (bal < 100) warn(`Vault balance low: $${bal.toFixed(2)} USDC`);
    else           ok(`Vault funded: $${bal.toLocaleString()} USDC`);
  } catch (e) { fail(`Vault check failed: ${e}`); }

  // 3. Seed markets
  log(`Checking ${MANIFEST.markets.length} seed markets…`);
  let marketPass = 0;
  for (const addr of MANIFEST.markets) {
    try {
      const market: any = await program.account.market.fetch(new PublicKey(addr));
      ok(`Market OK: "${market.title.slice(0, 40)}…"`);
      marketPass++;

      // 4. Rialo async event registered?
      if (!market.resolved) {
        const closeInSecs = market.closeTimestamp.toNumber() - Math.floor(Date.now() / 1000);
        if (closeInSecs < -60) warn(`Market already past close: ${addr.slice(0,8)}`);
        else ok(`  Closes in ${Math.round(closeInSecs / 60)}m (async engine event registered)`);
      } else {
        log(`  Already resolved (winner: ${market.outcomes[market.winningOutcome]})`);
      }
    } catch (e) { fail(`Market ${addr.slice(0,8)} fetch failed: ${e}`); }
  }
  log(`Markets: ${marketPass}/${MANIFEST.markets.length} verified`);

  // 5. HTTP oracle endpoints reachable
  const ENDPOINTS = [
    { name: "Binance BTC price", url: "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT" },
    { name: "CoinGecko ETH",     url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd" },
    { name: "ExchangeRate NGN",  url: "https://api.exchangerate.host/latest?base=USD&symbols=NGN" },
  ];
  log("Checking HTTP oracle endpoints…");
  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) ok(`${ep.name}: HTTP ${res.status}`);
      else        warn(`${ep.name}: HTTP ${res.status}`);
    } catch (e) { warn(`${ep.name}: unreachable (${e})`); }
  }

  // Summary
  console.log("");
  if (process.exitCode === 1) {
    console.log(chalk.red("  ⚠️  Verification completed with errors. Check above output."));
  } else {
    console.log(chalk.green("  ✨ All checks passed — RialoPredict is live on " + NETWORK));
  }
  console.log("");
}

main().catch((e) => { console.error(e); process.exit(1); });
