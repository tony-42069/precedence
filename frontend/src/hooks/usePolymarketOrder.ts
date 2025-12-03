/**
 * usePolymarketOrder Hook
 * 
 * Handles order placement on Polymarket using the authenticated ClobClient.
 * Orders are signed client-side but submitted through our server-side proxy
 * to avoid CORS issues with clob.polymarket.com.
 */

'use client';

import { useState, useCallback } from 'react';
import { ClobClient, Side, OrderType } from '@polymarket/clob-client';
import { getBuilderSignUrl } from '../constants/polymarket';

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

// Get the order proxy URL
const getOrderProxyUrl = (): string => {
  if (typeof window === 'undefined') {
    return '/api/polymarket/order';
  }
  const isProduction = window.location.pathname.startsWith('/app');
  const basePath = isProduction ? '/app' : '';
  return `${window.location.origin}${basePath}/api/polymarket/order`;
};

export const usePolymarketOrder = (getClobClient: () => ClobClient | null) => {
  const [state, setState] = useState<OrderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  /**
   * Place a limit order
   * Creates order client-side, submits through server proxy
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
      console.log('📝 Creating order:', params);

      // Create the signed order using ClobClient
      const orderArgs = {
        tokenID: params.tokenId,
        price: params.price,
        size: params.size,
        side: params.side === 'BUY' ? Side.BUY : Side.SELL,
        feeRateBps: 0,
        expiration: 0,
        taker: '0x0000000000000000000000000000000000000000',
      };

      // Create the order (this signs it client-side)
      const signedOrder = await client.createOrder(orderArgs, { negRisk: params.negRisk ?? false });
      
      console.log('✅ Order signed:', signedOrder);

      setState('submitting');

      // Get the funder (Safe address) from the client
      // @ts-ignore - accessing internal property
      const owner = client.funder || client.proxyWalletAddress;

      // Submit through our server-side proxy to avoid CORS
      const proxyUrl = getOrderProxyUrl();
      console.log('📤 Submitting order via proxy:', proxyUrl);

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: signedOrder,
          owner: owner,
          orderType: 'GTC',
        }),
      });

      const result = await response.json();
      console.log('📥 Proxy response:', result);

      if (!response.ok || result.error) {
        throw new Error(result.error || `Order failed: ${response.status}`);
      }

      const orderId = result.orderID || result.id || result.orderID;
      
      console.log('✅ Order placed:', orderId);
      
      setLastOrderId(orderId);
      setState('success');

      return {
        success: true,
        orderId,
      };

    } catch (err: any) {
      console.error('❌ Order failed:', err);
      
      const errorMsg = err.message || 'Failed to place order';
      setError(errorMsg);
      setState('error');

      return {
        success: false,
        error: errorMsg,
      };
    }
  }, [getClobClient]);

  /**
   * Place a market order (fills at best available price)
   */
  const placeMarketOrder = useCallback(async (
    tokenId: string,
    amount: number,
    side: 'BUY' | 'SELL',
    negRisk?: boolean
  ): Promise<OrderResult> => {
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
      console.log('📝 Creating market order:', { tokenId, amount, side });

      setState('submitting');

      // Create market order
      const marketOrderArgs = {
        tokenID: tokenId,
        amount,
        side: side === 'BUY' ? Side.BUY : Side.SELL,
      };

      // Create and sign the market order
      const signedOrder = await client.createMarketOrder(marketOrderArgs, { negRisk: negRisk ?? false });
      
      console.log('✅ Market order signed:', signedOrder);

      // Get the funder (Safe address)
      // @ts-ignore
      const owner = client.funder || client.proxyWalletAddress;

      // Submit through proxy
      const proxyUrl = getOrderProxyUrl();
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: signedOrder,
          owner: owner,
          orderType: 'FOK',
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || `Market order failed: ${response.status}`);
      }

      const orderId = result.orderID || result.id;
      
      console.log('✅ Market order placed:', orderId);
      
      setLastOrderId(orderId);
      setState('success');

      return {
        success: true,
        orderId,
      };

    } catch (err: any) {
      console.error('❌ Market order failed:', err);
      
      const errorMsg = err.message || 'Failed to place market order';
      setError(errorMsg);
      setState('error');

      return {
        success: false,
        error: errorMsg,
      };
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
    placeMarketOrder,
    cancelOrder,
    cancelAllOrders,
    getOpenOrders,
    reset,
  };
};
