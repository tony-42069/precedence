'use client';

import { useState, useCallback } from 'react';
import { apiService, TradePayload, TradeResult, DeploySafeRequest, ApproveUSDCRequest } from '../services/api';

interface TradeParams {
  marketId: string;
  tokenId: string;
  side: 'YES' | 'NO';
  amount: number;
  price: number;
}

export type TradingState = 'idle' | 'checking_wallet' | 'deploying_wallet' | 'approving_token' | 'executing_trade' | 'success' | 'error';

export const useTrading = () => {
  const [state, setState] = useState<TradingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TradeResult | null>(null);

  const executeTrade = useCallback(async (
    params: TradeParams,
    walletAddress: string
  ) => {
    // Reset state
    setState('idle');
    setError(null);
    setResult(null);

    try {
      // STEP 1: Check if user has a Safe wallet
      setState('checking_wallet');
      console.log('🔍 Checking Safe wallet status...');

      try {
        const safeStatus = await apiService.checkSafeStatus(walletAddress);

        if (!safeStatus.has_safe) {
          // STEP 2: Deploy Safe wallet
          setState('deploying_wallet');
          console.log('🛠 Deploying Safe wallet...');

          const deployRequest: DeploySafeRequest = {
            user_wallet_address: walletAddress
          };

          const deployResult = await apiService.deploySafeWallet(deployRequest);

          if (!deployResult.success) {
            throw new Error(deployResult.error || 'Safe deployment failed');
          }

          console.log('✅ Safe wallet deployed:', deployResult.safe_address);

          // Update safe status after deployment
          safeStatus.has_safe = true;
          safeStatus.safe_address = deployResult.safe_address;
        }

        // STEP 3: Check USDC approval status
        if (!safeStatus.usdc_approved && safeStatus.safe_address) {
          setState('approving_token');
          console.log('💰 Approving USDC spending...');

          const approveRequest: ApproveUSDCRequest = {
            safe_address: safeStatus.safe_address
          };

          const approveResult = await apiService.approveUSDC(approveRequest);

          if (!approveResult.success) {
            throw new Error(approveResult.error || 'USDC approval failed');
          }

          console.log('✅ USDC approved for trading');
        }

      } catch (walletError) {
        // If wallet check fails, assume we need to continue with trade
        // The backend will handle Safe deployment internally
        console.warn('Wallet check failed, proceeding to trade:', walletError);
      }

      // STEP 4: Execute the actual trade
      setState('executing_trade');
      console.log('📈 Executing trade...');

      const tradePayload: TradePayload = {
        market_id: params.marketId,
        token_id: params.tokenId,
        side: params.side,
        amount: params.amount,
        price: params.price,
        wallet_address: walletAddress,
      };

      const tradeResult = await apiService.executeTrade(tradePayload);

      if (!tradeResult.success) {
        throw new Error(tradeResult.error || 'Trade execution failed');
      }

      // SUCCESS
      setResult(tradeResult);
      setState('success');
      console.log('🎉 Trade executed successfully:', tradeResult);

      return tradeResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown trading error';
      setError(errorMessage);
      setState('error');
      console.error('❌ Trading failed:', err);

      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setResult(null);
  }, []);

  // Computed values for UI
  const isLoading = ['checking_wallet', 'deploying_wallet', 'approving_token', 'executing_trade'].includes(state);
  const isDeployingWallet = state === 'deploying_wallet';
  const isApprovingToken = state === 'approving_token';
  const isExecutingTrade = state === 'executing_trade';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  // Status messages for UI
  const getStatusMessage = () => {
    switch (state) {
      case 'checking_wallet': return '🔍 Checking wallet setup...';
      case 'deploying_wallet': return '🛠 Deploying secure wallet...';
      case 'approving_token': return '💰 Approving USDC access...';
      case 'executing_trade': return '📈 Executing trade...';
      case 'success': return '✅ Trade completed!';
      case 'error': return `❌ ${error}`;
      default: return '';
    }
  };

  return {
    executeTrade,
    state,
    error,
    result,
    reset,

    // UI helpers
    statusMessage: getStatusMessage(),
    isLoading,
    isDeployingWallet,
    isApprovingToken,
    isExecutingTrade,
    isSuccess,
    isError,
  };
};
