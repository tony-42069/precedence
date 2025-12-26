/**
 * usePolymarketSession Hook - OPTIMIZED
 * 
 * Key optimizations to reduce signature popups:
 * 1. Credentials are derived ONCE and cached permanently
 * 2. Approvals are checked on-chain before setting (no redundant txs)
 * 3. Safe deployment is checked and cached
 * 4. Auto-swap native USDC to USDC.e if needed
 * 
 * GOAL: User should only sign ONCE per trade (the order itself)
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
  UNISWAP_SWAP_ROUTER,
  USDC_SWAP_FEE,
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

export type SessionStep = 
  | 'idle'
  | 'connecting'
  | 'initializing'
  | 'deploying_safe'
  | 'deriving_credentials'
  | 'checking_approvals'
  | 'setting_approvals'
  | 'checking_usdc'
  | 'swapping_usdc'
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

// ERC20 ABI for balance and allowance checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

// ERC1155 ABI for approval checks
const ERC1155_ABI = [
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
];

// Uniswap V3 SwapRouter ABI (minimal)
const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
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
  const providerRef = useRef<ethers.providers.Provider | null>(null);

  /**
   * Get ethers signer from Privy wallet
   */
  const getPrivySigner = useCallback(async (): Promise<ethers.Signer | null> => {
    if (!wallets || wallets.length === 0) return null;

    try {
      const ethereumProvider = await wallets[0].getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider);
      providerRef.current = provider;
      return provider.getSigner();
    } catch (err) {
      console.error('❌ Failed to get signer:', err);
      return null;
    }
  }, [wallets]);

  const createBuilderConfig = useCallback(() => {
    return new BuilderConfig({
      remoteBuilderConfig: { url: getBuilderSignUrl() },
    });
  }, []);

  /**
   * Load stored session - includes credentials cache
   */
  const loadStoredSession = useCallback((): StoredSession | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRADING_SESSION);
      if (!stored) return null;
      
      const parsed: StoredSession = JSON.parse(stored);
      
      // Sessions are valid for 7 days (credentials don't expire)
      const maxAge = 7 * 24 * 60 * 60 * 1000;
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

  const isValidCredentials = (creds: any): creds is UserApiCredentials => {
    return creds && 
           typeof creds.key === 'string' && creds.key.length > 0 &&
           typeof creds.secret === 'string' && creds.secret.length > 0 &&
           typeof creds.passphrase === 'string' && creds.passphrase.length > 0;
  };

  /**
   * Check if Safe is deployed
   */
  const checkSafeDeployed = useCallback(async (safeAddress: string): Promise<boolean> => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
      const code = await provider.getCode(safeAddress);
      return code !== '0x' && code.length > 2;
    } catch {
      return false;
    }
  }, []);

  /**
   * Check if all approvals are set on-chain
   * Returns true if ALL approvals are already done (no signature needed)
   */
  const checkApprovalsOnChain = useCallback(async (safeAddress: string): Promise<boolean> => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
      const MAX_UINT = ethers.constants.MaxUint256;
      const MIN_APPROVAL = ethers.utils.parseUnits('1000000', 6); // 1M USDC threshold
      
      // Check USDC.e approvals
      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const spenders = [CTF_ADDRESS, CTF_EXCHANGE, NEG_RISK_CTF_EXCHANGE, NEG_RISK_ADAPTER];
      
      for (const spender of spenders) {
        const allowance = await usdcContract.allowance(safeAddress, spender);
        if (allowance.lt(MIN_APPROVAL)) {
          console.log(`⚠️ USDC.e allowance for ${spender} is low:`, allowance.toString());
          return false;
        }
      }
      
      // Check CTF (ERC1155) approvals
      const ctfContract = new ethers.Contract(CTF_ADDRESS, ERC1155_ABI, provider);
      const operators = [CTF_EXCHANGE, NEG_RISK_CTF_EXCHANGE, NEG_RISK_ADAPTER];
      
      for (const operator of operators) {
        const isApproved = await ctfContract.isApprovedForAll(safeAddress, operator);
        if (!isApproved) {
          console.log(`⚠️ CTF not approved for ${operator}`);
          return false;
        }
      }
      
      console.log('✅ All approvals already set on-chain');
      return true;
    } catch (err) {
      console.error('Error checking approvals:', err);
      return false;
    }
  }, []);

  /**
   * Check USDC balances (both native and bridged)
   */
  const checkUsdcBalances = useCallback(async (safeAddress: string): Promise<{native: ethers.BigNumber, bridged: ethers.BigNumber}> => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
      
      const nativeContract = new ethers.Contract(USDC_NATIVE_ADDRESS, ERC20_ABI, provider);
      const bridgedContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
      
      const [native, bridged] = await Promise.all([
        nativeContract.balanceOf(safeAddress),
        bridgedContract.balanceOf(safeAddress),
      ]);
      
      console.log('💰 USDC Balances:', {
        native: ethers.utils.formatUnits(native, 6),
        bridged: ethers.utils.formatUnits(bridged, 6),
      });
      
      return { native, bridged };
    } catch (err) {
      console.error('Error checking USDC balances:', err);
      return { native: ethers.BigNumber.from(0), bridged: ethers.BigNumber.from(0) };
    }
  }, []);

  /**
   * Create swap transaction for native USDC -> USDC.e
   * Uses Uniswap V3
   */
  const createSwapTransaction = useCallback((amount: ethers.BigNumber, safeAddress: string) => {
    const swapRouterInterface = new ethers.utils.Interface(SWAP_ROUTER_ABI);
    
    // Swap parameters
    const params = {
      tokenIn: USDC_NATIVE_ADDRESS,
      tokenOut: USDC_ADDRESS,
      fee: USDC_SWAP_FEE,
      recipient: safeAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
      amountIn: amount,
      amountOutMinimum: amount.mul(99).div(100), // 1% slippage max (stablecoins)
      sqrtPriceLimitX96: 0,
    };
    
    return {
      to: UNISWAP_SWAP_ROUTER,
      value: '0',
      data: swapRouterInterface.encodeFunctionData('exactInputSingle', [params]),
      operation: 0,
    };
  }, []);

  /**
   * Create approval transaction for native USDC to SwapRouter
   */
  const createNativeUsdcApproval = useCallback((amount: ethers.BigNumber) => {
    const erc20Interface = new ethers.utils.Interface(ERC20_ABI);
    return {
      to: USDC_NATIVE_ADDRESS,
      value: '0',
      data: erc20Interface.encodeFunctionData('approve', [UNISWAP_SWAP_ROUTER, amount]),
      operation: 0,
    };
  }, []);

  /**
   * Create all approval transactions for Polymarket
   */
  const createApprovalTransactions = useCallback(() => {
    const MAX_UINT256 = ethers.constants.MaxUint256;
    
    const erc20Interface = new ethers.utils.Interface(ERC20_ABI);
    const erc1155Interface = new ethers.utils.Interface(ERC1155_ABI);

    const transactions = [];

    // USDC.e approvals
    const usdcSpenders = [CTF_ADDRESS, CTF_EXCHANGE, NEG_RISK_CTF_EXCHANGE, NEG_RISK_ADAPTER];
    for (const spender of usdcSpenders) {
      transactions.push({
        to: USDC_ADDRESS,
        value: '0',
        data: erc20Interface.encodeFunctionData('approve', [spender, MAX_UINT256]),
        operation: 0,
      });
    }

    // CTF approvals
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
  }, []);

  /**
   * Initialize session - OPTIMIZED to minimize signatures
   */
  const initializeSession = useCallback(async () => {
    if (isInitializing) return;
    if (!authenticated || !walletsReady || wallets.length === 0) {
      setError('Wallet not connected');
      return;
    }

    setIsInitializing(true);
    setError(null);
    setCurrentStep('initializing');

    try {
      // Get signer
      const signer = await getPrivySigner();
      if (!signer) throw new Error('Failed to get wallet signer');
      signerRef.current = signer;

      const eoaAddress = await signer.getAddress();
      console.log('📍 EOA Address:', eoaAddress);

      // Derive Safe address
      const contractConfig = getContractConfig(POLYGON_CHAIN_ID);
      const safeAddress = deriveSafe(eoaAddress, contractConfig.SafeContracts.SafeFactory);
      console.log('📍 Safe Address:', safeAddress);

      // Load stored session
      const storedSession = loadStoredSession();
      const isReturningUser = storedSession && 
        storedSession.eoaAddress.toLowerCase() === eoaAddress.toLowerCase();

      // === STEP 1: Check/Deploy Safe ===
      setCurrentStep('deploying_safe');
      let isSafeDeployed = isReturningUser && storedSession.safeDeployed;
      
      if (!isSafeDeployed) {
        isSafeDeployed = await checkSafeDeployed(safeAddress);
      }

      // Create RelayClient
      const builderConfig = createBuilderConfig();
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
        builderConfig
      );
      relayClientRef.current = relayClient;

      if (!isSafeDeployed) {
        console.log('🚀 Deploying Safe...');
        try {
          const deployResponse = await relayClient.deploy();
          await deployResponse.wait();
          isSafeDeployed = true;
          console.log('✅ Safe deployed');
        } catch (err: any) {
          if (err.message?.includes('already deployed') || err.message?.includes('already exists')) {
            isSafeDeployed = true;
          } else {
            throw err;
          }
        }
      } else {
        console.log('✅ Safe already deployed (cached)');
      }

      // === STEP 2: Get/Cache Credentials ===
      setCurrentStep('deriving_credentials');
      let credentials: UserApiCredentials | null = null;

      // TRY TO USE CACHED CREDENTIALS FIRST - NO SIGNATURE NEEDED
      if (isReturningUser && isValidCredentials(storedSession.credentials)) {
        credentials = storedSession.credentials;
        console.log('✅ Using cached credentials (no signature needed)');
      } else {
        // Need to derive credentials - requires ONE signature
        console.log('🔑 Deriving credentials (requires signature)...');
        
        const tempClient = new ClobClient(
          CLOB_API_URL,
          POLYGON_CHAIN_ID,
          signer as any
        );

        try {
          const derivedCreds = await tempClient.deriveApiKey();
          if (isValidCredentials(derivedCreds)) {
            credentials = derivedCreds as UserApiCredentials;
            console.log('✅ Derived credentials');
          } else {
            throw new Error('Invalid credentials');
          }
        } catch {
          console.log('⚠️ Creating new credentials...');
          const newCreds = await tempClient.createApiKey();
          if (isValidCredentials(newCreds)) {
            credentials = newCreds as UserApiCredentials;
            console.log('✅ Created new credentials');
          } else {
            throw new Error('Failed to create credentials');
          }
        }
      }

      if (!credentials) throw new Error('Failed to obtain credentials');
      credentialsRef.current = credentials;

      // === STEP 3: Check/Set Approvals ===
      setCurrentStep('checking_approvals');
      let approvalsSet = isReturningUser && storedSession.approvalsSet;
      
      if (!approvalsSet) {
        // Check on-chain if approvals are already set
        approvalsSet = await checkApprovalsOnChain(safeAddress);
      }

      if (!approvalsSet) {
        setCurrentStep('setting_approvals');
        console.log('📝 Setting token approvals...');
        
        const approvalTxs = createApprovalTransactions();
        try {
          const approvalResponse = await relayClient.execute(approvalTxs, safeAddress);
          await approvalResponse.wait();
          approvalsSet = true;
          console.log('✅ Approvals set');
        } catch (err: any) {
          console.log('⚠️ Approval error (may already be set):', err.message);
          // Check again - they might be set
          approvalsSet = await checkApprovalsOnChain(safeAddress);
        }
      } else {
        console.log('✅ Approvals already set (cached/on-chain)');
      }

      // === STEP 4: Check/Swap USDC ===
      setCurrentStep('checking_usdc');
      const { native, bridged } = await checkUsdcBalances(safeAddress);
      
      // If user has native USDC but no/low USDC.e, auto-swap
      const MIN_SWAP_AMOUNT = ethers.utils.parseUnits('0.5', 6); // $0.50 minimum
      if (native.gt(MIN_SWAP_AMOUNT) && bridged.lt(MIN_SWAP_AMOUNT)) {
        setCurrentStep('swapping_usdc');
        console.log('🔄 Auto-swapping native USDC to USDC.e...');
        
        try {
          const swapTxs = [
            createNativeUsdcApproval(native),
            createSwapTransaction(native, safeAddress),
          ];
          
          const swapResponse = await relayClient.execute(swapTxs, safeAddress);
          await swapResponse.wait();
          console.log('✅ USDC swapped successfully');
        } catch (err: any) {
          console.error('⚠️ USDC swap failed:', err.message);
          // Don't fail the whole session - user might add USDC.e manually
        }
      }

      // === STEP 5: Create Authenticated ClobClient ===
      const authenticatedClient = new ClobClient(
        CLOB_API_URL,
        POLYGON_CHAIN_ID,
        signer as any,
        credentials,
        SIGNATURE_TYPES.BROWSER,
        safeAddress,
        undefined,
        false,
        builderConfig
      );
      clobClientRef.current = authenticatedClient;

      // === SAVE SESSION ===
      const newSession: TradingSession = {
        eoaAddress,
        safeAddress,
        isSafeDeployed: true,
        hasCredentials: true,
        hasApprovals: approvalsSet,
        isReady: true,
      };

      saveSession({
        eoaAddress,
        safeAddress,
        credentials,
        approvalsSet,
        safeDeployed: true,
        timestamp: Date.now(),
      });

      setSession(newSession);
      setCurrentStep('ready');
      console.log('🎉 Session ready! Future trades need only 1 signature (the order)');

    } catch (err: any) {
      console.error('❌ Session init failed:', err);
      setError(err.message || 'Failed to initialize');
      setCurrentStep('error');
    } finally {
      setIsInitializing(false);
    }
  }, [
    authenticated, walletsReady, wallets, isInitializing,
    getPrivySigner, createBuilderConfig, loadStoredSession, saveSession,
    checkSafeDeployed, checkApprovalsOnChain, checkUsdcBalances,
    createApprovalTransactions, createSwapTransaction, createNativeUsdcApproval
  ]);

  /**
   * Ensure USDC.e balance before trade
   * Auto-swaps native USDC if needed
   */
  const ensureUsdcBalance = useCallback(async (requiredAmount: ethers.BigNumber): Promise<boolean> => {
    if (!session || !relayClientRef.current) return false;
    
    const { native, bridged } = await checkUsdcBalances(session.safeAddress);
    
    // If we have enough USDC.e, we're good
    if (bridged.gte(requiredAmount)) return true;
    
    // If we have native USDC, swap it
    if (native.gt(0)) {
      console.log('🔄 Need more USDC.e, swapping native USDC...');
      try {
        const swapTxs = [
          createNativeUsdcApproval(native),
          createSwapTransaction(native, session.safeAddress),
        ];
        
        const swapResponse = await relayClientRef.current.execute(swapTxs, session.safeAddress);
        await swapResponse.wait();
        
        // Check balance again
        const { bridged: newBridged } = await checkUsdcBalances(session.safeAddress);
        return newBridged.gte(requiredAmount);
      } catch (err) {
        console.error('Swap failed:', err);
        return false;
      }
    }
    
    return false;
  }, [session, checkUsdcBalances, createNativeUsdcApproval, createSwapTransaction]);

  const endSession = useCallback(() => {
    relayClientRef.current = null;
    clobClientRef.current = null;
    signerRef.current = null;
    credentialsRef.current = null;
    
    setSession(null);
    setCurrentStep('idle');
    setError(null);
    
    // Don't clear credentials - keep them for next time!
    // Only clear if user explicitly logs out
  }, []);

  const clearAllData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.TRADING_SESSION);
    }
    endSession();
  }, [endSession]);

  const getClobClient = useCallback(() => clobClientRef.current, []);
  const getRelayClient = useCallback(() => relayClientRef.current, []);
  const getCredentials = useCallback(() => credentialsRef.current, []);

  const isReady = session?.isReady ?? false;
  const isSessionActive = session !== null;

  const getStatusMessage = () => {
    switch (currentStep) {
      case 'connecting': return '🔗 Connecting...';
      case 'initializing': return '⚙️ Initializing...';
      case 'deploying_safe': return '🏦 Setting up wallet...';
      case 'deriving_credentials': return '🔑 Setting up trading...';
      case 'checking_approvals': return '✅ Checking permissions...';
      case 'setting_approvals': return '📝 Setting permissions...';
      case 'checking_usdc': return '💰 Checking balance...';
      case 'swapping_usdc': return '🔄 Converting USDC...';
      case 'ready': return '🎉 Ready!';
      case 'error': return `❌ ${error}`;
      default: return '';
    }
  };

  return {
    session,
    currentStep,
    error,
    isInitializing,
    isReady,
    isSessionActive,
    statusMessage: getStatusMessage(),

    initializeSession,
    endSession,
    clearAllData,
    ensureUsdcBalance,

    getClobClient,
    getRelayClient,
    getCredentials,
  };
};
