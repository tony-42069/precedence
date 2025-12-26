/**
 * useSafeAddress Hook
 * 
 * Derives the Safe wallet address from an EOA address.
 * The Safe address is deterministic - same EOA always produces same Safe.
 * This address is where users should deposit funds for trading.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { getContractConfig } from '@polymarket/builder-relayer-client/dist/config';
import { deriveSafe } from '@polymarket/builder-relayer-client/dist/builder/derive';
import { POLYGON_CHAIN_ID } from '../constants/polymarket';

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

  // Derive Safe address from EOA
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
    } else {
      setState({
        eoaAddress,
        safeAddress: null,
        isLoading: false,
        error: 'Failed to derive deposit address',
      });
    }
  }, [wallets, walletsReady, deriveSafeAddress]);

  // Manual derive function (for use with any address)
  const deriveForAddress = useCallback((address: string): string | null => {
    return deriveSafeAddress(address);
  }, [deriveSafeAddress]);

  return {
    // The EOA address (Privy wallet - for signing)
    eoaAddress: state.eoaAddress,
    
    // The Safe address (for deposits - this is where USDC should go)
    safeAddress: state.safeAddress,
    
    // Alias for clarity in UI
    depositAddress: state.safeAddress,
    signingAddress: state.eoaAddress,
    
    // State
    isLoading: state.isLoading,
    error: state.error,
    
    // Manual derivation
    deriveForAddress,
  };
};
