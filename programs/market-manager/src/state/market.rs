use anchor_lang::prelude::*;
use crate::constants::MAX_OUTCOMES;


#[account]
pub struct Market {
    /// Unique identifier for the case (fixed size)
    pub case_id: [u8; 64],                 // Fixed 64 chars

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
    // Note: Using 8 + 2000 for initial testing - will calculate proper size later
    pub const LEN: usize = 8 + 2000; // discriminator + data (will optimize later)

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
    pub name: [u8; 64],             // Fixed 64 chars

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
