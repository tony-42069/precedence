import { useState, useEffect } from 'react';

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

  // Check if wallets are available
  const checkWalletAvailability = () => {
    const hasPhantom = typeof window !== 'undefined' && window.solana?.isPhantom;
    const hasMetaMask = typeof window !== 'undefined' && window.ethereum?.isMetaMask;

    return { hasPhantom, hasMetaMask };
  };

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

    } catch (error: any) {
      setWalletState(prev => ({
        ...prev,
        connecting: false,
        error: error.message || 'Failed to connect Phantom wallet',
      }));
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

    } catch (error: any) {
      setWalletState(prev => ({
        ...prev,
        connecting: false,
        error: error.message || 'Failed to connect MetaMask wallet',
      }));
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    setWalletState({
      connected: false,
      address: null,
      balance: null,
      network: null,
      walletType: null,
      connecting: false,
      error: null,
    });
  };

  // Check for stored wallet connection on mount
  useEffect(() => {
    const checkStoredConnection = () => {
      try {
        const connected = sessionStorage.getItem('wallet_connected') === 'true';
        const walletType = sessionStorage.getItem('wallet_type') as 'phantom' | 'metamask' | null;
        const address = sessionStorage.getItem('wallet_address');

        if (connected && walletType && address) {
          // Restore wallet state from sessionStorage
          const network = walletType === 'phantom' ? 'solana' : 'ethereum';

          setWalletState({
            connected: true,
            address,
            balance: null, // Would need to refetch balance
            network,
            walletType,
            connecting: false,
            error: null,
          });

          // Clear the stored data after restoring
          sessionStorage.removeItem('wallet_connected');
          sessionStorage.removeItem('wallet_type');
          sessionStorage.removeItem('wallet_address');
        }
      } catch (error) {
        console.warn('Failed to restore wallet connection from sessionStorage:', error);
      }
    };

    // Check for stored connection after a short delay to ensure DOM is ready
    const timer = setTimeout(checkStoredConnection, 100);
    return () => clearTimeout(timer);
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          // Reconnect with new account
          connectMetaMask();
        }
      });

      window.ethereum.on('chainChanged', () => {
        // Reload page on network change
        window.location.reload();
      });
    }

    if (window.solana) {
      window.solana.on('disconnect', () => {
        disconnect();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
      if (window.solana) {
        window.solana.removeListener('disconnect', () => {});
      }
    };
  }, []);

  return {
    walletState,
    connectPhantom,
    connectMetaMask,
    disconnect,
    checkWalletAvailability,
  };
};

// Type declarations for wallet extensions
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect(): Promise<{ publicKey: { toString(): string } }>;
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
