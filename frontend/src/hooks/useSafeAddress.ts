/**
 * useSafeAddress Hook
 * 
 * Derives the Safe wallet address from an EOA address.
 * Also fetches USDC balance (BOTH native and bridged combined).
 * Also fetches positions from Polymarket for the Safe address.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { getContractConfig } from '@polymarket/builder-relayer-client/dist/config';
import { deriveSafe } from '@polymarket/builder-relayer-client/dist/builder/derive';
import { ethers } from 'ethers';
import { POLYGON_CHAIN_ID } from '../constants/polymarket';

// USDC addresses on Polygon
const USDC_BRIDGED = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const USDC_NATIVE = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const POLYGON_RPC_URL = 'https://polygon-rpc.com';

// Polymarket APIs
const GAMMA_API_URL = 'https://gamma-api.polymarket.com';
const CLOB_API_URL = 'https://clob.polymarket.com';
const DATA_API_URL = 'https://data-api.polymarket.com'; // CORRECT endpoint for positions!

interface SafeAddressState {
  eoaAddress: string | null;
  safeAddress: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UsdcBalances {
  native: string;
  bridged: string;
  total: string;
}

// Polymarket position type
export interface PolymarketPosition {
  asset: string;
  conditionId: string;
  size: string;
  avgPrice: string;
  currentPrice?: number;
  marketSlug?: string;
  marketQuestion?: string;
  outcome?: string;
  pnl?: number;
  market_id?: string; // NUMERIC ID for proper linking
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
  
  // Positions from Polymarket
  const [positions, setPositions] = useState<PolymarketPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);

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

  /**
   * Fetch positions from Polymarket Data API for Safe address
   * NOTE: Data API is the CORRECT endpoint, not Gamma API!
   * See: https://docs.polymarket.com/developers/misc-endpoints/data-api-get-positions
   * 
   * IMPORTANT: There's typically a 1-5 minute indexing delay after trades!
   */
  const fetchPositions = useCallback(async (safeAddr: string) => {
    if (!safeAddr) {
      setPositions([]);
      return;
    }

    setPositionsLoading(true);
    try {
      // Use Data API - the correct endpoint for user positions
      // Include sizeThreshold=0 to show ALL positions including small ones
      const url = `${DATA_API_URL}/positions?user=${safeAddr.toLowerCase()}&sizeThreshold=0&limit=100`;
      console.log('📊 Fetching positions from Data API:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('Data API positions returned:', response.status);
        // Try CLOB API as fallback for open orders
        try {
          const clobUrl = `${CLOB_API_URL}/openorders?owner=${safeAddr.toLowerCase()}`;
          console.log('📊 Trying CLOB API fallback:', clobUrl);
          const clobResponse = await fetch(clobUrl);
          if (clobResponse.ok) {
            const clobData = await clobResponse.json();
            console.log('📊 CLOB open orders:', clobData);
          }
        } catch (clobErr) {
          console.warn('CLOB fallback failed:', clobErr);
        }
        setPositions([]);
        return;
      }
      
      const data = await response.json();
      console.log('📊 Polymarket positions from Data API:', data);
      
      // Data API returns an array directly
      if (Array.isArray(data)) {
        // Map the Data API response to our internal format
        // IMPORTANT: Also look up numeric market ID for proper linking
        const mappedPositions: PolymarketPosition[] = await Promise.all(
          data.map(async (pos: any) => {
            // Try to get numeric market ID from slug via Gamma API
            let marketId: string | undefined = undefined;
            if (pos.slug) {
              try {
                const eventResponse = await fetch(`${GAMMA_API_URL}/events?slug=${pos.slug}`);
                if (eventResponse.ok) {
                  const events = await eventResponse.json();
                  if (events && events.length > 0) {
                    marketId = events[0].id;
                    console.log(`📊 Resolved slug "${pos.slug}" to market ID: ${marketId}`);
                  }
                }
              } catch (lookupErr) {
                console.warn(`Failed to lookup market ID for slug ${pos.slug}:`, lookupErr);
              }
            }
            
            return {
              asset: pos.asset,
              conditionId: pos.conditionId,
              size: pos.size?.toString() || '0',
              avgPrice: pos.avgPrice?.toString() || '0',
              currentPrice: pos.curPrice,
              marketSlug: pos.slug,
              marketQuestion: pos.title,
              outcome: pos.outcome,
              pnl: pos.cashPnl,
              market_id: marketId, // NUMERIC ID for proper linking!
            };
          })
        );
        setPositions(mappedPositions);
        console.log(`📊 Found ${mappedPositions.length} positions`);
      } else if (data && typeof data === 'object') {
        // Sometimes the API returns {positions: [...]} format
        const positionsArray = data.positions || data.data || [];
        if (Array.isArray(positionsArray)) {
          // Same lookup logic as above
          const mappedPositions: PolymarketPosition[] = await Promise.all(
            positionsArray.map(async (pos: any) => {
              let marketId: string | undefined = undefined;
              if (pos.slug) {
                try {
                  const eventResponse = await fetch(`${GAMMA_API_URL}/events?slug=${pos.slug}`);
                  if (eventResponse.ok) {
                    const events = await eventResponse.json();
                    if (events && events.length > 0) {
                      marketId = events[0].id;
                    }
                  }
                } catch (lookupErr) {
                  console.warn(`Failed to lookup market ID for slug ${pos.slug}:`, lookupErr);
                }
              }
              
              return {
                asset: pos.asset,
                conditionId: pos.conditionId,
                size: pos.size?.toString() || '0',
                avgPrice: pos.avgPrice?.toString() || '0',
                currentPrice: pos.curPrice,
                marketSlug: pos.slug,
                marketQuestion: pos.title,
                outcome: pos.outcome,
                pnl: pos.cashPnl,
                market_id: marketId,
              };
            })
          );
          setPositions(mappedPositions);
          console.log(`📊 Found ${mappedPositions.length} positions (from nested format)`);
        } else {
          console.warn('📊 Data API returned unexpected nested format');
          setPositions([]);
        }
      } else {
        console.warn('📊 Data API returned unexpected format:', typeof data);
        setPositions([]);
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err);
      setPositions([]);
    } finally {
      setPositionsLoading(false);
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
      fetchPositions(safeAddress); // Also fetch positions
    } else {
      setState({
        eoaAddress,
        safeAddress: null,
        isLoading: false,
        error: 'Failed to derive deposit address',
      });
    }
  }, [wallets, walletsReady, deriveSafeAddress, fetchBalance, fetchPositions]);

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

  const refreshPositions = useCallback(() => {
    if (state.safeAddress) {
      fetchPositions(state.safeAddress);
    }
  }, [state.safeAddress, fetchPositions]);

  return {
    eoaAddress: state.eoaAddress,
    safeAddress: state.safeAddress,
    depositAddress: state.safeAddress,
    signingAddress: state.eoaAddress,
    
    // Balance info
    balance,
    balances,
    balanceLoading,
    refreshBalance,
    
    // Positions from Polymarket
    positions,
    positionsLoading,
    refreshPositions,
    
    isLoading: state.isLoading,
    error: state.error,
    deriveForAddress,
  };
};
