use anchor_lang::prelude::*;

#[error_code]
pub enum MarketError {
    #[msg("Market is not active")]
    MarketNotActive,

    #[msg("Market already settled")]
    MarketAlreadySettled,

    #[msg("Settlement time not reached")]
    SettlementTimeNotReached,

    #[msg("Invalid outcome index")]
    InvalidOutcomeIndex,

    #[msg("Bet amount too small")]
    BetAmountTooSmall,

    #[msg("Bet amount too large")]
    BetAmountTooLarge,

    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Too many outcomes")]
    TooManyOutcomes,

    #[msg("Market not settled yet")]
    MarketNotSettled,

    #[msg("Already claimed winnings")]
    AlreadyClaimed,

    #[msg("Not a winning bet")]
    NotWinningBet,

    #[msg("Oracle not authorized")]
    OracleNotAuthorized,

    #[msg("Invalid liquidity amounts")]
    InvalidLiquidityAmounts,

    #[msg("Insufficient LP tokens")]
    InsufficientLPTokens,

    #[msg("Case ID too long")]
    CaseIdTooLong,

    #[msg("Outcome name too long")]
    OutcomeNameTooLong,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow,
}
