/**
 * usePolymarketSession Hook - OPTIMIZED v3
 * 
 * SIGNATURE REDUCTION STRATEGY:
 * - First-time users: 2 signatures max (credentials + order)
 * - Returning users: 1 signature (order only)
 * 
 * The RelayClient operations (deploy, approvals) happen via the builder
 * which doesn't require user signatures - it's handled server-side.
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
  getBuilderSignUrl,
  SIGNATURE_TYPES,
  STORAGE_KEYS,
  USDC_ADDRESS,
  USDC_NATIVE_ADDRESS,
  CTF_ADDRESS,
  CTF_EXCHANGE,
  NEG_RISK_CTF_EXCHANGE,
  NEG_RISK_ADAPTER,
} from '../constants/polymarket';

export interface TradingSession {
  eoaAddress: string;
  safeAddress: string;
  isSafeDeployed: boolean;
  hasCredentials: boolean;
  hasApprovals: boolean;
  isReady: boolean;
}

export type SessionStep = 
  | 'idle'
  | 'connecting'
  | 'initializing'
  | 'deploying_safe'
  | 'deriving_credentials'
  | 'checking_approvals'
  | 'setting_approvals'
  | 'ready'
  | 'error';

export interface UserApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

interface StoredSession {
  eoaAddress: string;
  safeAddress: string;
  credentials?: UserApiCredentials;
  approvalsSet?: boolean;
  safeDeployed?: boolean;
  timestamp: number;
}

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const ERC1155_ABI = [
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
];

export const usePolymarketSession = () => {
  const { authenticated, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const [session, setSession] = useState<TradingSession | null>(null);
  const [currentStep, setCurrentStep] = useState<SessionStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const relayClientRef = useRef<RelayClient | null>(null);
  const clobClientRef = useRef<ClobClient | null>(null);
  const signerRef = useRef<ethers.Signer | null>(null);
  const credentialsRef = useRef<UserApiCredentials | null>(null);
  const builderConfigRef = useRef<BuilderConfig | null>(null);
  const autoRestoreAttemptedRef = useRef(false);

  const isValidCredentials = (creds: any): creds is UserApiCredentials => {
    return creds && 
           typeof creds.key === 'string' && creds.key.length > 0 &&
           typeof creds.secret === 'string' && creds.secret.length > 0 &&
           typeof creds.passphrase === 'string' && creds.passphrase.length > 0;
  };

  const loadStoredSession = useCallback((): StoredSession | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRADING_SESSION);
      if (!stored) return null;
      const parsed: StoredSession = JSON.parse(stored);
      // Sessions valid for 30 days
      const maxAge = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > maxAge) {
        localStorage.removeItem(STORAGE_KEYS.TRADING_SESSION);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const saveSession = useCallback((data: StoredSession) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.TRADING_SESSION, JSON.stringify(data));
  }, []);

  const getPrivySigner = useCallback(async (): Promise<ethers.Signer | null> => {
    if (!wallets || wallets.length === 0) return null;
    try {
      const ethereumProvider = await wallets[0].getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider);
      return provider.getSigner();
    } catch (err) {
      console.error('❌ Failed to get signer:', err);
      return null;
    }
  }, [wallets]);

  const checkSafeDeployed = useCallback(async (safeAddress: string): Promise<boolean> => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
      const code = await provider.getCode(safeAddress);
      return code !== '0x' && code.length > 2;
    } catch {
      return false;
    }
  }, []);

  const checkApprovalsOnChain = useCallback(async (safeAddress: string): Promise<boolean> => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
      const MIN_APPROVAL = ethers.utils.parseUnits('1000000', 6);
      
      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const spenders = [CTF_ADDRESS, CTF_EXCHANGE, NEG_RISK_CTF_EXCHANGE, NEG_RISK_ADAPTER];
      
      for (const spender of spenders) {
        const allowance = await usdcContract.allowance(safeAddress, spender);
        if (allowance.lt(MIN_APPROVAL)) return false;
      }
      
      const ctfContract = new ethers.Contract(CTF_ADDRESS, ERC1155_ABI, provider);
      const operators = [CTF_EXCHANGE, NEG_RISK_CTF_EXCHANGE, NEG_RISK_ADAPTER];
      
      for (const operator of operators) {
        const isApproved = await ctfContract.isApprovedForAll(safeAddress, operator);
        if (!isApproved) return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }, []);

  const checkUsdcBalances = useCallback(async (safeAddress: string) => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
      const nativeContract = new ethers.Contract(USDC_NATIVE_ADDRESS, ERC20_ABI, provider);
      const bridgedContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const [native, bridged] = await Promise.all([
        nativeContract.balanceOf(safeAddress),
        bridgedContract.balanceOf(safeAddress),
      ]);
      return { native, bridged };
    } catch {
      return { native: ethers.BigNumber.from(0), bridged: ethers.BigNumber.from(0) };
    }
  }, []);

  /**
   * AUTO-RESTORE: Restore session from cache WITHOUT any signatures
   */
  useEffect(() => {
    const tryAutoRestore = async () => {
      if (!authenticated || !walletsReady || wallets.length === 0) return;
      if (session || isInitializing || autoRestoreAttemptedRef.current) return;
      
      autoRestoreAttemptedRef.current = true;

      const storedSession = loadStoredSession();
      if (!storedSession) return;

      const eoaAddress = wallets[0].address;
      if (storedSession.eoaAddress.toLowerCase() !== eoaAddress.toLowerCase()) return;

      // Have cached credentials? That's all we need to restore!
      if (isValidCredentials(storedSession.credentials)) {
        console.log('🔄 Auto-restoring session from cache...');
        
        const contractConfig = getContractConfig(POLYGON_CHAIN_ID);
        const safeAddress = deriveSafe(eoaAddress, contractConfig.SafeContracts.SafeFactory);
        
        // Check on-chain status (no signatures needed)
        const [isSafeDeployed, hasApprovals] = await Promise.all([
          checkSafeDeployed(safeAddress),
          checkApprovalsOnChain(safeAddress),
        ]);

        // Set credentials ref for use by ClobClient
        credentialsRef.current = storedSession.credentials;
        
        // Set session - even if approvals aren't set, we have credentials!
        setSession({
          eoaAddress,
          safeAddress,
          isSafeDeployed,
          hasCredentials: true,
          hasApprovals,
          isReady: isSafeDeployed && hasApprovals,
        });
        
        if (isSafeDeployed && hasApprovals) {
          setCurrentStep('ready');
          console.log('✅ Session fully restored! Only order signatures needed.');
        } else {
          // Need to complete setup but credentials are cached
          console.log('⚠️ Session partially restored. Safe/approvals need setup.');
        }
      }
    };

    tryAutoRestore();
  }, [authenticated, walletsReady, wallets, session, isInitializing, loadStoredSession, checkSafeDeployed, checkApprovalsOnChain]);

  /**
   * Get or create ClobClient (lazy, no signature if credentials cached)
   */
  const getClobClient = useCallback(async (): Promise<ClobClient | null> => {
    if (clobClientRef.current) return clobClientRef.current;
    if (!session || !credentialsRef.current) return null;

    try {
      const signer = await getPrivySigner();
      if (!signer) return null;
      signerRef.current = signer;

      if (!builderConfigRef.current) {
        builderConfigRef.current = new BuilderConfig({
          remoteBuilderConfig: { url: getBuilderSignUrl() },
        });
      }

      const client = new ClobClient(
        CLOB_API_URL,
        POLYGON_CHAIN_ID,
        signer as any,
        credentialsRef.current,
        SIGNATURE_TYPES.BROWSER,
        session.safeAddress,
        undefined,
        false,
        builderConfigRef.current
      );

      clobClientRef.current = client;
      return client;
    } catch (err) {
      console.error('Failed to create ClobClient:', err);
      return null;
    }
  }, [session, getPrivySigner]);

  /**
   * Get RelayClient for on-chain operations
   */
  const getRelayClient = useCallback(async (): Promise<RelayClient | null> => {
    if (relayClientRef.current) return relayClientRef.current;
    if (!wallets || wallets.length === 0) return null;

    try {
      if (!builderConfigRef.current) {
        builderConfigRef.current = new BuilderConfig({
          remoteBuilderConfig: { url: getBuilderSignUrl() },
        });
      }

      const ethereumProvider = await wallets[0].getEthereumProvider();
      const { createWalletClient, custom } = await import('viem');
      const { polygon } = await import('viem/chains');
      
      const walletClient = createWalletClient({
        chain: polygon,
        transport: custom(ethereumProvider),
      });

      const relayClient = new RelayClient(
        RELAYER_URL,
        POLYGON_CHAIN_ID,
        walletClient as any,
        builderConfigRef.current
      );

      relayClientRef.current = relayClient;
      return relayClient;
    } catch (err) {
      console.error('Failed to create RelayClient:', err);
      return null;
    }
  }, [wallets]);

  /**
   * Initialize session - called when user clicks "Start Trading"
   */
  const initializeSession = useCallback(async () => {
    if (isInitializing) return;
    if (!authenticated || !walletsReady || wallets.length === 0) {
      setError('Wallet not connected');
      return;
    }

    // Already fully ready?
    if (session?.isReady) {
      console.log('✅ Session already ready');
      return;
    }

    setIsInitializing(true);
    setError(null);
    setCurrentStep('initializing');

    try {
      const signer = await getPrivySigner();
      if (!signer) throw new Error('Failed to get wallet signer');
      signerRef.current = signer;

      const eoaAddress = await signer.getAddress();
      const contractConfig = getContractConfig(POLYGON_CHAIN_ID);
      const safeAddress = deriveSafe(eoaAddress, contractConfig.SafeContracts.SafeFactory);

      console.log('📍 EOA:', eoaAddress);
      console.log('📍 Safe:', safeAddress);

      // === STEP 1: Get credentials (possibly from cache - NO SIGNATURE) ===
      let credentials = credentialsRef.current;
      
      if (!credentials) {
        const storedSession = loadStoredSession();
        if (storedSession && isValidCredentials(storedSession.credentials) &&
            storedSession.eoaAddress.toLowerCase() === eoaAddress.toLowerCase()) {
          credentials = storedSession.credentials;
          console.log('✅ Using cached credentials');
        }
      }

      // Need to derive credentials - THIS REQUIRES ONE SIGNATURE
      if (!credentials) {
        setCurrentStep('deriving_credentials');
        console.log('🔑 Deriving credentials (requires signature)...');
        
        const tempClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any);
        
        try {
          const derivedCreds = await tempClient.deriveApiKey();
          if (isValidCredentials(derivedCreds)) {
            credentials = derivedCreds as UserApiCredentials;
          }
        } catch {
          const newCreds = await tempClient.createApiKey();
          if (isValidCredentials(newCreds)) {
            credentials = newCreds as UserApiCredentials;
          }
        }
      }

      if (!credentials) throw new Error('Failed to obtain credentials');
      credentialsRef.current = credentials;

      // === STEP 2: Check Safe deployment (no signature) ===
      setCurrentStep('deploying_safe');
      let isSafeDeployed = await checkSafeDeployed(safeAddress);

      // Deploy Safe if needed - uses builder, no user signature required
      if (!isSafeDeployed) {
        console.log('🚀 Deploying Safe (no signature needed)...');
        const relayClient = await getRelayClient();
        if (relayClient) {
          try {
            const deployResponse = await relayClient.deploy();
            await deployResponse.wait();
            isSafeDeployed = true;
            console.log('✅ Safe deployed');
          } catch (err: any) {
            if (err.message?.includes('already')) {
              isSafeDeployed = true;
            } else {
              console.warn('Safe deploy warning:', err.message);
              isSafeDeployed = await checkSafeDeployed(safeAddress);
            }
          }
        }
      }

      // === STEP 3: Check/Set approvals (no user signature - builder handles it) ===
      setCurrentStep('checking_approvals');
      let approvalsSet = await checkApprovalsOnChain(safeAddress);

      if (!approvalsSet && isSafeDeployed) {
        setCurrentStep('setting_approvals');
        console.log('📝 Setting approvals (no signature needed)...');
        
        const relayClient = await getRelayClient();
        if (relayClient) {
          const MAX_UINT256 = ethers.constants.MaxUint256;
          const erc20Interface = new ethers.utils.Interface(ERC20_ABI);
          const erc1155Interface = new ethers.utils.Interface(ERC1155_ABI);

          const transactions = [];
          
          for (const spender of [CTF_ADDRESS, CTF_EXCHANGE, NEG_RISK_CTF_EXCHANGE, NEG_RISK_ADAPTER]) {
            transactions.push({
              to: USDC_ADDRESS,
              value: '0',
              data: erc20Interface.encodeFunctionData('approve', [spender, MAX_UINT256]),
              operation: 0,
            });
          }
          
          for (const operator of [CTF_EXCHANGE, NEG_RISK_CTF_EXCHANGE, NEG_RISK_ADAPTER]) {
            transactions.push({
              to: CTF_ADDRESS,
              value: '0',
              data: erc1155Interface.encodeFunctionData('setApprovalForAll', [operator, true]),
              operation: 0,
            });
          }

          try {
            const approvalResponse = await relayClient.execute(transactions, safeAddress);
            await approvalResponse.wait();
            approvalsSet = true;
            console.log('✅ Approvals set');
          } catch (err: any) {
            console.warn('Approval warning:', err.message);
            approvalsSet = await checkApprovalsOnChain(safeAddress);
          }
        }
      }

      // === Save session ===
      saveSession({
        eoaAddress,
        safeAddress,
        credentials,
        approvalsSet,
        safeDeployed: isSafeDeployed,
        timestamp: Date.now(),
      });

      setSession({
        eoaAddress,
        safeAddress,
        isSafeDeployed,
        hasCredentials: true,
        hasApprovals: approvalsSet,
        isReady: isSafeDeployed && approvalsSet,
      });
      
      setCurrentStep('ready');
      console.log('🎉 Session ready!');

    } catch (err: any) {
      console.error('❌ Session init failed:', err);
      setError(err.message || 'Failed to initialize');
      setCurrentStep('error');
    } finally {
      setIsInitializing(false);
    }
  }, [
    authenticated, walletsReady, wallets, isInitializing, session,
    getPrivySigner, loadStoredSession, saveSession,
    checkSafeDeployed, checkApprovalsOnChain, getRelayClient
  ]);

  const ensureUsdcBalance = useCallback(async (requiredAmount: ethers.BigNumber): Promise<boolean> => {
    if (!session) return false;
    const { bridged } = await checkUsdcBalances(session.safeAddress);
    return bridged.gte(requiredAmount);
  }, [session, checkUsdcBalances]);

  const endSession = useCallback(() => {
    relayClientRef.current = null;
    clobClientRef.current = null;
    signerRef.current = null;
    setSession(null);
    setCurrentStep('idle');
    setError(null);
    // Keep credentials cached!
  }, []);

  const clearAllData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.TRADING_SESSION);
    }
    credentialsRef.current = null;
    autoRestoreAttemptedRef.current = false;
    endSession();
  }, [endSession]);

  const getStatusMessage = () => {
    switch (currentStep) {
      case 'connecting': return '🔗 Connecting...';
      case 'initializing': return '⚙️ Initializing...';
      case 'deploying_safe': return '🏦 Setting up wallet...';
      case 'deriving_credentials': return '🔑 Setting up trading (sign once)...';
      case 'checking_approvals': return '✅ Checking permissions...';
      case 'setting_approvals': return '📝 Setting permissions...';
      case 'ready': return '🎉 Ready to trade!';
      case 'error': return `❌ ${error}`;
      default: return '';
    }
  };

  return {
    session,
    currentStep,
    error,
    isInitializing,
    isReady: session?.isReady ?? false,
    isSessionActive: session !== null,
    statusMessage: getStatusMessage(),

    initializeSession,
    endSession,
    clearAllData,
    ensureUsdcBalance,

    getClobClient,
    getRelayClient,
    getCredentials: () => credentialsRef.current,
  };
};
