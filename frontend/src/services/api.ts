/**
 * API Service Layer for Precedence Trading
 * Clean wrapper around backend calls to Python FastAPI (Port 8000)
 */

const API_BASE_URL = 'http://localhost:8000';

// Types
export interface TradePayload {
  market_id: string;
  token_id: string;
  side: 'YES' | 'NO';
  amount: number;
  price: number;
  wallet_address: string;
}

export interface TradeResult {
  success: boolean;
  order_id?: string;
  transaction_hash?: string;
  error?: string;
}

export interface SafeWalletStatus {
  has_safe: boolean;
  safe_address?: string;
  usdc_approved?: boolean;
}

export interface MarketPrice {
  market_id: string;
  current_yes_price: number;
  current_no_price: number;
  best_bid?: number;
  best_ask?: number;
  spread?: number;
}

export interface DeploySafeRequest {
  user_wallet_address: string;
}

export interface DeploySafeResponse {
  success: boolean;
  safe_address?: string;
  transaction_hash?: string;
  error?: string;
}

export interface ApproveUSDCRequest {
  safe_address: string;
}

export interface ApproveUSDCResponse {
  success: boolean;
  transaction_hash?: string;
  error?: string;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json();
  }

  // Market Data APIs
  async fetchMarketPrice(marketId: string): Promise<MarketPrice> {
    return this.request(`/markets/${marketId}`);
  }

  async fetchOrderBook(marketId: string): Promise<any> {
    return this.request(`/markets/${marketId}/orderbook`);
  }

  // Trading APIs
  async executeTrade(payload: TradePayload): Promise<TradeResult> {
    return this.request('/trade', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Safe Wallet APIs (via trading service - Port 5002 through Python backend)
  async checkSafeStatus(walletAddress: string): Promise<SafeWalletStatus> {
    return this.request(`/wallets/safe/${walletAddress}`);
  }

  async deploySafeWallet(request: DeploySafeRequest): Promise<DeploySafeResponse> {
    return this.request('/wallets/deploy-safe', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async approveUSDC(request: ApproveUSDCRequest): Promise<ApproveUSDCResponse> {
    return this.request('/wallets/approve-usdc', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Market Resolution (link cases to markets)
  async resolveMarketForCase(caseQuery: string): Promise<any> {
    return this.request(`/markets/resolve?case_query=${encodeURIComponent(caseQuery)}`);
  }
}

// Global instance
export const apiService = new ApiService();

// Convenience exports
export default apiService;
