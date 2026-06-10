/**
 * RialoPredict — On-chain Client SDK
 * TypeScript bridge between the React frontend and the prediction_market program.
 *
 * Usage:
 *   import { RialoClient } from "@/lib/rialo";
 *   const client = new RialoClient(wallet, "devnet");
 *   await client.placeBet(marketPubkey, 0, 25_000_000);
 */

import {
  Connection, PublicKey, SystemProgram, Transaction,
  TransactionInstruction, Commitment, ParsedAccountData,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN, web3 } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress, TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// ── Config ────────────────────────────────────────────────────────────────────

export const NETWORKS = {
  devnet:  "https://devnet.rialo.io/rpc",
  testnet: "https://testnet.rialo.io/rpc",
  mainnet: "https://mainnet.rialo.io/rpc",
} as const;

export type NetworkName = keyof typeof NETWORKS;

export const PROGRAM_ID = new PublicKey(
  process.env.VITE_PROGRAM_ID || "PREDriAL0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
);

// Mainnet USDC mint; replaced with devnet mint on deployment
export const USDC_MINT = {
  mainnet: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  devnet:  new PublicKey("DevUSDCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"),
  testnet: new PublicKey("TestUSDCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"),
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MarketAccount {
  publicKey:      PublicKey;
  creator:        PublicKey;
  title:          string;
  category:       string;
  outcomes:       string[];
  outcomePools:   BN[];
  totalPool:      BN;
  resolutionUrl:  string;
  resolutionPath: string;
  closeTimestamp: BN;
  createdAt:      BN;
  resolved:       boolean;
  paused:         boolean;
  winningOutcome: number | null;
  feeBps:         number;
  vaultUsdc:      PublicKey;
}

export interface BetAccount {
  publicKey: PublicKey;
  bettor:    PublicKey;
  market:    PublicKey;
  outcome:   number;
  amount:    BN;
  claimed:   boolean;
  placedAt:  BN;
}

export interface CreateMarketParams {
  title:           string;
  category:        MarketCategory;
  outcomes:        string[];
  resolutionUrl:   string;
  resolutionPath:  string;
  durationSeconds: number;
}

export type MarketCategory =
  | "cryptoOneMin" | "crypto" | "sports" | "worldCup"
  | "wrestling"    | "politics" | "economy";

// ── PDA Helpers ───────────────────────────────────────────────────────────────

export function getMarketPDA(creator: PublicKey, title: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), creator.toBuffer(), Buffer.from(title)],
    PROGRAM_ID
  );
}

export function getBetPDA(market: PublicKey, bettor: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bet"), market.toBuffer(), bettor.toBuffer()],
    PROGRAM_ID
  );
}

// ── Client ────────────────────────────────────────────────────────────────────

export class RialoClient {
  connection: Connection;
  provider:   AnchorProvider;
  program:    Program;
  network:    NetworkName;

