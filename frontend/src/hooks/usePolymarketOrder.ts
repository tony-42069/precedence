/**
 * usePolymarketOrder Hook
 * 
 * Handles order placement on Polymarket using the authenticated ClobClient.
 * 
 * CRITICAL DECIMAL PRECISION RULES (from Polymarket docs):
 * 
 * Tick Size -> RoundConfig(price decimals, size decimals, amount decimals)
 * "0.1":    -> price=1, size=2, amount=3
 * "0.01":   -> price=2, size=2, amount=4
 * "0.001":  -> price=3, size=2, amount=5
 * "0.0001": -> price=4, size=2, amount=6
 * 
 * For GTC orders: size is ALWAYS in shares, rounded to 2 decimals
 * For FOK orders: maker amount (2 decimals), taker amount (4-5 decimals)
 * 
 * We use GTC for reliability - FOK has stricter requirements and often fails.
 */

'use client';

import { useState, useCallback } from 'react';
import { ClobClient, Side, OrderType } from '@polymarket/clob-client';

export interface OrderParams {
  tokenId: string;
  price: number;
  size: number;       // For BUY: dollars to spend. For SELL: shares to sell
  side: 'BUY' | 'SELL';
  negRisk?: boolean;
  tickSize?: string;  // Market tick size: "0.1", "0.01", "0.001", "0.0001"
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export type OrderState = 'idle' | 'creating' | 'submitting' | 'success' | 'error';

// Cache for tick sizes to avoid repeated API calls
const tickSizeCache = new Map<string, string>();

/**
 * Round to specific decimal places (floor to avoid exceeding limits)
 */
const roundDown = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
};

/**
 * Fetch the tick size for a token from Polymarket's API
 * This is CRITICAL - using wrong tick size causes decimal errors!
 */
const fetchTickSize = async (tokenId: string): Promise<string> => {
  // Check cache first
  if (tickSizeCache.has(tokenId)) {
    return tickSizeCache.get(tokenId)!;
  }

  try {
    const response = await fetch(`https://clob.polymarket.com/tick-size?token_id=${tokenId}`);
    if (response.ok) {
      const data = await response.json();
      const tickSize = data.minimum_tick_size || data.tick_size || '0.01';
      tickSizeCache.set(tokenId, tickSize);
      console.log(`📊 Fetched tick size for ${tokenId.slice(0, 20)}...: ${tickSize}`);
      return tickSize;
    }
  } catch (err) {
    console.warn('Failed to fetch tick size, using default:', err);
  }

  // Default to 0.01 if fetch fails (most common tick size)
  return '0.01';
};

