/**
 * usePolymarketOrder Hook
 * 
 * Handles order placement on Polymarket using the authenticated ClobClient.
 * Uses createAndPostOrder which handles signing and posting in one call.
 * 
 * Based on: https://github.com/ayv8er/polymarket-safe-trader
 */

'use client';

import { useState, useCallback } from 'react';
import { ClobClient, Side, OrderType } from '@polymarket/clob-client';

// Order types
export interface OrderParams {
  tokenId: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  negRisk?: boolean;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export type OrderState = 'idle' | 'creating' | 'submitting' | 'success' | 'error';

export const usePolymarketOrder = (getClobClient: () => ClobClient | null) => {
  const [state, setState] = useState<OrderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  /**
   * Place a limit order using ClobClient's createAndPostOrder
   * This handles signing AND posting in one call
   */
  const placeOrder = useCallback(async (params: OrderParams): Promise<OrderResult> => {
    const client = getClobClient();
    
    if (!client) {
      const errorMsg = 'Trading session not initialized';
      setError(errorMsg);
      setState('error');
      return { success: false, error: errorMsg };
    }

    setState('creating');
    setError(null);
    setLastOrderId(null);

    try {
      console.log('📝 Creating and posting order:', params);

      // Use createAndPostOrder which handles signing AND posting
      // This is the correct method per polymarket-safe-trader example
      const response = await client.createAndPostOrder(
        {
          tokenID: params.tokenId,
          price: params.price,
          size: params.size,
          side: params.side === 'BUY' ? Side.BUY : Side.SELL,
          feeRateBps: 0,
          expiration: 0,
        },
        { negRisk: params.negRisk ?? false },
        OrderType.GTC
      );
      
      console.log('✅ Order response:', response);

      const orderId = response?.orderID || response?.id;
      
      if (orderId) {
        console.log('🎉 Order placed successfully:', orderId);
        setLastOrderId(orderId);
        setState('success');
        return { success: true, orderId };
      } else {
        // Check if response indicates an error
        if (response?.error) {
          throw new Error(response.error);
        }
        // Order might have been placed but no ID returned
        console.log('⚠️ Order submitted but no ID returned:', response);
        setState('success');
        return { success: true };
      }

    } catch (err: any) {
      console.error('❌ Order failed:', err);
      
      // Extract error message
      let errorMsg = 'Failed to place order';
      if (err.message) {
        errorMsg = err.message;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      
      // Check for geo-block indicators
      if (errorMsg.includes('403') || errorMsg.includes('Forbidden') || errorMsg.includes('Cloudflare')) {
        errorMsg = 'Order blocked (403). This may be due to geographical restrictions. Try using a VPN to a non-restricted country.';
      }
      
      setError(errorMsg);
      setState('error');

      return { success: false, error: errorMsg };
    }
  }, [getClobClient]);

  /**
   * Cancel an order
   */
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    const client = getClobClient();
    
    if (!client) {
      setError('Trading session not initialized');
      return false;
    }

    try {
      await client.cancelOrder({ orderID: orderId });
      console.log('✅ Order cancelled:', orderId);
      return true;
    } catch (err: any) {
      console.error('❌ Cancel failed:', err);
      setError(err.message || 'Failed to cancel order');
      return false;
    }
  }, [getClobClient]);

  /**
   * Cancel all orders
   */
  const cancelAllOrders = useCallback(async (): Promise<boolean> => {
    const client = getClobClient();
    
    if (!client) {
      setError('Trading session not initialized');
      return false;
    }

    try {
      await client.cancelAll();
      console.log('✅ All orders cancelled');
      return true;
    } catch (err: any) {
      console.error('❌ Cancel all failed:', err);
      setError(err.message || 'Failed to cancel orders');
      return false;
    }
  }, [getClobClient]);

  /**
   * Get open orders
   */
  const getOpenOrders = useCallback(async () => {
    const client = getClobClient();
    
    if (!client) {
      return [];
    }

    try {
      const response = await client.getOpenOrders();
      return response || [];
    } catch (err: any) {
      console.error('❌ Failed to get orders:', err);
      return [];
    }
  }, [getClobClient]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setLastOrderId(null);
  }, []);

  // Computed values for UI
  const isLoading = state === 'creating' || state === 'submitting';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  // Status message for UI
  const getStatusMessage = () => {
    switch (state) {
      case 'creating': return '📝 Creating order...';
      case 'submitting': return '📤 Submitting to market...';
      case 'success': return '✅ Order placed!';
      case 'error': return `❌ ${error}`;
      default: return '';
    }
  };

  return {
    // State
    state,
    error,
    lastOrderId,
    isLoading,
    isSuccess,
    isError,
    statusMessage: getStatusMessage(),

    // Actions
    placeOrder,
    cancelOrder,
    cancelAllOrders,
    getOpenOrders,
    reset,
  };
};
