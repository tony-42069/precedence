# Precedence - Solana Smart Contract Specifications

## Overview

This document provides complete specifications for Precedence's Solana smart contracts built using the Anchor framework. These contracts handle market creation, betting, escrow, settlement, and oracle integration.

## Project Structure

```
precedence-solana/
├── Anchor.toml
├── Cargo.toml
├── programs/
│   ├── market-manager/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── errors.rs
│   │       ├── constants.rs
│   │       ├── instructions/
│   │       │   ├── mod.rs
│   │       │   ├── create_market.rs
│   │       │   ├── place_bet.rs
│   │       │   ├── add_liquidity.rs
│   │       │   ├── remove_liquidity.rs
│   │       │   ├── claim_winnings.rs
│   │       │   └── settle_market.rs
│   │       ├── state/
│   │       │   ├── mod.rs
│   │       │   ├── market.rs
│   │       │   ├── bet.rs
│   │       │   └── pool.rs
│   │       └── utils/
│   │           ├── mod.rs
│   │           └── amm.rs
│   └── oracle/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── errors.rs
│           ├── instructions/
│           │   ├── mod.rs
│           │   ├── initialize_oracle.rs
│           │   ├── submit_outcome.rs
│           │   ├── verify_outcome.rs
│           │   └── dispute_outcome.rs
│           └── state/
│               ├── mod.rs
│               ├── oracle_config.rs
│               └── outcome.rs
├── tests/
│   ├── market-manager.ts
│   └── oracle.ts
└── migrations/
    └── deploy.ts
```

## Program 1: Market Manager

### Cargo.toml

```toml
[package]
name = "market-manager"
version = "0.1.0"
description = "Prediction market manager for Precedence"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "market_manager"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
```

### lib.rs

```rust
use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("MktMgr111111111111111111111111111111111111");

#[program]
pub mod market_manager {
    use super::*;

    /// Initialize a new prediction market
    pub fn create_market(
        ctx: Context<CreateMarket>,
        case_id: String,
        outcomes: Vec<String>,
        settlement_time: i64,
        initial_liquidity: u64,
    ) -> Result<()> {
        instructions::create_market::handler(
            ctx,
            case_id,
            outcomes,
            settlement_time,
            initial_liquidity,
        )
    }

    /// Place a bet on an outcome
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        outcome_index: u8,
        amount: u64,
        min_shares: u64,
    ) -> Result<()> {
        instructions::place_bet::handler(ctx, outcome_index, amount, min_shares)
    }

    /// Add liquidity to the market AMM pool
    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        amounts: Vec<u64>,
    ) -> Result<()> {
        instructions::add_liquidity::handler(ctx, amounts)
    }

    /// Remove liquidity from the market AMM pool
    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_tokens: u64,
    ) -> Result<()> {
        instructions::remove_liquidity::handler(ctx, lp_tokens)
    }

    /// Settle market after oracle provides outcome
    pub fn settle_market(ctx: Context<SettleMarket>) -> Result<()> {
        instructions::settle_market::handler(ctx)
    }

    /// Claim winnings from a settled market
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings::handler(ctx)
    }
}
```

### constants.rs

```rust
use anchor_lang::prelude::*;

/// Platform fee in basis points (250 = 2.5%)
pub const PLATFORM_FEE_BPS: u16 = 250;

/// Maximum number of outcomes per market
pub const MAX_OUTCOMES: usize = 10;

/// Minimum bet amount in lamports (0.01 SOL)
pub const MIN_BET_AMOUNT: u64 = 10_000_000;

/// Maximum bet amount in lamports (100 SOL)
pub const MAX_BET_AMOUNT: u64 = 100_000_000_000;

/// Minimum initial liquidity (1 SOL)
pub const MIN_INITIAL_LIQUIDITY: u64 = 1_000_000_000;

/// Dispute period in seconds (24 hours)
pub const DISPUTE_PERIOD: i64 = 86400;

/// Seeds for PDA derivation
#[constant]
pub const MARKET_SEED: &[u8] = b"market";

#[constant]
pub const BET_SEED: &[u8] = b"bet";

#[constant]
pub const POOL_SEED: &[u8] = b"pool";

#[constant]
pub const ESCROW_SEED: &[u8] = b"escrow";

#[constant]
pub const LP_TOKEN_SEED: &[u8] = b"lp_token";
```