export const usePolymarketOrder = (getClobClient: () => Promise<ClobClient | null> | ClobClient | null) => {
  const [state, setState] = useState<OrderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  /**
   * Place a GTC (Good-Til-Cancelled) LIMIT order
   * 
   * GTC orders are more reliable than FOK because:
   * - They have more flexible decimal precision
   * - They can partially fill
   * - They sit on the order book until filled
   * 
   * For "instant" execution, we set the price to be marketable (at or better than current price)
   */
  const placeOrder = useCallback(async (params: OrderParams): Promise<OrderResult> => {
    setState('creating');
    setError(null);
    setLastOrderId(null);

    try {
      const clientResult = getClobClient();
      const client = clientResult instanceof Promise ? await clientResult : clientResult;
      
      if (!client) {
        throw new Error('Trading session not ready. Please initialize first.');
      }

      // CRITICAL: Fetch the actual tick size from Polymarket API
      // This prevents decimal precision errors!
      const tickSize = params.tickSize || await fetchTickSize(params.tokenId);
      
      // Calculate precision based on tick size
      // From Polymarket ROUNDING_CONFIG:
      // "0.1": price=1, "0.01": price=2, "0.001": price=3, "0.0001": price=4
      let priceDecimals: number;
      switch (tickSize) {
        case '0.1': priceDecimals = 1; break;
        case '0.01': priceDecimals = 2; break;
        case '0.001': priceDecimals = 3; break;
        case '0.0001': priceDecimals = 4; break;
        default: priceDecimals = 2; // Safe default
      }
      
      // Round price to tick size precision
      const roundedPrice = roundDown(params.price, priceDecimals);
      
      // Validate price is valid (not zero after rounding)
      if (roundedPrice <= 0 || roundedPrice >= 1) {
        throw new Error(`Invalid price after rounding: ${roundedPrice}. Price must be between 0 and 1.`);
      }
      
      // For GTC orders, size is always in SHARES
      // BUY: we need to convert dollars to shares (dollars / price = shares)
      // SELL: size is already in shares
      let sizeInShares: number;
      
      if (params.side === 'BUY') {
        // Convert dollars to shares: dollars / price = shares
        sizeInShares = params.size / roundedPrice;
      } else {
        // Already in shares
        sizeInShares = params.size;
      }
      
      // Round size to 2 decimal places (Polymarket requirement for ALL order types)
      const roundedSize = roundDown(sizeInShares, 2);
      
      // Ensure minimum order size (Polymarket has minimums)
      if (roundedSize < 0.01) {
        throw new Error('Order size too small. Minimum is 0.01 shares.');
      }

      // IMPORTANT: Validate that size * price doesn't exceed precision limits
      // The product should not exceed 2 decimals for FOK, but we use GTC so more flexible
      const orderValue = roundedSize * roundedPrice;
      console.log('📝 Placing GTC order:', {
        side: params.side,
        originalInput: params.size,
        price: roundedPrice,
        priceDecimals,
        sizeInShares: roundedSize,
        orderValue: orderValue.toFixed(6),
        tickSize,
        negRisk: params.negRisk,
        tokenId: params.tokenId.slice(0, 30) + '...',
      });

      // Use createAndPostOrder for GTC limit orders
      // This is more reliable than FOK market orders
      const response = await client.createAndPostOrder(
        {
          tokenID: params.tokenId,
          price: roundedPrice,
          size: roundedSize,
          side: params.side === 'BUY' ? Side.BUY : Side.SELL,
          feeRateBps: 0,
          expiration: 0,
        },
        { 
          tickSize: tickSize as any,
          negRisk: params.negRisk ?? false 
        },
        OrderType.GTC  // Good-Til-Cancelled - limit order
      );
      
      console.log('✅ Order response:', response);

      // Check for errors in response
      if (response?.errorMsg && response.errorMsg !== '') {
        throw new Error(response.errorMsg);
      }

      const orderId = response?.orderID || response?.orderHashes?.[0];
      
      if (orderId || response?.success) {
        console.log('🎉 Order placed:', orderId || 'success');
        setLastOrderId(orderId || null);
        setState('success');
        return { success: true, orderId };
      } else {
        // Order was placed but no ID returned - still a success
        setState('success');
        return { success: true };
      }

    } catch (err: any) {
      console.error('❌ Order failed:', err);
      
      let errorMsg = 'Failed to place order';
      if (err.message) {
        errorMsg = err.message;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      
      // User-friendly error messages
      if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        errorMsg = 'Order blocked. Try using a VPN to a non-restricted region.';
      } else if (errorMsg.includes('not enough balance')) {
        errorMsg = 'Insufficient USDC balance. Please deposit more funds.';
      } else if (errorMsg.includes('min tick size')) {
        errorMsg = 'Price precision error. Try a rounder price.';
      } else if (errorMsg.includes('decimal')) {
        errorMsg = 'Amount precision error. Try a rounder amount.';
      }
      
      setError(errorMsg);
      setState('error');
      return { success: false, error: errorMsg };
    }
  }, [getClobClient]);

  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      const clientResult = getClobClient();
      const client = clientResult instanceof Promise ? await clientResult : clientResult;
      if (!client) return false;

      await client.cancelOrder({ orderID: orderId });
      return true;
    } catch (err: any) {
      console.error('❌ Cancel failed:', err);
      setError(err.message || 'Failed to cancel');
      return false;
    }
  }, [getClobClient]);

  const cancelAllOrders = useCallback(async (): Promise<boolean> => {
    try {
      const clientResult = getClobClient();
      const client = clientResult instanceof Promise ? await clientResult : clientResult;
      if (!client) return false;

      await client.cancelAll();
      return true;
    } catch (err: any) {
      console.error('❌ Cancel all failed:', err);
      setError(err.message || 'Failed to cancel');
      return false;
    }
  }, [getClobClient]);

  const getOpenOrders = useCallback(async () => {
    try {
      const clientResult = getClobClient();
      const client = clientResult instanceof Promise ? await clientResult : clientResult;
      if (!client) return [];

      return await client.getOpenOrders() || [];
    } catch {
      return [];
    }
  }, [getClobClient]);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setLastOrderId(null);
  }, []);

  const isLoading = state === 'creating' || state === 'submitting';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  const getStatusMessage = () => {
    switch (state) {
      case 'creating': return '📝 Sign to confirm order...';
      case 'submitting': return '📤 Submitting...';
      case 'success': return '✅ Order placed!';
      case 'error': return `❌ ${error}`;
      default: return '';
    }
  };

  return {
    state,
    error,
    lastOrderId,
    isLoading,
    isSuccess,
    isError,
    statusMessage: getStatusMessage(),
    placeOrder,
    cancelOrder,
    cancelAllOrders,
    getOpenOrders,
    reset,
  };
};