  constructor(wallet: any, network: NetworkName = "devnet") {
    this.network    = network;
    this.connection = new Connection(NETWORKS[network], "confirmed");
    this.provider   = new AnchorProvider(this.connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    // IDL loaded lazily to avoid bundling on initial load
    this.program = null as any;
  }

  async loadProgram(): Promise<void> {
    if (this.program) return;
    const { default: IDL } = await import("../idl/prediction_market.json");
    this.program = new Program(IDL as any, PROGRAM_ID, this.provider);
  }

  // ── Markets ────────────────────────────────────────────────────────────────

  async createMarket(params: CreateMarketParams): Promise<string> {
    await this.loadProgram();
    const creator = this.provider.wallet.publicKey;
    const [marketPDA] = getMarketPDA(creator, params.title);
    const closeTimestamp = new BN(
      Math.floor(Date.now() / 1000) + params.durationSeconds
    );

    const tx = await this.program.methods
      .createMarket({
        title:           params.title,
        category:        { [params.category]: {} },
        outcomes:        params.outcomes,
        resolutionUrl:   params.resolutionUrl,
        resolutionPath:  params.resolutionPath,
        closeTimestamp,
      })
      .accounts({
        market:        marketPDA,
        creator,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async fetchMarket(pubkey: PublicKey): Promise<MarketAccount> {
    await this.loadProgram();
    const raw = await this.program.account.market.fetch(pubkey);
    return this.parseMarket(pubkey, raw);
  }

  async fetchAllMarkets(category?: MarketCategory): Promise<MarketAccount[]> {
    await this.loadProgram();
    const filters = category
      ? [{ memcmp: { offset: 8 + 32 + 4 + 100, bytes: category } }]
      : [];
    const accounts = await this.program.account.market.all(filters);
    return accounts.map((a: any) => this.parseMarket(a.publicKey, a.account));
  }

  private parseMarket(pubkey: PublicKey, raw: any): MarketAccount {
    return {
      publicKey:      pubkey,
      creator:        raw.creator,
      title:          raw.title,
      category:       Object.keys(raw.category)[0],
      outcomes:       raw.outcomes,
      outcomePools:   raw.outcomePools,
      totalPool:      raw.totalPool,
      resolutionUrl:  raw.resolutionUrl,
      resolutionPath: raw.resolutionPath,
      closeTimestamp: raw.closeTimestamp,
      createdAt:      raw.createdAt,
      resolved:       raw.resolved,
      paused:         raw.paused,
      winningOutcome: raw.winningOutcome,
      feeBps:         raw.feeBps,
      vaultUsdc:      raw.vaultUsdc,
    };
  }

  // ── Bets ───────────────────────────────────────────────────────────────────

  async placeBet(
    marketPubkey: PublicKey,
    outcomeIndex: number,
    amountUsdc:   number      // in USDC base units (1 USDC = 1_000_000)
  ): Promise<string> {
    await this.loadProgram();
    const bettor    = this.provider.wallet.publicKey;
    const usdcMint  = USDC_MINT[this.network] ?? USDC_MINT.devnet;
    const [betPDA]  = getBetPDA(marketPubkey, bettor);
    const bettorATA = await getAssociatedTokenAddress(usdcMint, bettor);
    const market    = await this.fetchMarket(marketPubkey);

    const tx = await this.program.methods
      .placeBet(outcomeIndex, new BN(amountUsdc))
      .accounts({
        market:        marketPubkey,
        bet:           betPDA,
        bettor,
        bettorUsdc:    bettorATA,
        vaultUsdc:     market.vaultUsdc,
        tokenProgram:  TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async fetchBet(market: PublicKey, bettor: PublicKey): Promise<BetAccount | null> {
    await this.loadProgram();
    const [betPDA] = getBetPDA(market, bettor);
    try {
      const raw = await this.program.account.bet.fetch(betPDA);
      return { publicKey: betPDA, ...raw } as BetAccount;
    } catch {
      return null;
    }
  }

  async fetchAllBetsForUser(bettor: PublicKey): Promise<BetAccount[]> {
    await this.loadProgram();
    const accounts = await this.program.account.bet.all([
      { memcmp: { offset: 8, bytes: bettor.toBase58() } },
    ]);
    return accounts.map((a: any) => ({ publicKey: a.publicKey, ...a.account }));
  }

  // ── Claim ──────────────────────────────────────────────────────────────────

  async claimWinnings(marketPubkey: PublicKey): Promise<string> {
    await this.loadProgram();
    const winner   = this.provider.wallet.publicKey;
    const usdcMint = USDC_MINT[this.network] ?? USDC_MINT.devnet;
    const [betPDA] = getBetPDA(marketPubkey, winner);
    const market   = await this.fetchMarket(marketPubkey);
    const winnerATA = await getAssociatedTokenAddress(usdcMint, winner);

    const tx = await this.program.methods
      .claimWinnings()
      .accounts({
        market:      marketPubkey,
        bet:         betPDA,
        winner,
        bettor:      winner,
        winnerUsdc:  winnerATA,
        vaultUsdc:   market.vaultUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  // ── Faucet ─────────────────────────────────────────────────────────────────

  async requestAirdrop(amountSol: number = 2): Promise<string> {
    const sig = await this.connection.requestAirdrop(
      this.provider.wallet.publicKey,
      amountSol * web3.LAMPORTS_PER_SOL
    );
    await this.connection.confirmTransaction(sig);
    return sig;
  }

  // ── Odds Calculation ───────────────────────────────────────────────────────

  static calcOdds(
    market:       MarketAccount,
    outcomeIndex: number,
    betAmount:    number
  ): { odds: number; payout: number; impliedProb: number } {
    const totalPool   = market.totalPool.toNumber();
    const outcomePool = market.outcomePools[outcomeIndex].toNumber();

    if (outcomePool === 0) {
      // No liquidity yet — return fair odds
      return { odds: 2.0, payout: betAmount * 2, impliedProb: 0.5 };
    }

    // Parimutuel odds: total pool / outcome pool
    const rawOdds   = (totalPool + betAmount) / (outcomePool + betAmount);
    const feeFactor = 1 - market.feeBps / 10_000;
    const odds      = Math.max(1.01, rawOdds * feeFactor);
    const payout    = betAmount * odds;
    const impliedProb = outcomePool / totalPool;

    return {
      odds:        Math.round(odds * 100) / 100,
      payout:      Math.round(payout * 100) / 100,
      impliedProb: Math.round(impliedProb * 10000) / 10000,
    };
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  subscribeToMarket(
    pubkey: PublicKey,
    onChange: (market: MarketAccount) => void
  ): number {
    return this.connection.onAccountChange(pubkey, async (info) => {
      try {
        await this.loadProgram();
        const raw    = this.program.coder.accounts.decode("market", info.data);
        const market = this.parseMarket(pubkey, raw);
        onChange(market);
      } catch (e) {
        console.error("Failed to decode market account:", e);
      }
    });
  }

  unsubscribe(subscriptionId: number): void {
    this.connection.removeAccountChangeListener(subscriptionId);
  }

  // ── Utils ──────────────────────────────────────────────────────────────────

  async getUsdcBalance(owner: PublicKey): Promise<number> {
    const usdcMint = USDC_MINT[this.network] ?? USDC_MINT.devnet;
    try {
      const ata    = await getAssociatedTokenAddress(usdcMint, owner);
      const info   = await this.connection.getParsedAccountInfo(ata);
      const parsed = (info.value?.data as ParsedAccountData)?.parsed;
      return parsed?.info?.tokenAmount?.uiAmount ?? 0;
    } catch {
      return 0;
    }
  }

  async getSolBalance(owner: PublicKey): Promise<number> {
    const lamports = await this.connection.getBalance(owner);
    return lamports / web3.LAMPORTS_PER_SOL;
  }

  formatUsdc(baseUnits: number): string {
    return `$${(baseUnits / 1_000_000).toFixed(2)}`;
  }

  formatPool(baseUnits: number): string {
    const usd = baseUnits / 1_000_000;
    if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
    if (usd >= 1_000)     return `$${(usd / 1_000).toFixed(0)}K`;
    return `$${usd.toFixed(2)}`;
  }
}

// ── Singleton factory ─────────────────────────────────────────────────────────

let _client: RialoClient | null = null;

export function getRialoClient(wallet?: any, network?: NetworkName): RialoClient {
  if (!_client && wallet) {
    _client = new RialoClient(wallet, network ?? "devnet");
  }
  if (!_client) throw new Error("RialoClient not initialized — pass a wallet first");
  return _client;
}

export function resetClient(): void {
  _client = null;
}
