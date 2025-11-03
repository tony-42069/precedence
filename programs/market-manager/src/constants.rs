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
