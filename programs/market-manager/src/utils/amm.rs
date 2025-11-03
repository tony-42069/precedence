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

    // Spot price before = reserve_out / reserve_in (but we're using different reserves)
    // For multi-outcome, price impact is more complex
    // This is a simplified version

    // Calculate the effective price change
    let price_impact = (amount_in_u128 * 1_000_000)
        .checked_div(reserve_in_u128 + amount_in_u128)
        .ok_or(MarketError::ArithmeticOverflow)?;

    Ok(price_impact as u64)
}

/// Convert shares to potential payout
pub fn calculate_potential_payout(
    shares: u64,
    total_outcome_shares: u64,
    total_liquidity: u64,
) -> Result<u64> {
    if total_outcome_shares == 0 {
        return Ok(0);
    }

    let payout = (shares as u128)
        .checked_mul(total_liquidity as u128)
        .ok_or(MarketError::ArithmeticOverflow)?
        .checked_div(total_outcome_shares as u128)
        .ok_or(MarketError::ArithmeticOverflow)?;

    Ok(payout as u64)
}

/// Calculate implied probability from price
pub fn price_to_probability(price: u64) -> Result<u64> {
    // Price is stored as integer representing decimal (e.g., 500_000 = 0.5)
    // Convert to probability percentage
    let prob = price
        .checked_mul(100)
        .ok_or(MarketError::ArithmeticOverflow)?
        .checked_div(1_000_000)
        .ok_or(MarketError::ArithmeticOverflow)?;

    Ok(prob)
}
