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
    pub fn settle_market(
        ctx: Context<SettleMarket>,
        winning_outcome_index: u8
    ) -> Result<()> {
        instructions::settle_market::handler(ctx, winning_outcome_index)
    }

    /// Claim winnings from a settled market
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings::handler(ctx)
    }
}
