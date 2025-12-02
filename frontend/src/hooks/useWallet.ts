/**
 * useWallet Hook - Privy Wrapper for Backwards Compatibility
 * 
 * This hook wraps Privy's authentication to maintain compatibility with
 * existing components that use the useWallet pattern.
 * 
 * All wallet functionality now goes through Privy (email, Google, wallet login).
 * The old MetaMask/Phantom direct connections are deprecated.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: string | null;
  network: 'polygon' | 'ethereum' | null;
  walletType: 'privy' | null;
  connecting: boolean;
  error: string | null;
}

export const useWallet = () => {
  const { authenticated, login, logout, ready } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    address: null,
    balance: null,
    network: null,
    walletType: null,
    connecting: false,
    error: null,
  });

  // Update wallet state based on Privy authentication
  useEffect(() => {
    if (!ready || !walletsReady) {
      return;
    }

    if (authenticated && wallets.length > 0) {
      const wallet = wallets[0];
      setWalletState({
        connected: true,
        address: wallet.address,
        balance: null, // Balance fetched elsewhere if needed
        network: 'polygon',
        walletType: 'privy',
        connecting: false,
        error: null,
      });
    } else {
      setWalletState({
        connected: false,
        address: null,
        balance: null,
        network: null,
        walletType: null,
        connecting: false,
        error: null,
      });
    }
  }, [authenticated, wallets, ready, walletsReady]);

  // Legacy connect functions - now trigger Privy login
  const connectMetaMask = useCallback(async () => {
    setWalletState(prev => ({ ...prev, connecting: true, error: null }));
    try {
      await login({ loginMethods: ['wallet'] });
      // State will be updated by the useEffect when Privy authenticates
    } catch (error: any) {
      setWalletState(prev => ({
        ...prev,
        connecting: false,
        error: error.message || 'Failed to connect wallet',
      }));
      throw error;
    }
  }, [login]);

  const connectPhantom = useCallback(async () => {
    // Privy handles all wallet connections now
    return connectMetaMask();
  }, [connectMetaMask]);

  // Disconnect - logs out of Privy
  const disconnect = useCallback(async () => {
    try {
      await logout();
      setWalletState({
        connected: false,
        address: null,
        balance: null,
        network: null,
        walletType: null,
        connecting: false,
        error: null,
      });
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, [logout]);

  // Legacy compatibility - not really needed with Privy
  const checkWalletAvailability = useCallback(() => {
    return {
      hasPhantom: false,
      hasMetaMask: true, // Privy can connect to MetaMask
    };
  }, []);

  // Legacy callback - no-op since Privy + UserContext handles registration
  const setOnConnect = useCallback((_callback: (address: string) => void) => {
    // No-op - UserContext handles user registration on Privy auth
  }, []);

  return {
    walletState,
    connectPhantom,
    connectMetaMask,
    disconnect,
    checkWalletAvailability,
    setOnConnect,
  };
};
