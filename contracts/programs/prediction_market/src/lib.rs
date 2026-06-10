// RialoPredict — Prediction Market Smart Contract
// Chain: Rialo (RISC-V + Solana VM compatible)
// Features: native async HTTP resolution, event-driven settlement, multi-outcome support

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use rialo_sdk::http::{HttpClient, HttpRequest, HttpResponse};
use rialo_sdk::async_engine::{emit_event, sleep_until, EventHandle};
use rialo_sdk::oracle::JsonPath;

declare_id!("PREDriAL0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

// ═══════════════════════════════════════════════
// PROGRAM ENTRYPOINT
// ═══════════════════════════════════════════════

#[program]
pub mod prediction_market {
    use super::*;

    /// Create a new prediction market. Rialo's async engine schedules
    /// resolution at close_timestamp via emit_event — no keeper needed.
    pub fn create_market(
        ctx: Context<CreateMarket>,
        params: CreateMarketParams,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(params.outcomes.len() >= 2, MarketError::TooFewOutcomes);
        require!(params.outcomes.len() <= 8, MarketError::TooManyOutcomes);
        require!(
            params.close_timestamp > clock.unix_timestamp + 60,
            MarketError::CloseTooSoon
        );
        require!(params.resolution_url.len() > 0, MarketError::MissingResolutionUrl);

        market.creator         = ctx.accounts.creator.key();
        market.title           = params.title;
        market.category        = params.category;
        market.outcomes        = params.outcomes.clone();
        market.resolution_url  = params.resolution_url;
        market.resolution_path = params.resolution_path;
        market.close_timestamp = params.close_timestamp;
        market.created_at      = clock.unix_timestamp;
        market.total_pool      = 0;
        market.resolved        = false;
        market.winning_outcome = None;
        market.fee_bps         = 200; // 2% protocol fee
        market.bump            = ctx.bumps.market;

        // Initialize pool buckets for each outcome
        market.outcome_pools = vec![0u64; params.outcomes.len()];

        // 🔑 Rialo: schedule async wakeup at close time — no cron job needed
        emit_event(
            "schedule_resolve",
            ScheduleResolvePayload {
                market: market.key(),
                resolve_at: params.close_timestamp,
            },
        )?;

        emit!(MarketCreated {
            market: market.key(),
            creator: ctx.accounts.creator.key(),
            title: market.title.clone(),
            close_timestamp: market.close_timestamp,
        });

        Ok(())
    }

    /// Place a bet on a specific outcome index.
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        outcome_index: u8,
        amount_usdc: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock  = Clock::get()?;

        require!(!market.resolved,                            MarketError::AlreadyResolved);
        require!(clock.unix_timestamp < market.close_timestamp, MarketError::MarketClosed);
        require!((outcome_index as usize) < market.outcomes.len(), MarketError::InvalidOutcome);
        require!(amount_usdc >= 1_000_000,                    MarketError::BetTooSmall); // min $1 USDC

        // Transfer USDC from bettor to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.bettor_usdc.to_account_info(),
                    to:        ctx.accounts.vault_usdc.to_account_info(),
                    authority: ctx.accounts.bettor.to_account_info(),
                },
            ),
            amount_usdc,
        )?;

        // Update market pools
        market.outcome_pools[outcome_index as usize] += amount_usdc;
        market.total_pool += amount_usdc;

        // Record the bet
        let bet      = &mut ctx.accounts.bet;
        bet.bettor   = ctx.accounts.bettor.key();
        bet.market   = market.key();
        bet.outcome  = outcome_index;
        bet.amount   = amount_usdc;
        bet.claimed  = false;
        bet.placed_at = clock.unix_timestamp;
        bet.bump     = ctx.bumps.bet;

        emit!(BetPlaced {
            bettor:  ctx.accounts.bettor.key(),
            market:  market.key(),
            outcome: outcome_index,
            amount:  amount_usdc,
        });

        Ok(())
    }

    /// Rialo async handler — wakes up at close_timestamp and calls the
    /// resolution URL directly. No oracle middleware, no keeper bot.
    #[rialo::async_handler(event = "schedule_resolve")]
    pub async fn resolve_market(
        ctx: Context<ResolveMarket>,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.resolved, MarketError::AlreadyResolved);

        // 🌐 Rialo native HTTP — direct HTTPS call from smart contract
        let request = HttpRequest::get(&market.resolution_url)
            .header("Accept", "application/json")
            .header("User-Agent", "RialoPredict/1.0")
            .timeout_ms(5000)
            .build();

        let response: HttpResponse = HttpClient::fetch(request).await
            .map_err(|_| MarketError::HttpFetchFailed)?;

        require!(response.status == 200, MarketError::HttpBadStatus);

        let body: serde_json::Value = serde_json::from_slice(&response.body)
            .map_err(|_| MarketError::JsonParseFailed)?;

        // Extract value at JSON path (e.g. "$.bitcoin.usd" or "$.result")
        let resolved_value = JsonPath::select(&body, &market.resolution_path)
            .map_err(|_| MarketError::JsonPathFailed)?;

        // Determine winning outcome index from resolved value
        let winning_outcome = determine_winner(&market.outcomes, &resolved_value)?;

        market.winning_outcome = Some(winning_outcome);
        market.resolved        = true;

        emit!(MarketResolved {
            market:          market.key(),
            winning_outcome,
            resolved_value:  resolved_value.to_string(),
        });

        Ok(())
    }

    /// Claim winnings after market resolution.
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        let bet    = &mut ctx.accounts.bet;

        require!(market.resolved,        MarketError::NotYetResolved);
        require!(!bet.claimed,           MarketError::AlreadyClaimed);
        require!(
            bet.outcome == market.winning_outcome.unwrap(),
            MarketError::DidNotWin
        );

        let winning_pool  = market.outcome_pools[bet.outcome as usize];
        let total_pool    = market.total_pool;
        let gross_payout  = (bet.amount as u128 * total_pool as u128 / winning_pool as u128) as u64;
        let protocol_fee  = gross_payout * market.fee_bps as u64 / 10_000;
        let net_payout    = gross_payout - protocol_fee;

        // Transfer net payout from vault to winner
        let seeds = &[b"market".as_ref(), market.creator.as_ref(), &[market.bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.vault_usdc.to_account_info(),
                    to:        ctx.accounts.winner_usdc.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                &[seeds],
            ),
            net_payout,
        )?;

        bet.claimed = true;

        emit!(WinningsClaimed {
            bettor:  ctx.accounts.winner.key(),
            market:  market.key(),
            payout:  net_payout,
        });

        Ok(())
    }

    /// Admin: emergency pause/unpause a market.
    pub fn toggle_pause(ctx: Context<TogglePause>, paused: bool) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(ctx.accounts.admin.key() == market.creator, MarketError::Unauthorized);
        market.paused = paused;
        Ok(())
    }
}

