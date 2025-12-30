/**
 * usePolymarketOrder Hook
 * 
 * Handles MARKET order placement on Polymarket using FOK (Fill-Or-Kill).
 * 
 * FOK = Fill-Or-Kill = MARKET ORDER
 * - Executes IMMEDIATELY at best available price
 * - No $5 minimum like GTC limit orders
 * - Either fills completely or cancels entirely
 * 
 * For FOK orders:
 * - BUY: amount is in DOLLARS (how much USDC to spend)
 * - SELL: amount is in SHARES (how many shares to sell)
 */

'use client';

import { useState, useCallback } from 'react';
import { ClobClient, Side, OrderType } from '@polymarket/clob-client';

export interface OrderParams {
  tokenId: string;
  price: number;      // Used for display/estimation, FOK uses market price
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
      console.log('🚀 === FOK MARKET ORDER START ===');
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
      
      // For FOK MARKET orders:
      // - BUY: amount is in DOLLARS (how much USDC to spend)
      // - SELL: amount is in SHARES (how many shares to sell)
      // Round to 2 decimal places (FOK requirement)
      const roundedAmount = roundDown(params.size, 2);
      
      if (roundedAmount < 0.01) {
        throw new Error('Order amount too small. Minimum is $0.01');
      }

      console.log('📝 FOK Market Order:', {
        side: params.side,
        amount: roundedAmount,
        tickSize,
        negRisk: params.negRisk ?? false,
      });

      setState('submitting');
      console.log('📤 Creating market order...');

      // Create a MARKET order (FOK)
      const signedOrder = await client.createMarketOrder({
        tokenID: params.tokenId,
        amount: roundedAmount,  // BUY: dollars, SELL: shares
        side: params.side === 'BUY' ? Side.BUY : Side.SELL,
        feeRateBps: 0,
      }, {
        tickSize: tickSize as any,
        negRisk: params.negRisk ?? false,
      });

      console.log('📝 Order signed, posting with FOK...');

      // Post with FOK (Fill-Or-Kill) for immediate execution
      const response = await client.postOrder(signedOrder, OrderType.FOK);
      
      // LOG THE FULL RESPONSE
      console.log('📨 === FULL API RESPONSE ===');
      console.log(JSON.stringify(response, null, 2));

      // ============================================
      // CRITICAL: Check for ALL possible error formats
      // ============================================
      const errorMessage = response?.errorMsg || response?.error;
      const httpStatus = response?.status;
      
      // Check for explicit errors
      if (errorMessage && errorMessage !== '' && typeof errorMessage === 'string') {
        console.error('❌ API returned error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Check for HTTP error status (but not 'matched' status string)
      if (typeof httpStatus === 'number' && httpStatus >= 400) {
        console.error('❌ API returned error status:', httpStatus);
        throw new Error(`Order failed with status ${httpStatus}`);
      }

      // Success! Parse the response
      const orderId = response?.orderID || response?.orderHashes?.[0];
      const txHashes = response?.transactionsHashes || response?.transactionHashes || [];
      const status = response?.status;
      const takingAmount = response?.takingAmount;
      const makingAmount = response?.makingAmount;

      console.log('📊 Parsed response:', {
        success: response?.success,
        orderId,
        status,
        txHashes,
        takingAmount,
        makingAmount,
      });

      // FOK orders should execute immediately or fail
      const wasExecuted = (
        status === 'matched' || 
        status === 'filled' || 
        (txHashes && txHashes.length > 0) ||
        (response?.success && orderId)
      );

      if (wasExecuted) {
        console.log('🎉 ORDER EXECUTED!');
        if (txHashes.length > 0) {
          console.log('   Transaction hashes:', txHashes);
        }
        setLastOrderId(orderId || null);
        setState('success');
        return { 
          success: true, 
          orderId,
          transactionHashes: txHashes,
          status: status || 'matched',
        };
      } else {
        // FOK should not end up here - it either fills or fails
        console.warn('⚠️ Unexpected: FOK order neither filled nor errored');
        throw new Error('Order could not be filled. Try again or adjust amount.');
      }

    } catch (err: any) {
      console.error('❌ === ORDER FAILED ===');
      console.error('Error:', err);
      
      let errorMsg = err.message || 'Failed to place order';
      
      // Parse user-friendly error messages
      if (errorMsg.includes('lower than the minimum')) {
        const match = errorMsg.match(/minimum:\s*(\d+)/);
        const minSize = match ? match[1] : '5';
        errorMsg = `Order too small. Minimum ${minSize} shares required.`;
      } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        errorMsg = 'Order blocked by geo-restriction. Try using a VPN.';
      } else if (errorMsg.includes('not enough balance') || errorMsg.includes('allowance')) {
        errorMsg = 'Insufficient USDC balance or allowance not set.';
      } else if (errorMsg.includes('min tick size') || errorMsg.includes('tick')) {
        errorMsg = 'Price precision error. The market may have moved.';
      } else if (errorMsg.includes('decimal') || errorMsg.includes('precision')) {
        errorMsg = 'Amount precision error. Try a simpler amount like $1, $5, $10.';
      } else if (errorMsg.includes('signature')) {
        errorMsg = 'Signature error. Try disconnecting and reconnecting your wallet.';
      } else if (errorMsg.includes('no liquidity') || errorMsg.includes('unfillable')) {
        errorMsg = 'Not enough liquidity. Try a smaller amount.';
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
                 : state === 'submitting' ? '📤 Executing trade...'
                 : state === 'success' ? '✅ Trade executed!'
                 : state === 'error' ? `❌ ${error}`
                 : '',
    placeOrder,
    cancelOrder,
    cancelAllOrders,
    getOpenOrders,
    reset,
  };
};