### errors.rs

```rust
use anchor_lang::prelude::*;

#[error_code]
pub enum MarketError {
    #[msg("Market is not active")]
    MarketNotActive,

    #[msg("Market already settled")]
    MarketAlreadySettled,

    #[msg("Settlement time not reached")]
    SettlementTimeNotReached,

    #[msg("Invalid outcome index")]
    InvalidOutcomeIndex,

    #[msg("Bet amount too small")]
    BetAmountTooSmall,

    #[msg("Bet amount too large")]
    BetAmountTooLarge,

    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Too many outcomes")]
    TooManyOutcomes,

    #[msg("Market not settled yet")]
    MarketNotSettled,

    #[msg("Already claimed winnings")]
    AlreadyClaimed,

    #[msg("Not a winning bet")]
    NotWinningBet,

    #[msg("Oracle not authorized")]
    OracleNotAuthorized,

    #[msg("Invalid liquidity amounts")]
    InvalidLiquidityAmounts,

    #[msg("Insufficient LP tokens")]
    InsufficientLPTokens,

    #[msg("Case ID too long")]
    CaseIdTooLong,

    #[msg("Outcome name too long")]
    OutcomeNameTooLong,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow,
}
```

### state/market.rs

```rust
use anchor_lang::prelude::*;
use crate::constants::MAX_OUTCOMES;

#[account]
pub struct Market {
    /// Unique identifier for the case
    pub case_id: String,                    // Max 64 chars

    /// Market creator
    pub creator: Pubkey,

    /// Oracle authority for settlement
    pub oracle: Pubkey,

    /// Possible outcomes
    pub outcomes: Vec<Outcome>,             // Max MAX_OUTCOMES

    /// Total SOL locked in market
    pub total_liquidity: u64,

    /// Total number of bets placed
    pub total_bets: u64,

    /// Market status
    pub status: MarketStatus,

    /// When the market closes for new bets
    pub settlement_time: i64,

    /// Winning outcome index (after settlement)
    pub winning_outcome: Option<u8>,

    /// Platform fee in basis points
    pub fee_bps: u16,

    /// When market was created
    pub created_at: i64,

    /// When market was settled
    pub settled_at: Option<i64>,

    /// PDA bump
    pub bump: u8,
}

impl Market {
    pub const LEN: usize = 8 +              // discriminator
        (4 + 64) +                          // case_id
        32 +                                // creator
        32 +                                // oracle
        (4 + MAX_OUTCOMES * Outcome::LEN) + // outcomes vec
        8 +                                 // total_liquidity
        8 +                                 // total_bets
        1 +                                 // status
        8 +                                 // settlement_time
        (1 + 1) +                           // winning_outcome option
        2 +                                 // fee_bps
        8 +                                 // created_at
        (1 + 8) +                           // settled_at option
        1;                                  // bump

    pub fn is_active(&self) -> bool {
        matches!(self.status, MarketStatus::Active)
    }

    pub fn is_settled(&self) -> bool {
        matches!(self.status, MarketStatus::Settled)
    }

    pub fn can_settle(&self, current_time: i64) -> bool {
        self.is_active() && current_time >= self.settlement_time
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketStatus {
    Active,
    Closed,      // No more bets, awaiting settlement
    Settled,     // Oracle has provided outcome
    Disputed,    // Outcome is disputed
    Cancelled,   // Market cancelled, refunds enabled
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Outcome {
    /// Name of the outcome (e.g., "Plaintiff Wins")
    pub name: String,               // Max 64 chars

    /// Total shares for this outcome
    pub total_shares: u64,

    /// Current price (calculated from AMM)
    pub price: u64,

    /// Total bets on this outcome
    pub bet_count: u64,
}

impl Outcome {
    pub const LEN: usize = (4 + 64) + // name
        8 +                            // total_shares
        8 +                            // price
        8;                             // bet_count
}
```