// ═══════════════════════════════════════════════
// ACCOUNTS
// ═══════════════════════════════════════════════

#[derive(Accounts)]
#[instruction(params: CreateMarketParams)]
pub struct CreateMarket<'info> {
    #[account(
        init, payer = creator,
        space = Market::space(&params.outcomes, &params.title),
        seeds = [b"market", creator.key().as_ref(), params.title.as_bytes()],
        bump,
    )]
    pub market:  Account<'info, Market>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut, has_one = vault_usdc)]
    pub market:      Account<'info, Market>,
    #[account(
        init, payer = bettor,
        space = Bet::SPACE,
        seeds = [b"bet", market.key().as_ref(), bettor.key().as_ref()],
        bump,
    )]
    pub bet:         Account<'info, Bet>,
    #[account(mut)]
    pub bettor:      Signer<'info>,
    #[account(mut)]
    pub bettor_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_usdc:  Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market:      Account<'info, Market>,
    /// CHECK: Rialo async engine signer
    pub resolve_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(has_one = vault_usdc)]
    pub market:      Account<'info, Market>,
    #[account(mut, has_one = market, has_one = bettor)]
    pub bet:         Account<'info, Bet>,
    pub winner:      Signer<'info>,
    /// CHECK: validated via bet.bettor
    pub bettor:      AccountInfo<'info>,
    #[account(mut)]
    pub winner_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_usdc:  Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TogglePause<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub admin:  Signer<'info>,
}

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════

