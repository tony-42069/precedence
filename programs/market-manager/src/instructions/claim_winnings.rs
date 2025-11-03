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
