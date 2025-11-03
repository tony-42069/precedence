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
