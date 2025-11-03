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
            .ok_or(crate::errors::MarketError::ArithmeticOverflow))?
            .checked_div(total_reserves)
            .ok_or(crate::errors::MarketError::ArithmeticOverflow)?;

        Ok(price as u64)
    }
}
