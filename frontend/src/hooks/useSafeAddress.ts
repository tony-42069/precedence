/**
 * useSafeAddress Hook
 * 
 * Derives the Safe wallet address from an EOA address.
 * Also fetches USDC balance (BOTH native and bridged combined).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { getContractConfig } from '@polymarket/builder-relayer-client/dist/config';
import { deriveSafe } from '@polymarket/builder-relayer-client/dist/builder/derive';
import { ethers } from 'ethers';
import { POLYGON_CHAIN_ID } from '../constants/polymarket';

// USDC addresses on Polygon - users can deposit either, we accept both
const USDC_BRIDGED = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC.e
const USDC_NATIVE = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';  // Native USDC
const POLYGON_RPC_URL = 'https://polygon-rpc.com';

interface SafeAddressState {
  eoaAddress: string | null;
  safeAddress: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UsdcBalances {
  native: string;   // Native USDC (needs swap for trading)
  bridged: string;  // USDC.e (ready for trading)
  total: string;    // Combined display
}

export const useSafeAddress = () => {
  const { wallets, ready: walletsReady } = useWallets();
  
  const [state, setState] = useState<SafeAddressState>({
    eoaAddress: null,
    safeAddress: null,
    isLoading: true,
    error: null,
  });

  const [balance, setBalance] = useState<string | null>(null);
  const [balances, setBalances] = useState<UsdcBalances | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const deriveSafeAddress = useCallback((eoaAddress: string): string | null => {
    try {
      const contractConfig = getContractConfig(POLYGON_CHAIN_ID);
      return deriveSafe(eoaAddress, contractConfig.SafeContracts.SafeFactory);
    } catch (err) {
      console.error('Failed to derive Safe address:', err);
      return null;
    }
  }, []);

  /**
   * Fetch USDC balance - checks BOTH native and bridged
   */
  const fetchBalance = useCallback(async (safeAddr: string) => {
    if (!safeAddr) {
      setBalance(null);
      setBalances(null);
      return;
    }

    setBalanceLoading(true);
    try {
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
      const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
      
      const bridgedContract = new ethers.Contract(USDC_BRIDGED, erc20Abi, provider);
      const nativeContract = new ethers.Contract(USDC_NATIVE, erc20Abi, provider);
      
      const [bridgedBalance, nativeBalance] = await Promise.all([
        bridgedContract.balanceOf(safeAddr),
        nativeContract.balanceOf(safeAddr),
      ]);
      
      const bridgedFormatted = ethers.utils.formatUnits(bridgedBalance, 6);
      const nativeFormatted = ethers.utils.formatUnits(nativeBalance, 6);
      const totalBalance = bridgedBalance.add(nativeBalance);
      const totalFormatted = ethers.utils.formatUnits(totalBalance, 6);
      
      console.log('💰 USDC Balances:', {
        'USDC.e (ready)': bridgedFormatted,
        'Native USDC (needs swap)': nativeFormatted,
        'Total': totalFormatted
      });
      
      setBalances({
        native: nativeFormatted,
        bridged: bridgedFormatted,
        total: totalFormatted,
      });
      setBalance(totalFormatted);
    } catch (err) {
      console.error('Failed to fetch USDC balance:', err);
      setBalance('0');
      setBalances({ native: '0', bridged: '0', total: '0' });
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // Update Safe address when wallet changes
  useEffect(() => {
    if (!walletsReady) {
      setState(prev => ({ ...prev, isLoading: true }));
      return;
    }

    if (!wallets || wallets.length === 0) {
      setState({
        eoaAddress: null,
        safeAddress: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    const eoaAddress = wallets[0].address;
    const safeAddress = deriveSafeAddress(eoaAddress);

    if (safeAddress) {
      setState({
        eoaAddress,
        safeAddress,
        isLoading: false,
        error: null,
      });
      fetchBalance(safeAddress);
    } else {
      setState({
        eoaAddress,
        safeAddress: null,
        isLoading: false,
        error: 'Failed to derive deposit address',
      });
    }
  }, [wallets, walletsReady, deriveSafeAddress, fetchBalance]);

  // Refresh balance every 30 seconds
  useEffect(() => {
    if (!state.safeAddress) return;
    
    const interval = setInterval(() => {
      fetchBalance(state.safeAddress!);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [state.safeAddress, fetchBalance]);

  const deriveForAddress = useCallback((address: string): string | null => {
    return deriveSafeAddress(address);
  }, [deriveSafeAddress]);

  const refreshBalance = useCallback(() => {
    if (state.safeAddress) {
      fetchBalance(state.safeAddress);
    }
  }, [state.safeAddress, fetchBalance]);

  return {
    eoaAddress: state.eoaAddress,
    safeAddress: state.safeAddress,
    depositAddress: state.safeAddress,
    signingAddress: state.eoaAddress,
    
    // Balance info
    balance,           // Total (for display)
    balances,          // Detailed breakdown
    balanceLoading,
    refreshBalance,
    
    isLoading: state.isLoading,
    error: state.error,
    deriveForAddress,
  };
};
