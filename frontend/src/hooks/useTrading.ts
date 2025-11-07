import { useState } from 'react';

interface TradeParams {
  marketId: string;
  tokenId: string;
  side: 'YES' | 'NO';
  amount: number;
  price: number;
}

interface TradeResult {
  success: boolean;
  orderId?: string;
  transactionHash?: string;
  error?: string;
}

export const useTrading = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeTrade = async (
    params: TradeParams,
    walletAddress: string
  ): Promise<TradeResult> => {
    setLoading(true);
    setError(null);

    try {
      // Call YOUR backend API (not Polymarket directly)
      const response = await fetch('http://localhost:8000/api/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          market_id: params.marketId,
          token_id: params.tokenId,
          side: params.side,
          amount: params.amount,
          price: params.price,
          wallet_address: walletAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Trade failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    placeTrade,
    loading,
    error,
  };
};