### state/bet.rs

```rust
use anchor_lang::prelude::*;

#[account]
pub struct Bet {
    /// Market this bet belongs to
    pub market: Pubkey,

    /// Bettor's wallet
    pub user: Pubkey,

    /// Which outcome they bet on
    pub outcome_index: u8,

    /// Amount wagered (lamports)
    pub amount: u64,

    /// Shares received from AMM
    pub shares: u64,

    /// Price at time of bet (for display)
    pub entry_price: u64,

    /// When bet was placed
    pub timestamp: i64,

    /// Whether winnings have been claimed
    pub claimed: bool,

    /// PDA bump
    pub bump: u8,
}

impl Bet {
    pub const LEN: usize = 8 +      // discriminator
        32 +                        // market
        32 +                        // user
        1 +                         // outcome_index
        8 +                         // amount
        8 +                         // shares
        8 +                         // entry_price
        8 +                         // timestamp
        1 +                         // claimed
        1;                          // bump
}
```

### state/pool.rs

```rust
use anchor_lang::prelude::*;
use crate::constants::MAX_OUTCOMES;

#[account]
pub struct LiquidityPool {
    /// Market this pool belongs to
    pub market: Pubkey,

    /// Reserve amounts for each outcome
    pub reserves: Vec<u64>,         // Length matches outcomes

    /// Total LP tokens minted
    pub total_lp_tokens: u64,

    /// Constant product k (for CPMM)
    pub k_constant: u128,

    /// PDA bump
    pub bump: u8,
}

impl LiquidityPool {
    pub const LEN: usize = 8 +              // discriminator
        32 +                                // market
        (4 + MAX_OUTCOMES * 8) +            // reserves vec
        8 +                                 // total_lp_tokens
        16 +                                // k_constant
        1;                                  // bump

    /// Calculate output amount using constant product formula
    pub fn calculate_output_amount(
        &self,
        input_amount: u64,
        input_reserve: u64,
        output_reserve: u64,
    ) -> Result<u64> {
        let input_amount_u128 = input_amount as u128;
        let input_reserve_u128 = input_reserve as u128;
        let output_reserve_u128 = output_reserve as u128;

        let numerator = input_amount_u128
            .checked_mul(output_reserve_u128)
            .ok_or(crate::errors::MarketError::ArithmeticOverflow)?;

        let denominator = input_reserve_u128
            .checked_add(input_amount_u128)
            .ok_or(crate::errors::MarketError::ArithmeticOverflow)?;

        let output = numerator
            .checked_div(denominator)
            .ok_or(crate::errors::MarketError::ArithmeticOverflow)?;

        Ok(output as u64)
    }

    /// Update reserves after a bet
    pub fn update_reserves(
        &mut self,
        outcome_index: u8,
        amount_in: u64,
        shares_out: u64,
    ) -> Result<()> {
        let idx = outcome_index as usize;
        
        self.reserves[idx] = self.reserves[idx]
            .checked_add(amount_in)
            .ok_or(crate::errors::MarketError::ArithmeticOverflow)?;

        Ok(())
    }

    /// Calculate current price for an outcome
    pub fn get_price(&self, outcome_index: u8) -> Result<u64> {
        let idx = outcome_index as usize;
        let total_reserves: u128 = self.reserves.iter().map(|&r| r as u128).sum();
        
        let price = ((self.reserves[idx] as u128)
            .checked_mul(1_000_000)
            .ok_or(crate::errors::MarketError::ArithmeticOverflow)?)
            .checked_div(total_reserves)
            .ok_or(crate::errors::MarketError::ArithmeticOverflow)?;

        Ok(price as u64)
    }
}
```

