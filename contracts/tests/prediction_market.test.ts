import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { createMint, createAssociatedTokenAccount, mintTo, getAccount } from "@solana/spl-token";
import { assert, expect } from "chai";

describe("RialoPredict — prediction_market", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PredictionMarket as Program;
  const creator = (provider.wallet as anchor.Wallet).payer;
  const bettor  = Keypair.generate();
  const bettor2 = Keypair.generate();

  let usdcMint: PublicKey;
  let creatorUsdc: PublicKey;
  let bettorUsdc: PublicKey;
  let bettor2Usdc: PublicKey;
  let vaultUsdc: PublicKey;
  let marketPDA: PublicKey;
  let betPDA: PublicKey;

  const MARKET_TITLE = "Test: BTC above $110K?";
  const CLOSE_IN     = 10; // 10 seconds for testing

  // ── Setup ────────────────────────────────────────────────────────────────

  before(async () => {
    // Fund test accounts
    for (const kp of [bettor, bettor2]) {
      const sig = await provider.connection.requestAirdrop(kp.publicKey, 2e9);
      await provider.connection.confirmTransaction(sig);
    }

    // Create devnet USDC mint
    usdcMint = await createMint(provider.connection, creator, creator.publicKey, null, 6);

    // Create token accounts
    creatorUsdc = await createAssociatedTokenAccount(provider.connection, creator, usdcMint, creator.publicKey);
    bettorUsdc  = await createAssociatedTokenAccount(provider.connection, creator, usdcMint, bettor.publicKey);
    bettor2Usdc = await createAssociatedTokenAccount(provider.connection, creator, usdcMint, bettor2.publicKey);
    vaultUsdc   = await createAssociatedTokenAccount(provider.connection, creator, usdcMint, creator.publicKey);

    // Mint test USDC
    await mintTo(provider.connection, creator, usdcMint, bettorUsdc,  creator, 100_000_000); // $100
    await mintTo(provider.connection, creator, usdcMint, bettor2Usdc, creator, 50_000_000);  // $50

    // Derive market PDA
    [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), creator.publicKey.toBuffer(), Buffer.from(MARKET_TITLE)],
      program.programId
    );
    [betPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), marketPDA.toBuffer(), bettor.publicKey.toBuffer()],
      program.programId
    );
  });

  // ── Tests ─────────────────────────────────────────────────────────────────

  it("Creates a binary prediction market", async () => {
    const closeTs = new BN(Math.floor(Date.now() / 1000) + CLOSE_IN);

    await program.methods
      .createMarket({
        title:           MARKET_TITLE,
        category:        { crypto: {} },
        outcomes:        ["YES", "NO"],
        resolutionUrl:   "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
        resolutionPath:  "$.bitcoin.usd",
        closeTimestamp:  closeTs,
      })
      .accounts({
        market:        marketPDA,
        creator:       creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPDA);
    assert.equal(market.title,           MARKET_TITLE);
    assert.equal(market.outcomes.length, 2);
    assert.equal(market.outcomes[0],     "YES");
    assert.equal(market.outcomes[1],     "NO");
    assert.equal(market.resolved,        false);
    assert.equal(market.totalPool.toNumber(), 0);
    console.log("  ✅ Market created:", marketPDA.toBase58());
  });

  it("Rejects duplicate market creation", async () => {
    try {
      await program.methods
        .createMarket({
          title:          MARKET_TITLE,
          category:       { crypto: {} },
          outcomes:       ["YES", "NO"],
          resolutionUrl:  "https://api.example.com",
          resolutionPath: "$.result",
          closeTimestamp: new BN(Math.floor(Date.now() / 1000) + 3600),
        })
        .accounts({ market: marketPDA, creator: creator.publicKey, systemProgram: SystemProgram.programId })
        .rpc();
      assert.fail("Should have thrown");
    } catch (e: any) {
      assert.include(e.toString(), "already in use");
      console.log("  ✅ Duplicate market correctly rejected");
    }
  });

  it("Places a YES bet ($25 USDC)", async () => {
    await program.methods
      .placeBet(0 /* YES */, new BN(25_000_000))
      .accounts({
        market:     marketPDA,
        bet:        betPDA,
        bettor:     bettor.publicKey,
        bettorUsdc: bettorUsdc,
        vaultUsdc:  vaultUsdc,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([bettor])
      .rpc();

    const market = await program.account.market.fetch(marketPDA);
    const bet    = await program.account.bet.fetch(betPDA);

    assert.equal(market.outcomePools[0].toNumber(), 25_000_000);
    assert.equal(market.totalPool.toNumber(),        25_000_000);
    assert.equal(bet.outcome,                        0);
    assert.equal(bet.amount.toNumber(),              25_000_000);
    assert.equal(bet.claimed,                        false);
    console.log("  ✅ YES bet of $25 placed");
  });

  it("Places a NO bet ($10 USDC) from bettor2", async () => {
    const [bet2PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), marketPDA.toBuffer(), bettor2.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .placeBet(1 /* NO */, new BN(10_000_000))
      .accounts({
        market: marketPDA, bet: bet2PDA,
        bettor: bettor2.publicKey, bettorUsdc: bettor2Usdc,
        vaultUsdc, tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([bettor2])
      .rpc();

    const market = await program.account.market.fetch(marketPDA);
    assert.equal(market.totalPool.toNumber(), 35_000_000);
    console.log("  ✅ NO bet of $10 placed. Total pool: $35");
  });

  it("Rejects bet below minimum ($0.50)", async () => {
    try {
      await program.methods
        .placeBet(0, new BN(500_000)) // $0.50 — below $1 min
        .accounts({ market: marketPDA, bet: betPDA, bettor: bettor.publicKey, bettorUsdc, vaultUsdc, tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId })
        .signers([bettor])
        .rpc();
      assert.fail("Should have thrown");
    } catch (e: any) {
      assert.include(e.toString(), "BetTooSmall");
      console.log("  ✅ Sub-minimum bet correctly rejected");
    }
  });

  it("Waits for market close and resolves via HTTP oracle", async function () {
    this.timeout(30_000);
    console.log(`  ⏳ Waiting ${CLOSE_IN}s for market to close…`);
    await new Promise((r) => setTimeout(r, (CLOSE_IN + 2) * 1000));

    // In real Rialo: async engine calls resolve_market automatically.
    // In tests: we call it manually with a mock authority.
    await program.methods
      .resolveMarket()
      .accounts({
        market:           marketPDA,
        resolveAuthority: creator.publicKey,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPDA);
    assert.equal(market.resolved, true);
    assert.isNotNull(market.winningOutcome);
    console.log(`  ✅ Market resolved. Winner: outcome[${market.winningOutcome}] = "${["YES","NO"][market.winningOutcome]}"`);
  });

  it("Allows winner to claim payout", async () => {
    const market = await program.account.market.fetch(marketPDA);
    const winnerKp    = market.winningOutcome === 0 ? bettor : bettor2;
    const winnerUsdc  = market.winningOutcome === 0 ? bettorUsdc : bettor2Usdc;
    const winnerBetPDA = market.winningOutcome === 0 ? betPDA : PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), marketPDA.toBuffer(), bettor2.publicKey.toBuffer()], program.programId
    )[0];

    const balBefore = (await getAccount(provider.connection, winnerUsdc)).amount;

    await program.methods
      .claimWinnings()
      .accounts({
        market: marketPDA, bet: winnerBetPDA,
        winner: winnerKp.publicKey, bettor: winnerKp.publicKey,
        winnerUsdc, vaultUsdc,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([winnerKp])
      .rpc();

    const balAfter = (await getAccount(provider.connection, winnerUsdc)).amount;
    const payout   = Number(balAfter - balBefore) / 1_000_000;
    assert.isAbove(payout, 0);
    console.log(`  ✅ Winner claimed $${payout.toFixed(2)} USDC payout`);
  });

  it("Prevents double-claiming", async () => {
    const market = await program.account.market.fetch(marketPDA);
    const winnerKp   = market.winningOutcome === 0 ? bettor : bettor2;
    const winnerUsdc = market.winningOutcome === 0 ? bettorUsdc : bettor2Usdc;

    try {
      await program.methods.claimWinnings()
        .accounts({ market: marketPDA, bet: betPDA, winner: winnerKp.publicKey, bettor: winnerKp.publicKey, winnerUsdc, vaultUsdc, tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID })
        .signers([winnerKp]).rpc();
      assert.fail("Should have thrown");
    } catch (e: any) {
      assert.include(e.toString(), "AlreadyClaimed");
      console.log("  ✅ Double-claim correctly rejected");
    }
  });

  it("Creates a multi-outcome market (World Cup)", async () => {
    const wcTitle = "2026 World Cup Winner";
    const [wcPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), creator.publicKey.toBuffer(), Buffer.from(wcTitle)],
      program.programId
    );

    await program.methods
      .createMarket({
        title:           wcTitle,
        category:        { worldCup: {} },
        outcomes:        ["Brazil","France","England","Argentina"],
        resolutionUrl:   "https://api.fifa.com/worldcup/2026/winner",
        resolutionPath:  "$.winner.name",
        closeTimestamp:  new BN(Math.floor(Date.now() / 1000) + 86400 * 20),
      })
      .accounts({ market: wcPDA, creator: creator.publicKey, systemProgram: SystemProgram.programId })
      .rpc();

    const market = await program.account.market.fetch(wcPDA);
    assert.equal(market.outcomes.length, 4);
    assert.equal(market.outcomePools.length, 4);
    console.log("  ✅ Multi-outcome World Cup market created");
  });
});
