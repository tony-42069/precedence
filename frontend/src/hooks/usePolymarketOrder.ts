/**
 * usePolymarketOrder Hook
 * 
 * Handles order placement on Polymarket using the authenticated ClobClient.
 * 
 * IMPORTANT: Some markets have MINIMUM ORDER SIZES (e.g., 5 shares minimum)
 * The API returns errors in different formats - we must handle all of them.
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
  tickSize?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  transactionHashes?: string[];
  status?: string;
  error?: string;
}

export type OrderState = 'idle' | 'creating' | 'submitting' | 'success' | 'error';

// Cache for tick sizes
const tickSizeCache = new Map<string, string>();

const roundDown = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
};

const fetchTickSize = async (tokenId: string): Promise<string> => {
  if (tickSizeCache.has(tokenId)) {
    return tickSizeCache.get(tokenId)!;
  }

  try {
    const response = await fetch(`https://clob.polymarket.com/tick-size?token_id=${tokenId}`);
    if (response.ok) {
      const data = await response.json();
      const tickSize = data.minimum_tick_size || data.tick_size || '0.01';
      tickSizeCache.set(tokenId, tickSize);
      console.log(`📊 Tick size for token: ${tickSize}`);
      return tickSize;
    }
  } catch (err) {
    console.warn('Failed to fetch tick size:', err);
  }
  return '0.01';
};

export const usePolymarketOrder = (getClobClient: () => Promise<ClobClient | null> | ClobClient | null) => {
  const [state, setState] = useState<OrderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const placeOrder = useCallback(async (params: OrderParams): Promise<OrderResult> => {
    setState('creating');
    setError(null);
    setLastOrderId(null);

    try {
      console.log('🚀 === ORDER PLACEMENT START ===');
      console.log('📋 Order params:', {
        tokenId: params.tokenId.slice(0, 30) + '...',
        price: params.price,
        size: params.size,
        side: params.side,
        negRisk: params.negRisk,
      });

      const clientResult = getClobClient();
      const client = clientResult instanceof Promise ? await clientResult : clientResult;
      
      if (!client) {
        throw new Error('Trading session not ready. Please initialize first.');
      }

      console.log('✅ ClobClient obtained');

      // Fetch tick size
      const tickSize = params.tickSize || await fetchTickSize(params.tokenId);
      
      // Calculate precision
      let priceDecimals: number;
      switch (tickSize) {
        case '0.1': priceDecimals = 1; break;
        case '0.01': priceDecimals = 2; break;
        case '0.001': priceDecimals = 3; break;
        case '0.0001': priceDecimals = 4; break;
        default: priceDecimals = 2;
      }
      
      const roundedPrice = roundDown(params.price, priceDecimals);
      
      if (roundedPrice <= 0 || roundedPrice >= 1) {
        throw new Error(`Invalid price: ${roundedPrice}. Must be between 0 and 1.`);
      }
      
      // Convert to shares
      let sizeInShares: number;
      if (params.side === 'BUY') {
        sizeInShares = params.size / roundedPrice;
      } else {
        sizeInShares = params.size;
      }
      
      const roundedSize = roundDown(sizeInShares, 2);
      
      if (roundedSize < 0.01) {
        throw new Error('Order size too small. Minimum is 0.01 shares.');
      }

      console.log('📝 Order details:', {
        side: params.side,
        price: roundedPrice,
        size: roundedSize,
        tickSize,
        negRisk: params.negRisk ?? false,
      });

      setState('submitting');
      console.log('📤 Calling createAndPostOrder...');

      // Place the order
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
          negRisk: params.negRisk ?? false,
        },
        OrderType.GTC
      );
      
      // LOG THE FULL RESPONSE
      console.log('📨 === FULL API RESPONSE ===');
      console.log(JSON.stringify(response, null, 2));

      // ============================================
      // CRITICAL: Check for ALL possible error formats
      // The API can return errors in different ways:
      // 1. { errorMsg: "..." }
      // 2. { error: "..." }
      // 3. { status: 400, error: "..." }
      // ============================================
      
      const errorMessage = response?.errorMsg || response?.error;
      const httpStatus = response?.status;
      
      // Check for explicit errors
      if (errorMessage && errorMessage !== '') {
        console.error('❌ API returned error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Check for HTTP error status
      if (httpStatus && httpStatus >= 400) {
        console.error('❌ API returned error status:', httpStatus);
        throw new Error(`Order failed with status ${httpStatus}`);
      }

      // If we get here, the order was accepted
      const orderId = response?.orderID || response?.orderHashes?.[0];
      const txHashes = response?.transactionsHashes || response?.transactionHashes || [];
      const status = response?.status;

      console.log('📊 Parsed response:', {
        success: response?.success,
        orderId,
        status,
        txHashes: txHashes.length,
      });

      // Check if order was ACTUALLY EXECUTED
      const wasExecuted = (
        status === 'matched' || 
        status === 'filled' || 
        (txHashes && txHashes.length > 0)
      );

      if (wasExecuted) {
        console.log('🎉 ORDER EXECUTED! Transaction hashes:', txHashes);
        setLastOrderId(orderId || null);
        setState('success');
        return { 
          success: true, 
          orderId,
          transactionHashes: txHashes,
          status,
        };
      } else if (response?.success || orderId) {
        // Order was accepted but NOT executed (sitting on order book)
        console.log('✅ Order ACCEPTED (on order book, waiting for match)');
        setLastOrderId(orderId || null);
        setState('success');
        return { 
          success: true, 
          orderId,
          status: status || 'pending',
        };
      } else {
        console.error('❌ Order was rejected - no orderId or success flag');
        throw new Error('Order was rejected by the exchange');
      }

    } catch (err: any) {
      console.error('❌ === ORDER FAILED ===');
      console.error('Error:', err);
      
      let errorMsg = err.message || 'Failed to place order';
      
      // Parse user-friendly error messages
      if (errorMsg.includes('lower than the minimum')) {
        // Extract the minimum size from the error
        const match = errorMsg.match(/minimum:\s*(\d+)/);
        const minSize = match ? match[1] : '5';
        errorMsg = `Order too small. This market requires a minimum of ${minSize} shares. Try a larger amount (e.g., $${parseInt(minSize) + 1} or more).`;
      } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        errorMsg = 'Order blocked by geo-restriction. Try using a VPN.';
      } else if (errorMsg.includes('not enough balance') || errorMsg.includes('allowance')) {
        errorMsg = 'Insufficient USDC balance or allowance not set.';
      } else if (errorMsg.includes('min tick size') || errorMsg.includes('tick')) {
        errorMsg = 'Price precision error. The market may have moved.';
      } else if (errorMsg.includes('decimal') || errorMsg.includes('precision')) {
        errorMsg = 'Amount precision error. Try a simpler amount.';
      } else if (errorMsg.includes('signature')) {
        errorMsg = 'Signature error. Try disconnecting and reconnecting your wallet.';
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

  return {
    state,
    error,
    lastOrderId,
    isLoading: state === 'creating' || state === 'submitting',
    isSuccess: state === 'success',
    isError: state === 'error',
    statusMessage: state === 'creating' ? '📝 Creating order...' 
                 : state === 'submitting' ? '📤 Submitting to exchange...'
                 : state === 'success' ? '✅ Order placed!'
                 : state === 'error' ? `❌ ${error}`
                 : '',
    placeOrder,
    cancelOrder,
    cancelAllOrders,
    getOpenOrders,
    reset,
  };
};
