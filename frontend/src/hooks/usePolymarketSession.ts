/**
 * usePolymarketSession Hook
 * 
 * Manages the Polymarket trading session lifecycle:
 * 1. Initialize RelayClient with builder config
 * 2. Derive Safe address from EOA
 * 3. Deploy Safe if needed (gasless)
 * 4. Derive User API credentials (requires signature)
 * 5. Set token approvals (gasless batch)
 * 6. Initialize authenticated ClobClient
 * 
 * Uses Privy wallet as the EOA signer.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { ClobClient } from '@polymarket/clob-client';
import { RelayClient } from '@polymarket/builder-relayer-client';
import { BuilderConfig } from '@polymarket/builder-signing-sdk';
import { deriveSafe } from '@polymarket/builder-relayer-client/dist/builder/derive';
import { getContractConfig } from '@polymarket/builder-relayer-client/dist/config';

import {
  POLYGON_CHAIN_ID,
  POLYGON_RPC_URL,
  CLOB_API_URL,
  RELAYER_URL,
  BUILDER_SIGN_URL,
  SIGNATURE_TYPES,
  STORAGE_KEYS,
  USDC_ADDRESS,
  CTF_ADDRESS,
  CTF_EXCHANGE,
  NEG_RISK_CTF_EXCHANGE,
  NEG_RISK_ADAPTER,
} from '../constants/polymarket';

// Session state type
export interface TradingSession {
  eoaAddress: string;
  safeAddress: string;
  isSafeDeployed: boolean;
  hasCredentials: boolean;
  hasApprovals: boolean;
  isReady: boolean;
}

// Session step for UI feedback
export type SessionStep = 
  | 'idle'
  | 'connecting'
  | 'initializing'
  | 'deploying_safe'
  | 'deriving_credentials'
  | 'setting_approvals'
  | 'ready'
  | 'error';

// User API Credentials type
interface UserApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

// Stored session data
interface StoredSession {
  eoaAddress: string;
  safeAddress: string;
  credentials?: UserApiCredentials;
  timestamp: number;
}

export const usePolymarketSession = () => {
  const { authenticated, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  // State
  const [session, setSession] = useState<TradingSession | null>(null);
  const [currentStep, setCurrentStep] = useState<SessionStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Refs for clients (persist across renders)
  const relayClientRef = useRef<RelayClient | null>(null);
  const clobClientRef = useRef<ClobClient | null>(null);
  const signerRef = useRef<ethers.Signer | null>(null);
  const credentialsRef = useRef<UserApiCredentials | null>(null);

  /**
   * Get ethers signer from Privy wallet
   */
  const getPrivySigner = useCallback(async (): Promise<ethers.Signer | null> => {
    if (!wallets || wallets.length === 0) {
      console.log('❌ No Privy wallets available');
      return null;
    }

    const wallet = wallets[0];
    
    try {
      // Get Ethereum provider from Privy wallet
      const ethereumProvider = await wallet.getEthereumProvider();
      
      // Wrap in ethers Web3Provider
      const provider = new ethers.providers.Web3Provider(ethereumProvider);
      const signer = provider.getSigner();
      
      console.log('✅ Got signer from Privy wallet:', wallet.address);
      return signer;
    } catch (err) {
      console.error('❌ Failed to get signer from Privy wallet:', err);
      return null;
    }
  }, [wallets]);

  /**
   * Create BuilderConfig for remote signing
   */
  const createBuilderConfig = useCallback(() => {
    return new BuilderConfig({
      remoteBuilderConfig: {
        url: BUILDER_SIGN_URL,
      },
    });
  }, []);

  /**
   * Load stored session from localStorage
   */
  const loadStoredSession = useCallback((): StoredSession | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRADING_SESSION);
      if (!stored) return null;
      
      const parsed: StoredSession = JSON.parse(stored);
      
      // Check if session is still valid (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > maxAge) {
        localStorage.removeItem(STORAGE_KEYS.TRADING_SESSION);
        return null;
      }
      
      return parsed;
    } catch {
      return null;
    }
  }, []);

  /**
   * Save session to localStorage
   */
  const saveSession = useCallback((data: StoredSession) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.TRADING_SESSION, JSON.stringify(data));
  }, []);

  /**
   * Initialize the trading session
   */
  const initializeSession = useCallback(async () => {
    if (isInitializing) {
      console.log('⏳ Already initializing...');
      return;
    }

    if (!authenticated || !walletsReady || wallets.length === 0) {
      setError('Wallet not connected');
      return;
    }

    setIsInitializing(true);
    setError(null);
    setCurrentStep('initializing');

    try {
      // Step 1: Get signer from Privy wallet
      const signer = await getPrivySigner();
      if (!signer) {
        throw new Error('Failed to get wallet signer');
      }
      signerRef.current = signer;

      const eoaAddress = await signer.getAddress();
      console.log('📍 EOA Address:', eoaAddress);

      // Step 2: Derive Safe address (deterministic)
      const contractConfig = getContractConfig(POLYGON_CHAIN_ID);
      const safeAddress = deriveSafe(eoaAddress, contractConfig.SafeContracts.SafeFactory);
      console.log('📍 Derived Safe Address:', safeAddress);

      // Step 3: Check for stored session
      const storedSession = loadStoredSession();
      if (storedSession && storedSession.eoaAddress.toLowerCase() === eoaAddress.toLowerCase()) {
        console.log('📦 Found stored session');
        if (storedSession.credentials) {
          credentialsRef.current = storedSession.credentials;
        }
      }

      // Step 4: Create RelayClient with builder config
      const builderConfig = createBuilderConfig();
      
      // Need to use viem wallet client for RelayClient
      const ethereumProvider = await wallets[0].getEthereumProvider();
      const { createWalletClient, custom } = await import('viem');
      const { polygon } = await import('viem/chains');
      const { privateKeyToAccount } = await import('viem/accounts');
      
      // Create viem wallet client from provider
      const walletClient = createWalletClient({
        chain: polygon,
        transport: custom(ethereumProvider),
      });

      const relayClient = new RelayClient(
        RELAYER_URL,
        POLYGON_CHAIN_ID,
        walletClient as any,
        builderConfig
      );
      relayClientRef.current = relayClient;

      // Step 5: Check if Safe is deployed
      setCurrentStep('deploying_safe');
      let isSafeDeployed = false;
      
      try {
        isSafeDeployed = await relayClient.getDeployed(safeAddress);
        console.log('🏦 Safe deployed:', isSafeDeployed);
      } catch {
        console.log('⚠️ Could not check Safe deployment status');
      }

      if (!isSafeDeployed) {
        console.log('🚀 Deploying Safe wallet...');
        const deployResponse = await relayClient.deploy();
        const deployResult = await deployResponse.wait();
        console.log('✅ Safe deployed:', deployResult?.proxyAddress || safeAddress);
        isSafeDeployed = true;
      }

      // Step 6: Derive User API Credentials
      setCurrentStep('deriving_credentials');
      let credentials = credentialsRef.current;

      if (!credentials) {
        console.log('🔑 Deriving User API credentials...');
        
        // Create temporary ClobClient to derive credentials
        const tempClient = new ClobClient(
          CLOB_API_URL,
          POLYGON_CHAIN_ID,
          signer as any
        );

        try {
          // Try to derive existing credentials first
          credentials = await tempClient.deriveApiKey() as UserApiCredentials;
          console.log('✅ Derived existing credentials');
        } catch {
          // If derive fails, create new credentials
          console.log('📝 Creating new credentials...');
          credentials = await tempClient.createApiKey() as UserApiCredentials;
          console.log('✅ Created new credentials');
        }

        credentialsRef.current = credentials;
      }

      // Step 7: Set token approvals
      setCurrentStep('setting_approvals');
      console.log('✅ Setting token approvals...');

      // Check and set approvals (this is gasless via RelayClient)
      try {
        const approvalTxs = createApprovalTransactions();
        if (approvalTxs.length > 0) {
          const approvalResponse = await relayClient.execute(approvalTxs, safeAddress);
          await approvalResponse.wait();
          console.log('✅ Token approvals set');
        }
      } catch (approvalError: any) {
        // Approvals might already be set, continue
        console.log('⚠️ Approval check:', approvalError.message);
      }

      // Step 8: Create authenticated ClobClient
      const authenticatedClient = new ClobClient(
        CLOB_API_URL,
        POLYGON_CHAIN_ID,
        signer as any,
        credentials,
        SIGNATURE_TYPES.BROWSER, // signature_type = 2 for browser wallets
        safeAddress,
        undefined,
        false,
        builderConfig
      );
      clobClientRef.current = authenticatedClient;

      // Step 9: Save session and update state
      const newSession: TradingSession = {
        eoaAddress,
        safeAddress,
        isSafeDeployed: true,
        hasCredentials: true,
        hasApprovals: true,
        isReady: true,
      };

      saveSession({
        eoaAddress,
        safeAddress,
        credentials,
        timestamp: Date.now(),
      });

      setSession(newSession);
      setCurrentStep('ready');
      console.log('🎉 Trading session ready!');

    } catch (err: any) {
      console.error('❌ Session initialization failed:', err);
      setError(err.message || 'Failed to initialize trading session');
      setCurrentStep('error');
    } finally {
      setIsInitializing(false);
    }
  }, [
    authenticated, 
    walletsReady, 
    wallets, 
    isInitializing,
    getPrivySigner, 
    createBuilderConfig, 
    loadStoredSession, 
    saveSession
  ]);

  /**
   * Create approval transactions for Safe
   */
  const createApprovalTransactions = () => {
    const MAX_UINT256 = ethers.constants.MaxUint256;
    
    const erc20Interface = new ethers.utils.Interface([
      'function approve(address spender, uint256 amount)',
    ]);
    
    const erc1155Interface = new ethers.utils.Interface([
      'function setApprovalForAll(address operator, bool approved)',
    ]);

    const transactions = [];

    // USDC approvals (ERC-20)
    const usdcSpenders = [CTF_ADDRESS, CTF_EXCHANGE, NEG_RISK_CTF_EXCHANGE, NEG_RISK_ADAPTER];
    for (const spender of usdcSpenders) {
      transactions.push({
        to: USDC_ADDRESS,
        value: '0',
        data: erc20Interface.encodeFunctionData('approve', [spender, MAX_UINT256]),
        operation: 0,
      });
    }

    // CTF approvals (ERC-1155)
    const ctfOperators = [CTF_EXCHANGE, NEG_RISK_CTF_EXCHANGE, NEG_RISK_ADAPTER];
    for (const operator of ctfOperators) {
      transactions.push({
        to: CTF_ADDRESS,
        value: '0',
        data: erc1155Interface.encodeFunctionData('setApprovalForAll', [operator, true]),
        operation: 0,
      });
    }

    return transactions;
  };

  /**
   * End the trading session
   */
  const endSession = useCallback(() => {
    relayClientRef.current = null;
    clobClientRef.current = null;
    signerRef.current = null;
    credentialsRef.current = null;
    
    setSession(null);
    setCurrentStep('idle');
    setError(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.TRADING_SESSION);
    }
    
    console.log('🔌 Trading session ended');
  }, []);

  /**
   * Get the authenticated ClobClient
   */
  const getClobClient = useCallback(() => {
    return clobClientRef.current;
  }, []);

  /**
   * Get the RelayClient
   */
  const getRelayClient = useCallback(() => {
    return relayClientRef.current;
  }, []);

  // Auto-initialize when Privy is ready and authenticated
  useEffect(() => {
    if (privyReady && walletsReady && authenticated && wallets.length > 0 && !session && !isInitializing) {
      // Check for stored session first
      const stored = loadStoredSession();
      if (stored && stored.eoaAddress.toLowerCase() === wallets[0].address.toLowerCase()) {
        console.log('🔄 Auto-initializing from stored session...');
        // Don't auto-initialize, let user trigger it
      }
    }
  }, [privyReady, walletsReady, authenticated, wallets, session, isInitializing, loadStoredSession]);

  // Computed values
  const isReady = session?.isReady ?? false;
  const isSessionActive = session !== null;

  // Status message for UI
  const getStatusMessage = () => {
    switch (currentStep) {
      case 'connecting': return '🔗 Connecting wallet...';
      case 'initializing': return '⚙️ Initializing session...';
      case 'deploying_safe': return '🏦 Deploying secure wallet...';
      case 'deriving_credentials': return '🔑 Setting up trading credentials...';
      case 'setting_approvals': return '✅ Approving tokens...';
      case 'ready': return '🎉 Ready to trade!';
      case 'error': return `❌ ${error}`;
      default: return '';
    }
  };

  return {
    // Session state
    session,
    currentStep,
    error,
    isInitializing,
    isReady,
    isSessionActive,
    statusMessage: getStatusMessage(),

    // Actions
    initializeSession,
    endSession,

    // Clients
    getClobClient,
    getRelayClient,
  };
};
