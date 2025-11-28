import { useState, useEffect, useCallback } from 'react';

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: string | null;
  network: 'solana' | 'ethereum' | null;
  walletType: 'phantom' | 'metamask' | null;
  connecting: boolean;
  error: string | null;
}

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    address: null,
    balance: null,
    network: null,
    walletType: null,
    connecting: false,
    error: null,
  });

  // Callback for when wallet connects - will be set by components using useUser
  const [onConnectCallback, setOnConnectCallback] = useState<((address: string) => void) | null>(null);

  // Check if wallets are available
  const checkWalletAvailability = () => {
    const hasPhantom = typeof window !== 'undefined' && window.solana?.isPhantom;
    const hasMetaMask = typeof window !== 'undefined' && window.ethereum?.isMetaMask;

    return { hasPhantom, hasMetaMask };
  };

  // Set callback for successful connection
  const setOnConnect = useCallback((callback: (address: string) => void) => {
    setOnConnectCallback(() => callback);
  }, []);

  // Connect Phantom (Solana) wallet
  const connectPhantom = async () => {
    try {
      setWalletState(prev => ({ ...prev, connecting: true, error: null }));

      if (!window.solana?.isPhantom) {
        throw new Error('Phantom wallet not found. Please install Phantom.');
      }

      const response = await window.solana.connect();
      const address = response.publicKey.toString();

      // Get balance (simplified)
      const balance = '0'; // Would need to fetch actual balance

      setWalletState({
        connected: true,
        address,
        balance,
        network: 'solana',
        walletType: 'phantom',
        connecting: false,
        error: null,
      });

      // Trigger callback for user registration
      if (onConnectCallback) {
        onConnectCallback(address);
      }

      return address;

    } catch (error: any) {
      setWalletState(prev => ({
        ...prev,
        connecting: false,
        error: error.message || 'Failed to connect Phantom wallet',
      }));
      throw error;
    }
  };

  // Connect MetaMask (Ethereum) wallet
  const connectMetaMask = async () => {
    try {
      setWalletState(prev => ({ ...prev, connecting: true, error: null }));

      if (!window.ethereum?.isMetaMask) {
        throw new Error('MetaMask not found. Please install MetaMask.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Get balance
      const balanceWei = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      const balance = (parseInt(balanceWei, 16) / 1e18).toFixed(4); // Convert to ETH

      setWalletState({
        connected: true,
        address,
        balance,
        network: 'ethereum',
        walletType: 'metamask',
        connecting: false,
        error: null,
      });

      // Trigger callback for user registration
      if (onConnectCallback) {
        onConnectCallback(address);
      }

      return address;

    } catch (error: any) {
      setWalletState(prev => ({
        ...prev,
        connecting: false,
        error: error.message || 'Failed to connect MetaMask wallet',
      }));
      throw error;
    }
  };

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setWalletState({
      connected: false,
      address: null,
      balance: null,
      network: null,
      walletType: null,
      connecting: false,
      error: null,
    });
    
    // Clear stored wallet data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('precedence_wallet');
    }
  }, []);

  // Check for stored wallet connection on mount
  useEffect(() => {
    const checkStoredConnection = async () => {
      try {
        if (typeof window === 'undefined') return;
        
        const savedWallet = localStorage.getItem('precedence_wallet');
        if (!savedWallet) return;

        // Try to reconnect to MetaMask
        if (window.ethereum?.isMetaMask) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0 && accounts[0].toLowerCase() === savedWallet.toLowerCase()) {
              const balanceWei = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [accounts[0], 'latest'],
              });
              const balance = (parseInt(balanceWei, 16) / 1e18).toFixed(4);

              setWalletState({
                connected: true,
                address: accounts[0],
                balance,
                network: 'ethereum',
                walletType: 'metamask',
                connecting: false,
                error: null,
              });
              console.log('🔄 Restored MetaMask connection:', accounts[0]);
              return;
            }
          } catch (e) {
            console.log('Could not restore MetaMask connection');
          }
        }

        // Try to reconnect to Phantom
        if (window.solana?.isPhantom) {
          try {
            const response = await window.solana.connect({ onlyIfTrusted: true });
            const address = response.publicKey.toString();
            if (address === savedWallet) {
              setWalletState({
                connected: true,
                address,
                balance: '0',
                network: 'solana',
                walletType: 'phantom',
                connecting: false,
                error: null,
              });
              console.log('🔄 Restored Phantom connection:', address);
              return;
            }
          } catch (e) {
            console.log('Could not restore Phantom connection');
          }
        }

      } catch (error) {
        console.warn('Failed to restore wallet connection:', error);
      }
    };

    // Check for stored connection after a short delay to ensure DOM is ready
    const timer = setTimeout(checkStoredConnection, 100);
    return () => clearTimeout(timer);
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else if (walletState.connected && walletState.walletType === 'metamask') {
          // Update to new account
          setWalletState(prev => ({
            ...prev,
            address: accounts[0],
          }));
        }
      };

      const handleChainChanged = () => {
        // Reload page on network change
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [disconnect, walletState.connected, walletState.walletType]);

  useEffect(() => {
    if (window.solana) {
      const handleDisconnect = () => {
        disconnect();
      };

      window.solana.on('disconnect', handleDisconnect);

      return () => {
        window.solana?.removeListener('disconnect', handleDisconnect);
      };
    }
  }, [disconnect]);

  return {
    walletState,
    connectPhantom,
    connectMetaMask,
    disconnect,
    checkWalletAvailability,
    setOnConnect,
  };
};

// Type declarations for wallet extensions
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
      disconnect(): Promise<void>;
      on(event: string, handler: (...args: any[]) => void): void;
      removeListener(event: string, handler: (...args: any[]) => void): void;
    };
    ethereum?: {
      isMetaMask?: boolean;
      request(args: { method: string; params?: any[] }): Promise<any>;
      on(event: string, handler: (...args: any[]) => void): void;
      removeListener(event: string, handler: (...args: any[]) => void): void;
    };
  }
}
