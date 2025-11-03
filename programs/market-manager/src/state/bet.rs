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
