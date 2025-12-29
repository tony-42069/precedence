/**
 * User API Service for Precedence
 * Handles user registration, profile management, and persistence
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
export interface UserProfile {
  wallet_address: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  total_volume: number;
  total_trades: number;
  markets_traded: number;
  total_profit_loss: number;
  win_rate: number | null;
  reputation_score: number;
  badges: Badge[];
  public_profile: boolean;
  created_at: string | null;
  last_active: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description?: string;
  earned_at?: string;
}

export interface Position {
  id: number;
  market_id: string;
  outcome: 'YES' | 'NO';
  total_shares: number;
  total_cost: number;
  avg_entry_price: number | null;
  trade_count: number;
  current_price: number | null;
  current_value: number | null;
  unrealized_pnl: number | null;
  realized_pnl: number;
  last_trade_at: string | null;
}

export interface Trade {
  id: number;
  market_id: string;
  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  size: number;
  price: number;
  total_cost: number;
  fee: number;
  order_id: string | null;
  status: string;
  created_at: string | null;
  executed_at: string | null;
}

export interface UserStats {
  wallet_address: string;
  total_volume: number;
  total_trades: number;
  markets_traded: number;
  total_profit_loss: number;
  win_rate: number | null;
  reputation_score: number;
  active_positions: number;
  total_unrealized_pnl: number;
  total_position_value: number;
  badges_count: number;
  member_since: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_volume: number;
  total_profit_loss: number;
  win_rate: number | null;
  reputation_score: number;
}

export interface ProfileUpdateData {
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  notification_settings?: Record<string, any>;
  display_settings?: Record<string, any>;
  public_profile?: boolean;
}

class UserService {
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
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `API Error ${response.status}`);
    }

    return response.json();
  }

  /**
   * Register a new user or return existing profile
   * Called when wallet connects
   */
  async registerUser(walletAddress: string, username?: string): Promise<UserProfile> {
    return this.request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({
        wallet_address: walletAddress,
        username: username || undefined,
      }),
    });
  }

  /**
   * Get user profile by wallet address
   */
  async getProfile(walletAddress: string): Promise<UserProfile> {
    return this.request(`/api/users/${walletAddress}`);
  }

  /**
   * Update user profile
   */
  async updateProfile(walletAddress: string, data: ProfileUpdateData): Promise<UserProfile> {
    return this.request(`/api/users/${walletAddress}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get user's positions
   */
  async getPositions(walletAddress: string, activeOnly: boolean = true): Promise<Position[]> {
    const params = new URLSearchParams({ active_only: String(activeOnly) });
    return this.request(`/api/users/${walletAddress}/positions?${params}`);
  }

  /**
   * Get user's trade history
   */
  async getTrades(walletAddress: string, limit: number = 50, offset: number = 0): Promise<Trade[]> {
    const params = new URLSearchParams({ 
      limit: String(limit), 
      offset: String(offset) 
    });
    return this.request(`/api/users/${walletAddress}/trades?${params}`);
  }

  /**
   * Get user's detailed stats
   */
  async getStats(walletAddress: string): Promise<UserStats> {
    return this.request(`/api/users/${walletAddress}/stats`);
  }

  /**
   * Get volume leaderboard
   */
  async getVolumeLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    return this.request(`/api/users/leaderboard/volume?${params}`);
  }

  /**
   * Get profit leaderboard
   */
  async getProfitLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    return this.request(`/api/users/leaderboard/profit?${params}`);
  }

  /**
   * Record a trade after successful order placement
   * This updates user stats in our backend
   */
  async recordTrade(
    walletAddress: string, 
    trade: {
      market_id: string;
      side: 'BUY' | 'SELL';
      outcome: 'YES' | 'NO';
      size: number;
      price: number;
      order_id?: string;
      token_id?: string;
      market_question?: string;
    }
  ): Promise<Trade> {
    return this.request(`/api/users/${walletAddress}/trades`, {
      method: 'POST',
      body: JSON.stringify(trade),
    });
  }
}

// Global instance
export const userService = new UserService();

export default userService;
