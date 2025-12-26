/**
 * useSafeAddress Hook
 * 
 * Derives the Safe wallet address from an EOA address.
 * The Safe address is deterministic - same EOA always produces same Safe.
 * This address is where users should deposit funds for trading.
 * 
 * Also fetches USDC balance from the Safe wallet.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { getContractConfig } from '@polymarket/builder-relayer-client/dist/config';
import { deriveSafe } from '@polymarket/builder-relayer-client/dist/builder/derive';
import { ethers } from 'ethers';
import { POLYGON_CHAIN_ID } from '../constants/polymarket';

// USDC contract addresses on Polygon
// There are TWO versions - we need to check both
const USDC_BRIDGED = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC.e (Bridged from Ethereum)
const USDC_NATIVE = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';  // Native USDC (Circle)
const POLYGON_RPC_URL = 'https://polygon-rpc.com';

interface SafeAddressState {
  eoaAddress: string | null;
  safeAddress: string | null;
  isLoading: boolean;
  error: string | null;
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
  const [balanceLoading, setBalanceLoading] = useState(false);

  /**
   * Derive Safe address from EOA
   */
  const deriveSafeAddress = useCallback((eoaAddress: string): string | null => {
    try {
      const contractConfig = getContractConfig(POLYGON_CHAIN_ID);
      const safeAddress = deriveSafe(eoaAddress, contractConfig.SafeContracts.SafeFactory);
      return safeAddress;
    } catch (err) {
      console.error('Failed to derive Safe address:', err);
      return null;
    }
  }, []);

  /**
   * Fetch USDC balance from Safe wallet
   * Checks BOTH bridged and native USDC contracts
   */
  const fetchBalance = useCallback(async (safeAddr: string) => {
    if (!safeAddr) {
      setBalance(null);
      return;
    }

    setBalanceLoading(true);
    try {
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
      
      const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
      
      // Check bridged USDC.e balance
      const usdcBridgedContract = new ethers.Contract(USDC_BRIDGED, erc20Abi, provider);
      const bridgedBalance = await usdcBridgedContract.balanceOf(safeAddr);
      
      // Check native USDC balance
      const usdcNativeContract = new ethers.Contract(USDC_NATIVE, erc20Abi, provider);
      const nativeBalance = await usdcNativeContract.balanceOf(safeAddr);
      
      // Both have 6 decimals - combine them
      const totalBalance = bridgedBalance.add(nativeBalance);
      const balanceFormatted = ethers.utils.formatUnits(totalBalance, 6);
      
      console.log('💰 USDC Balances:', {
        bridged: ethers.utils.formatUnits(bridgedBalance, 6),
        native: ethers.utils.formatUnits(nativeBalance, 6),
        total: balanceFormatted
      });
      
      setBalance(balanceFormatted);
    } catch (err) {
      console.error('Failed to fetch USDC balance:', err);
      setBalance('0');
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
      console.log('📍 Wallet Addresses:', {
        eoa: eoaAddress,
        safe: safeAddress,
      });
      
      // Fetch balance immediately
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

  // Manual derive function (for use with any address)
  const deriveForAddress = useCallback((address: string): string | null => {
    return deriveSafeAddress(address);
  }, [deriveSafeAddress]);

  // Manual refresh balance
  const refreshBalance = useCallback(() => {
    if (state.safeAddress) {
      fetchBalance(state.safeAddress);
    }
  }, [state.safeAddress, fetchBalance]);

  return {
    // The EOA address (Privy wallet - for signing)
    eoaAddress: state.eoaAddress,
    
    // The Safe address (for deposits - this is where USDC should go)
    safeAddress: state.safeAddress,
    
    // Alias for clarity in UI
    depositAddress: state.safeAddress,
    signingAddress: state.eoaAddress,
    
    // Balance
    balance,
    balanceLoading,
    refreshBalance,
    
    // State
    isLoading: state.isLoading,
    error: state.error,
    
    // Manual derivation
    deriveForAddress,
  };
};