#[account]
pub struct Market {
    pub creator:          Pubkey,
    pub title:            String,
    pub category:         MarketCategory,
    pub outcomes:         Vec<String>,
    pub outcome_pools:    Vec<u64>,
    pub total_pool:       u64,
    pub resolution_url:   String,
    pub resolution_path:  String,
    pub close_timestamp:  i64,
    pub created_at:       i64,
    pub resolved:         bool,
    pub paused:           bool,
    pub winning_outcome:  Option<u8>,
    pub fee_bps:          u16,
    pub vault_usdc:       Pubkey,
    pub bump:             u8,
}

impl Market {
    pub fn space(outcomes: &[String], title: &str) -> usize {
        8 + 32 + (4 + title.len()) + 1 + 
        (4 + outcomes.len() * 50) +   // outcomes vec
        (4 + outcomes.len() * 8)  +   // pools vec
        8 + (4 + 200) + (4 + 100) +   // url + path
        8 + 8 + 1 + 1 + 2 + 2 + 32 + 1
    }
}

#[account]
pub struct Bet {
    pub bettor:    Pubkey,
    pub market:    Pubkey,
    pub outcome:   u8,
    pub amount:    u64,
    pub claimed:   bool,
    pub placed_at: i64,
    pub bump:      u8,
}

impl Bet {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 8 + 1 + 8 + 1;
}

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateMarketParams {
    pub title:            String,
    pub category:         MarketCategory,
    pub outcomes:         Vec<String>,
    pub resolution_url:   String,
    pub resolution_path:  String,
    pub close_timestamp:  i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum MarketCategory {
    CryptoOneMin,
    Crypto,
    Sports,
    WorldCup,
    Wrestling,
    Politics,
    Economy,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ScheduleResolvePayload {
    pub market:     Pubkey,
    pub resolve_at: i64,
}

// ═══════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════

#[event] pub struct MarketCreated  { pub market: Pubkey, pub creator: Pubkey, pub title: String, pub close_timestamp: i64 }
#[event] pub struct BetPlaced      { pub bettor: Pubkey, pub market: Pubkey, pub outcome: u8, pub amount: u64 }
#[event] pub struct MarketResolved { pub market: Pubkey, pub winning_outcome: u8, pub resolved_value: String }
#[event] pub struct WinningsClaimed{ pub bettor: Pubkey, pub market: Pubkey, pub payout: u64 }

// ═══════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════

#[error_code]
pub enum MarketError {
    #[msg("Market is already resolved")]            AlreadyResolved,
    #[msg("Market is closed for betting")]          MarketClosed,
    #[msg("Market is not yet resolved")]            NotYetResolved,
    #[msg("Invalid outcome index")]                 InvalidOutcome,
    #[msg("Winnings already claimed")]              AlreadyClaimed,
    #[msg("Losing side cannot claim")]              DidNotWin,
    #[msg("Must provide at least 2 outcomes")]      TooFewOutcomes,
    #[msg("Maximum 8 outcomes allowed")]            TooManyOutcomes,
    #[msg("Close time must be > 60s from now")]     CloseTooSoon,
    #[msg("Resolution URL is required")]            MissingResolutionUrl,
    #[msg("HTTP fetch to resolution URL failed")]   HttpFetchFailed,
    #[msg("HTTP response status not 200")]          HttpBadStatus,
    #[msg("Failed to parse resolution JSON")]       JsonParseFailed,
    #[msg("JSON path query failed")]                JsonPathFailed,
    #[msg("Bet amount below minimum ($1 USDC)")]    BetTooSmall,
    #[msg("Unauthorized action")]                   Unauthorized,
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

fn determine_winner(outcomes: &[String], resolved_value: &serde_json::Value) -> Result<u8> {
    let val_str = resolved_value.to_string().to_lowercase();
    // Try exact string match first
    for (i, outcome) in outcomes.iter().enumerate() {
        if val_str.contains(&outcome.to_lowercase()) {
            return Ok(i as u8);
        }
    }
    // Numeric comparison for binary markets (e.g. price above/below threshold)
    if let Some(num) = resolved_value.as_f64() {
        // Convention: first outcome = YES/ABOVE, second = NO/BELOW
        // Resolution path should encode threshold e.g. "$.price > 110000"
        return Ok(if num > 0.0 { 0 } else { 1 });
    }
    Err(MarketError::JsonParseFailed.into())
}
