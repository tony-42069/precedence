/**
 * usePolymarketOrder Hook
 * 
 * Handles order placement on Polymarket using the authenticated ClobClient.
 * Uses createAndPostOrder which handles signing and posting in one call.
 */

'use client';

import { useState, useCallback } from 'react';
import { ClobClient, Side, OrderType } from '@polymarket/clob-client';

export interface OrderParams {
  tokenId: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  negRisk?: boolean;
}

/**
 * Rounds a number to specified decimal places
 * Polymarket requires: maker amount max 2 decimals, taker amount max 5 decimals
 */
const roundToDecimals = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
};

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export type OrderState = 'idle' | 'creating' | 'submitting' | 'success' | 'error';

export const usePolymarketOrder = (getClobClient: () => Promise<ClobClient | null> | ClobClient | null) => {
  const [state, setState] = useState<OrderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  /**
   * Place a MARKET order (FOK - Fill Or Kill)
   * THIS IS THE ONLY PLACE THAT REQUIRES A SIGNATURE (the order itself)
   *
   * IMPORTANT: We use FOK (market orders), NOT GTC (limit orders)!
   * - FOK: BUY in DOLLARS, SELL in SHARES - lower minimums, instant execution
   * - GTC: Everything in SHARES - stricter minimums, sits on order book
   */
  const placeOrder = useCallback(async (params: OrderParams): Promise<OrderResult> => {
    setState('creating');
    setError(null);
    setLastOrderId(null);

    try {
      // Get client (may be async)
      const clientResult = getClobClient();
      const client = clientResult instanceof Promise ? await clientResult : clientResult;
      
      if (!client) {
        throw new Error('Trading session not ready. Please initialize first.');
      }

      // Round price to 3 decimals (standard for Polymarket prices)
      // Round size to 2 decimals (to ensure maker amount stays within 2 decimal limit)
      const roundedPrice = roundToDecimals(params.price, 3);
      const roundedSize = roundToDecimals(params.size, 2);
      
      console.log('📝 Placing order:', {
        ...params,
        roundedPrice,
        roundedSize,
        originalPrice: params.price,
        originalSize: params.size,
      });

      // This is the ONE signature the user needs to provide
      // Use FOK (Fill Or Kill) market orders for instant execution
      const response = await client.createAndPostOrder(
        {
          tokenID: params.tokenId,
          price: roundedPrice,
          size: roundedSize,
          side: params.side === 'BUY' ? Side.BUY : Side.SELL,
          feeRateBps: 0,
          expiration: 0,
        },
        { negRisk: params.negRisk ?? false },
        'FOK' as any  // MARKET ORDER - TypeScript types are incomplete, but API accepts FOK
      );
      
      console.log('✅ Order response:', response);

      const orderId = response?.orderID || response?.id;
      
      if (orderId) {
        console.log('🎉 Order placed:', orderId);
        setLastOrderId(orderId);
        setState('success');
        return { success: true, orderId };
      } else {
        if (response?.error) {
          throw new Error(response.error);
        }
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
      
      if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        errorMsg = 'Order blocked. Try using a VPN to a non-restricted region.';
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
