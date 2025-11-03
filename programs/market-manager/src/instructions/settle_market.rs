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

pub fn handler(ctx: Context<SettleMarket>, winning_outcome_index: u8) -> Result<()> {
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

    // Validate winning outcome index
    require!(
        (winning_outcome_index as usize) < market.outcomes.len(),
        MarketError::InvalidOutcomeIndex
    );

    // Set the winning outcome and update market status
    market.winning_outcome = Some(winning_outcome_index);
    market.status = MarketStatus::Settled;
    market.settled_at = Some(clock.unix_timestamp);

    msg!("Market {} settled with winning outcome: {}", market.case_id, winning_outcome_index);
    msg!("Winning outcome: {}", market.outcomes[winning_outcome_index as usize].name);
    msg!("Settlement time: {}", market.settled_at.unwrap());

    Ok(())
}
