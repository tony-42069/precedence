/**
 * Polymarket Constants
 * Contract addresses and configuration for Polygon mainnet
 */

// Chain Configuration
export const POLYGON_CHAIN_ID = 137;
export const POLYGON_RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com';

// Polymarket API URLs
export const CLOB_API_URL = 'https://clob.polymarket.com';
export const RELAYER_URL = 'https://relayer-v2.polymarket.com/';
export const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

// Token Addresses (Polygon)
export const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC.e on Polygon
export const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'; // Conditional Token Framework

// Exchange Contracts
export const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
export const NEG_RISK_CTF_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
export const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';

// All contracts that need USDC approval
export const USDC_SPENDERS = [
  CTF_ADDRESS,
  CTF_EXCHANGE,
  NEG_RISK_CTF_EXCHANGE,
  NEG_RISK_ADAPTER,
];

// All contracts that need ERC-1155 (outcome token) approval
export const CTF_OPERATORS = [
  CTF_EXCHANGE,
  NEG_RISK_CTF_EXCHANGE,
  NEG_RISK_ADAPTER,
];

// Signature Types for ClobClient
export const SIGNATURE_TYPES = {
  EOA: 0,           // Direct EOA (MetaMask with private key)
  MAGIC: 1,         // Email/Magic wallet
  BROWSER: 2,       // Browser wallet proxy (MetaMask, Privy embedded, etc.)
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  TRADING_SESSION: 'precedence_trading_session',
  USER_CREDENTIALS: 'precedence_user_credentials',
  SAFE_ADDRESS: 'precedence_safe_address',
} as const;

// Builder Signing Endpoint - relative path (will be converted to full URL in hooks)
export const BUILDER_SIGN_PATH = '/api/polymarket/sign';

/**
 * Get the full Builder Sign URL based on current environment
 * Must be called client-side where window is available
 */
export const getBuilderSignUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}${BUILDER_SIGN_PATH}`
      : `http://localhost:3000${BUILDER_SIGN_PATH}`;
  }
  // Client-side - use current origin
  return `${window.location.origin}${BUILDER_SIGN_PATH}`;
};
