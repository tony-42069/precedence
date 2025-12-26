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
// USDC.e (Bridged) - THIS IS WHAT POLYMARKET USES
export const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
// Native USDC - Users might deposit this, we auto-swap to USDC.e
export const USDC_NATIVE_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

// Conditional Token Framework
export const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';

// Exchange Contracts
export const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
export const NEG_RISK_CTF_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
export const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';

// Uniswap V3 SwapRouter on Polygon (for auto-swap native USDC -> USDC.e)
export const UNISWAP_SWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
export const USDC_SWAP_FEE = 100; // 0.01% fee tier for stablecoin pairs

// All contracts that need USDC.e approval
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
  EOA: 0,
  MAGIC: 1,
  BROWSER: 2,
} as const;

// Local Storage Keys - IMPORTANT for caching to reduce signatures
export const STORAGE_KEYS = {
  TRADING_SESSION: 'precedence_trading_session',
  USER_CREDENTIALS: 'precedence_user_credentials',
  SAFE_ADDRESS: 'precedence_safe_address',
  APPROVALS_DONE: 'precedence_approvals_done', // Track if approvals already set
  SAFE_DEPLOYED: 'precedence_safe_deployed',   // Track if safe already deployed
} as const;

// Builder Signing Endpoint
export const BUILDER_SIGN_PATH = '/api/polymarket/sign';

export const getBuilderSignUrl = (): string => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}${BUILDER_SIGN_PATH}`
      : `http://localhost:3000${BUILDER_SIGN_PATH}`;
  }
  
  const isProduction = window.location.pathname.startsWith('/app');
  const basePath = isProduction ? '/app' : '';
  
  return `${window.location.origin}${basePath}${BUILDER_SIGN_PATH}`;
};
