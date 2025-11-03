use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use crate::{constants::*, errors::*, state::*};

#[derive(Accounts)]
#[instruction(case_id: String)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = creator,
        space = Market::LEN
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = creator,
        space = LiquidityPool::LEN
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
        token::mint = native_mint,
        token::authority = creator
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

    // Initialize market - convert string to fixed-size byte array
    let case_id_bytes = case_id.as_bytes();
    require!(case_id_bytes.len() <= 64, MarketError::CaseIdTooLong);
    market.case_id = {
        let mut arr = [0u8; 64];
        arr[..case_id_bytes.len()].copy_from_slice(case_id_bytes);
        arr
    };

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
            let name_bytes = name.as_bytes();
            let mut name_arr = [0u8; 64];
            name_arr[..name_bytes.len()].copy_from_slice(name_bytes);

            Ok(Outcome {
                name: name_arr,
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

    msg!("Market created: {}", market.case_id);
    msg!("Settlement time: {}", market.settlement_time);
    msg!("Outcomes: {}", market.outcomes.len());

    Ok(())
}