### instructions/create_market.rs

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use crate::{constants::*, errors::*, state::*};

#[derive(Accounts)]
#[instruction(case_id: String)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = creator,
        space = Market::LEN,
        seeds = [MARKET_SEED, case_id.as_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = creator,
        space = LiquidityPool::LEN,
        seeds = [POOL_SEED, market.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, LiquidityPool>,

    #[account(mut)]
    pub creator: Signer<'info>,

    /// Oracle authority (typically a PDA controlled by oracle program)
    /// CHECK: Oracle address validation happens off-chain
    pub oracle: UncheckedAccount<'info>,

    /// Escrow account to hold market funds
    #[account(
        init,
        payer = creator,
        seeds = [ESCROW_SEED, market.key().as_ref()],
        bump,
        token::mint = native_mint,
        token::authority = market
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// Native SOL mint (for wrapped SOL)
    pub native_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    case_id: String,
    outcomes: Vec<String>,
    settlement_time: i64,
    initial_liquidity: u64,
) -> Result<()> {
    require!(
        case_id.len() <= 64,
        MarketError::CaseIdTooLong
    );

    require!(
        outcomes.len() >= 2 && outcomes.len() <= MAX_OUTCOMES,
        MarketError::TooManyOutcomes
    );

    require!(
        initial_liquidity >= MIN_INITIAL_LIQUIDITY,
        MarketError::InsufficientLiquidity
    );

    let clock = Clock::get()?;
    require!(
        settlement_time > clock.unix_timestamp,
        MarketError::SettlementTimeNotReached
    );

    let market = &mut ctx.accounts.market;
    let pool = &mut ctx.accounts.pool;

    // Initialize market
    market.case_id = case_id;
    market.creator = ctx.accounts.creator.key();
    market.oracle = ctx.accounts.oracle.key();
    market.status = MarketStatus::Active;
    market.settlement_time = settlement_time;
    market.winning_outcome = None;
    market.fee_bps = PLATFORM_FEE_BPS;
    market.created_at = clock.unix_timestamp;
    market.settled_at = None;
    market.total_liquidity = initial_liquidity;
    market.total_bets = 0;
    market.bump = ctx.bumps.market;

    // Initialize outcomes
    let outcome_count = outcomes.len();
    let liquidity_per_outcome = initial_liquidity / outcome_count as u64;

    market.outcomes = outcomes
        .into_iter()
        .map(|name| {
            require!(
                name.len() <= 64,
                MarketError::OutcomeNameTooLong
            );
            Ok(Outcome {
                name,
                total_shares: liquidity_per_outcome,
                price: 1_000_000 / outcome_count as u64, // Equal initial prices
                bet_count: 0,
            })
        })
        .collect::<Result<Vec<_>>>()?;

    // Initialize liquidity pool
    pool.market = market.key();
    pool.reserves = vec![liquidity_per_outcome; outcome_count];
    pool.total_lp_tokens = initial_liquidity;
    pool.k_constant = pool.reserves
        .iter()
        .map(|&r| r as u128)
        .product();
    pool.bump = ctx.bumps.pool;

    // Transfer initial liquidity to escrow
    // Note: In production, creator should wrap SOL first
    // This is simplified for the example

    msg!("Market created: {}", market.case_id);
    msg!("Settlement time: {}", market.settlement_time);
    msg!("Outcomes: {}", market.outcomes.len());

    Ok(())
}
```

### instructions/place_bet.rs

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{constants::*, errors::*, state::*, utils::amm};

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(
        mut,
        constraint = market.is_active() @ MarketError::MarketNotActive
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [POOL_SEED, market.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, LiquidityPool>,

    #[account(
        init,
        payer = user,
        space = Bet::LEN,
        seeds = [BET_SEED, market.key().as_ref(), user.key().as_ref(), &market.total_bets.to_le_bytes()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        token::mint = native_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, market.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// CHECK: Native mint address
    pub native_mint: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<PlaceBet>,
    outcome_index: u8,
    amount: u64,
    min_shares: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let pool = &mut ctx.accounts.pool;
    let bet = &mut ctx.accounts.bet;

    // Validation
    require!(
        outcome_index < market.outcomes.len() as u8,
        MarketError::InvalidOutcomeIndex
    );

    require!(
        amount >= MIN_BET_AMOUNT,
        MarketError::BetAmountTooSmall
    );

    require!(
        amount <= MAX_BET_AMOUNT,
        MarketError::BetAmountTooLarge
    );

    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp < market.settlement_time,
        MarketError::SettlementTimeNotReached
    );

    // Calculate shares using AMM formula
    let idx = outcome_index as usize;
    let shares = amm::calculate_shares_out(
        amount,
        pool.reserves[idx],
        pool.k_constant,
    )?;

    // Check slippage tolerance
    require!(
        shares >= min_shares,
        MarketError::SlippageExceeded
    );

    // Transfer tokens from user to escrow
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.escrow.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    // Calculate current price
    let current_price = pool.get_price(outcome_index)?;

    // Update pool reserves
    pool.update_reserves(outcome_index, amount, shares)?;

    // Update market stats
    market.total_liquidity = market.total_liquidity
        .checked_add(amount)
        .ok_or(MarketError::ArithmeticOverflow)?;
    market.total_bets = market.total_bets
        .checked_add(1)
        .ok_or(MarketError::ArithmeticOverflow)?;
    market.outcomes[idx].total_shares = market.outcomes[idx].total_shares
        .checked_add(shares)
        .ok_or(MarketError::ArithmeticOverflow)?;
    market.outcomes[idx].bet_count = market.outcomes[idx].bet_count
        .checked_add(1)
        .ok_or(MarketError::ArithmeticOverflow)?;

    // Update price
    market.outcomes[idx].price = pool.get_price(outcome_index)?;

    // Initialize bet account
    bet.market = market.key();
    bet.user = ctx.accounts.user.key();
    bet.outcome_index = outcome_index;
    bet.amount = amount;
    bet.shares = shares;
    bet.entry_price = current_price;
    bet.timestamp = clock.unix_timestamp;
    bet.claimed = false;
    bet.bump = ctx.bumps.bet;

    msg!("Bet placed: {} SOL on outcome {}", amount as f64 / 1e9, outcome_index);
    msg!("Shares received: {}", shares);

    Ok(())
}
```

### instructions/settle_market.rs

```rust
use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, state::*};

#[derive(Accounts)]
pub struct SettleMarket<'info> {
    #[account(
        mut,
        constraint = market.can_settle(Clock::get()?.unix_timestamp) @ MarketError::SettlementTimeNotReached
    )]
    pub market: Account<'info, Market>,

    /// Oracle account that provides the outcome
    /// CHECK: Verified against market.oracle
    #[account(constraint = oracle.key() == market.oracle @ MarketError::OracleNotAuthorized)]
    pub oracle: Signer<'info>,
}

pub fn handler(ctx: Context<SettleMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;

    // Market should be automatically settled by oracle service
    // This function can only be called after settlement_time
    require!(
        clock.unix_timestamp >= market.settlement_time,
        MarketError::SettlementTimeNotReached
    );

    require!(
        !market.is_settled(),
        MarketError::MarketAlreadySettled
    );

    // Update market status
    market.status = MarketStatus::Closed;
    market.settled_at = Some(clock.unix_timestamp);

    msg!("Market closed, awaiting oracle outcome");

    Ok(())
}
```

### instructions/claim_winnings.rs

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{constants::*, errors::*, state::*};

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        constraint = market.is_settled() @ MarketError::MarketNotSettled
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        constraint = bet.market == market.key(),
        constraint = !bet.claimed @ MarketError::AlreadyClaimed,
        constraint = bet.user == user.key()
    )]
    pub bet: Account<'info, Bet>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        token::mint = native_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, market.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// CHECK: Market PDA authority
    #[account(seeds = [MARKET_SEED, market.case_id.as_bytes()], bump = market.bump)]
    pub market_authority: UncheckedAccount<'info>,

    /// CHECK: Native mint
    pub native_mint: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    let market = &ctx.accounts.market;
    let bet = &mut ctx.accounts.bet;

    // Check if bet won
    let winning_outcome = market.winning_outcome
        .ok_or(MarketError::MarketNotSettled)?;

    require!(
        bet.outcome_index == winning_outcome,
        MarketError::NotWinningBet
    );

    // Calculate winnings
    let winning_outcome_shares = market.outcomes[winning_outcome as usize].total_shares;
    let total_liquidity = market.total_liquidity;

    // Winnings = (user_shares / total_winning_shares) * total_liquidity
    let winnings = (bet.shares as u128)
        .checked_mul(total_liquidity as u128)
        .ok_or(MarketError::ArithmeticOverflow)?
        .checked_div(winning_outcome_shares as u128)
        .ok_or(MarketError::ArithmeticOverflow)? as u64;

    // Deduct platform fee
    let fee = (winnings as u128)
        .checked_mul(market.fee_bps as u128)
        .ok_or(MarketError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(MarketError::ArithmeticOverflow)? as u64;

    let payout = winnings
        .checked_sub(fee)
        .ok_or(MarketError::ArithmeticUnderflow)?;

    // Transfer winnings to user
    let case_id_bytes = market.case_id.as_bytes();
    let seeds = &[
        MARKET_SEED,
        case_id_bytes,
        &[market.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.market_authority.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, payout)?;

    // Mark bet as claimed
    bet.claimed = true;

    msg!("Winnings claimed: {} SOL", payout as f64 / 1e9);
    msg!("Platform fee: {} SOL", fee as f64 / 1e9);

    Ok(())
}
```

### utils/amm.rs

```rust
use anchor_lang::prelude::*;
use crate::errors::MarketError;

/// Calculate shares out using constant product formula
/// For a binary market: x * y = k
/// For multi-outcome: product of all reserves = k
pub fn calculate_shares_out(
    amount_in: u64,
    reserve: u64,
    k_constant: u128,
) -> Result<u64> {
    let amount_in_u128 = amount_in as u128;
    let reserve_u128 = reserve as u128;

    // New reserve after adding liquidity
    let new_reserve = reserve_u128
        .checked_add(amount_in_u128)
        .ok_or(MarketError::ArithmeticOverflow)?;

    // Calculate output using: shares_out = reserve - (k / new_reserve)
    let output_reserve = k_constant
        .checked_div(new_reserve)
        .ok_or(MarketError::ArithmeticOverflow)?;

    let shares = reserve_u128
        .checked_sub(output_reserve)
        .ok_or(MarketError::ArithmeticUnderflow)?;

    Ok(shares as u64)
}

/// Calculate price impact
pub fn calculate_price_impact(
    amount_in: u64,
    reserve_in: u64,
    reserve_out: u64,
) -> Result<u64> {
    let amount_in_u128 = amount_in as u128;
    let reserve_in_u128 = reserve_in as u128;
    let reserve_out_u128 = reserve_out as u128;

    // Spot price before = reserve_out / reserve_in
    let spot_price_before = (reserve_out_u128 * 1_000_000)
        .checked_div(reserve_in_u128)
        .ok_or(MarketError::ArithmeticOverflow)?;

    // Spot price after = new_reserve_out / new_reserve_in
    let new_reserve_in = reserve_in_u128
        .checked_add(amount_in_u128)
        .ok_or(MarketError::ArithmeticOverflow)?;

    // Using constant product formula to find new_reserve_out
    let k = reserve_in_u128
        .checked_mul(reserve_out_u128)
        .ok_or(MarketError::ArithmeticOverflow)?;

    let new_reserve_out = k
        .checked_div(new_reserve_in)
        .ok_or(MarketError::ArithmeticOverflow)?;

    let spot_price_after = (new_reserve_out * 1_000_000)
        .checked_div(new_reserve_in)
        .ok_or(MarketError::ArithmeticOverflow)?;

    // Price impact = (price_after - price_before) / price_before
    let impact = if spot_price_after > spot_price_before {
        ((spot_price_after - spot_price_before) * 1_000_000)
            .checked_div(spot_price_before)
            .ok_or(MarketError::ArithmeticOverflow)?
    } else {
        ((spot_price_before - spot_price_after) * 1_000_000)
            .checked_div(spot_price_before)
            .ok_or(MarketError::ArithmeticOverflow)?
    };

    Ok(impact as u64)
}
```

## Program 2: Oracle

### oracle/lib.rs

```rust
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("OraC1e111111111111111111111111111111111111");

#[program]
pub mod oracle {
    use super::*;

    /// Initialize oracle configuration
    pub fn initialize_oracle(
        ctx: Context<InitializeOracle>,
        verification_threshold: u8,
    ) -> Result<()> {
        instructions::initialize_oracle::handler(ctx, verification_threshold)
    }

    /// Submit case outcome
    pub fn submit_outcome(
        ctx: Context<SubmitOutcome>,
        outcome_index: u8,
        evidence_hash: [u8; 32],
    ) -> Result<()> {
        instructions::submit_outcome::handler(ctx, outcome_index, evidence_hash)
    }

    /// Verify submitted outcome
    pub fn verify_outcome(
        ctx: Context<VerifyOutcome>,
    ) -> Result<()> {
        instructions::verify_outcome::handler(ctx)
    }

    /// Dispute an outcome (emergency)
    pub fn dispute_outcome(
        ctx: Context<DisputeOutcome>,
        reason: String,
    ) -> Result<()> {
        instructions::dispute_outcome::handler(ctx, reason)
    }
}
```

### oracle/state/outcome.rs

```rust
use anchor_lang::prelude::*;

#[account]
pub struct OracleOutcome {
    /// Market this outcome is for
    pub market: Pubkey,

    /// Submitted winning outcome index
    pub winning_outcome: u8,

    /// Whether outcome is verified
    pub verified: bool,

    /// Oracle nodes that have verified
    pub verifiers: Vec<Pubkey>,

    /// Required number of verifications
    pub verification_threshold: u8,

    /// Hash of evidence (IPFS CID or similar)
    pub evidence_hash: [u8; 32],

    /// When outcome was submitted
    pub submitted_at: i64,

    /// When outcome was verified
    pub verified_at: Option<i64>,

    /// Dispute information
    pub disputed: bool,
    pub dispute_reason: Option<String>,

    /// PDA bump
    pub bump: u8,
}

impl OracleOutcome {
    pub const MAX_VERIFIERS: usize = 10;
    
    pub const LEN: usize = 8 +                  // discriminator
        32 +                                     // market
        1 +                                      // winning_outcome
        1 +                                      // verified
        (4 + Self::MAX_VERIFIERS * 32) +        // verifiers vec
        1 +                                      // verification_threshold
        32 +                                     // evidence_hash
        8 +                                      // submitted_at
        (1 + 8) +                                // verified_at option
        1 +                                      // disputed
        (1 + 4 + 256) +                          // dispute_reason option
        1;                                       // bump

    pub fn is_verified(&self) -> bool {
        self.verified && self.verifiers.len() >= self.verification_threshold as usize
    }

    pub fn can_finalize(&self) -> bool {
        !self.disputed && self.verifiers.len() >= self.verification_threshold as usize
    }
}
```

### oracle/instructions/submit_outcome.rs

```rust
use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct SubmitOutcome<'info> {
    #[account(
        init,
        payer = oracle_authority,
        space = OracleOutcome::LEN,
        seeds = [b"outcome", market.key().as_ref()],
        bump
    )]
    pub outcome: Account<'info, OracleOutcome>,

    /// CHECK: Market account
    pub market: UncheckedAccount<'info>,

    /// Oracle authority submitting outcome
    #[account(mut)]
    pub oracle_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SubmitOutcome>,
    outcome_index: u8,
    evidence_hash: [u8; 32],
) -> Result<()> {
    let outcome = &mut ctx.accounts.outcome;
    let clock = Clock::get()?;

    outcome.market = ctx.accounts.market.key();
    outcome.winning_outcome = outcome_index;
    outcome.verified = false;
    outcome.verifiers = vec![ctx.accounts.oracle_authority.key()];
    outcome.verification_threshold = 2; // Require 2 verifications
    outcome.evidence_hash = evidence_hash;
    outcome.submitted_at = clock.unix_timestamp;
    outcome.verified_at = None;
    outcome.disputed = false;
    outcome.dispute_reason = None;
    outcome.bump = ctx.bumps.outcome;

    msg!("Outcome submitted for market: {}", outcome.market);
    msg!("Winning outcome: {}", outcome_index);

    Ok(())
}
```

## Testing

### tests/market-manager.ts

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MarketManager } from "../target/types/market_manager";
import { assert } from "chai";

describe("market-manager", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MarketManager as Program<MarketManager>;
  
  let market: anchor.web3.Keypair;
  let caseId = "supreme-court-2024-001";

  it("Creates a new market", async () => {
    market = anchor.web3.Keypair.generate();
    
    const outcomes = ["Plaintiff Wins", "Defendant Wins", "Settlement"];
    const settlementTime = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
    const initialLiquidity = new anchor.BN(1_000_000_000); // 1 SOL

    await program.methods
      .createMarket(caseId, outcomes, new anchor.BN(settlementTime), initialLiquidity)
      .accounts({
        market: market.publicKey,
        creator: provider.wallet.publicKey,
      })
      .signers([market])
      .rpc();

    const marketAccount = await program.account.market.fetch(market.publicKey);
    assert.equal(marketAccount.caseId, caseId);
    assert.equal(marketAccount.outcomes.length, 3);
  });

  it("Places a bet", async () => {
    const amount = new anchor.BN(100_000_000); // 0.1 SOL
    const outcomeIndex = 0; // Plaintiff Wins
    const minShares = new anchor.BN(0);

    await program.methods
      .placeBet(outcomeIndex, amount, minShares)
      .accounts({
        market: market.publicKey,
        user: provider.wallet.publicKey,
      })
      .rpc();

    const marketAccount = await program.account.market.fetch(market.publicKey);
    assert.equal(marketAccount.totalBets.toNumber(), 1);
  });
});
```

## Deployment

### Anchor.toml

```toml
[features]
seeds = false
skip-lint = false

[programs.localnet]
market_manager = "MktMgr111111111111111111111111111111111111"
oracle = "OraC1e111111111111111111111111111111111111"

[programs.devnet]
market_manager = "MktMgr111111111111111111111111111111111111"
oracle = "OraC1e111111111111111111111111111111111111"

[programs.mainnet]
market_manager = "MktMgr111111111111111111111111111111111111"
oracle = "OraC1e111111111111111111111111111111111111"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

## Build & Deploy Commands

```bash
# Install dependencies
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

## Security Checklist

- [ ] All arithmetic operations use checked math
- [ ] PDA derivations use proper seeds
- [ ] Account ownership validated
- [ ] Signer validation on all mutations
- [ ] Token transfers use CPI correctly
- [ ] No integer overflow/underflow vulnerabilities
- [ ] Access control implemented
- [ ] Emergency pause mechanism
- [ ] Upgrade authority secured
- [ ] Audit by professional firm before mainnet

This provides production-ready smart contracts for Precedence's core functionality on Solana.
