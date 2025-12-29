/**
 * Trading Modal Component - OPTIMIZED
 * 
 * Key improvements:
 * 1. Session is initialized ONCE and cached - no repeat signature requests
 * 2. Auto-swaps native USDC to USDC.e if needed before trading
 * 3. Clear balance checking with helpful error messages
 * 4. Minimal user friction - ideally just ONE signature per trade
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { usePolymarketSession } from '../hooks/usePolymarketSession';
import { usePolymarketOrder } from '../hooks/usePolymarketOrder';
import { useGeoRestriction } from '../hooks/useGeoRestriction';
import { useSafeAddress } from '../hooks/useSafeAddress';
import { apiService } from '../services/api';
import { X, DollarSign, TrendingUp, TrendingDown, Cpu, Wallet, Settings2, Shield, Loader2, AlertTriangle, Globe, Info, ArrowUpCircle, ArrowDownCircle, Receipt, RefreshCw } from 'lucide-react';

interface TradingModalProps {
  market: any;
  isOpen: boolean;
  onClose: () => void;
  initialTradeType?: 'buy' | 'sell';
  initialOutcome?: 'yes' | 'no';
  userShares?: number;  // User's shares for the selected outcome (for selling)
}

interface MarketData {
  current_yes_price: number;
  current_no_price: number;
  best_bid: number;
  best_ask: number;
}

export const TradingModal = ({ market, isOpen, onClose, initialTradeType, initialOutcome, userShares = 0 }: TradingModalProps) => {
  const { authenticated, login } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  const { 
    isLoading: isGeoLoading, 
    isRestricted, 
    isUSUser,
    geoData,
    restrictionMessage 
  } = useGeoRestriction();

  const {
    session,
    currentStep,
    isReady,
    isInitializing,
    initializeSession,
    ensureUsdcBalance,
    getClobClient,
    statusMessage: sessionStatus,
  } = usePolymarketSession();

  const {
    placeOrder,
    isLoading: isOrderLoading,
    isSuccess: isOrderSuccess,
    isError: isOrderError,
    error: orderError,
    statusMessage: orderStatus,
    reset: resetOrder,
  } = usePolymarketOrder(getClobClient);

  // Get balance info
  const { balance, balances, balanceLoading, refreshBalance } = useSafeAddress();

  const [side, setSide] = useState<'YES' | 'NO'>('YES');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('');
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [marketData, setMarketData] = useState<MarketData>({
    current_yes_price: 0.5,
    current_no_price: 0.5,
    best_bid: 0.45,
    best_ask: 0.55,
  });

  const FEE_PERCENT = 1;
  const calculateFee = (tradeValue: number, type: 'BUY' | 'SELL') => {
    if (type !== 'SELL') {
      return { feeAmount: 0, netAmount: tradeValue, hasFee: false };
    }
    const feeAmount = tradeValue * (FEE_PERCENT / 100);
    const netAmount = tradeValue - feeAmount;
    return { feeAmount, netAmount, hasFee: true };
  };

  const marketType = useMemo(() => {
    if (!market?.id) return 'invalid';
    if (market.id?.toString().startsWith('demo') || market.id?.toString().startsWith('fallback')) {
      return 'demo';
    }
    if (market.id && (market.current_yes_price || market.outcomePrices)) {
      return 'real';
    }
    return 'unknown';
  }, [market]);

  // Load market data
  useEffect(() => {
    if (isOpen && market) {
      const loadMarketData = async () => {
        try {
          if (market.current_yes_price && market.current_no_price) {
            setMarketData({
              current_yes_price: market.current_yes_price,
              current_no_price: market.current_no_price,
              best_bid: market.current_yes_price * 0.95,
              best_ask: market.current_yes_price * 1.05,
            });
            return;
          }

          switch (marketType) {
            case 'demo':
              setMarketData({
                current_yes_price: market.current_yes_price || 0.045,
                current_no_price: market.current_no_price || 0.955,
                best_bid: (market.current_yes_price || 0.045) * 0.9,
                best_ask: (market.current_yes_price || 0.045) * 1.1,
              });
              break;

            case 'real':
              const data = await apiService.fetchMarketPrice(market.id);
              if (data.current_yes_price && data.current_no_price) {
                setMarketData({
                  current_yes_price: data.current_yes_price,
                  current_no_price: data.current_no_price,
                  best_bid: data.best_bid || data.current_yes_price * 0.95,
                  best_ask: data.best_ask || data.current_yes_price * 1.05,
                });
              }
              break;

            default:
              setMarketData({
                current_yes_price: 0.5,
                current_no_price: 0.5,
                best_bid: 0.45,
                best_ask: 0.55,
              });
          }
        } catch (error) {
          console.error('❌ Failed to load market data:', error);
          if (market?.current_yes_price) {
            setMarketData({
              current_yes_price: market.current_yes_price,
              current_no_price: market.current_no_price || (1 - market.current_yes_price),
              best_bid: market.current_yes_price * 0.9,
              best_ask: market.current_yes_price * 1.1,
            });
          }
        }
      };

      loadMarketData();
    }
  }, [isOpen, market, marketType]);

  // Initialize state when modal opens, reset when it closes
  useEffect(() => {
    if (isOpen) {
      // Initialize from props when modal opens
      setTradeType(initialTradeType === 'sell' ? 'SELL' : 'BUY');
      setSide(initialOutcome === 'no' ? 'NO' : 'YES');
      setAmount('');
      setBalanceError(null);
    } else {
      // Reset when modal closes
      resetOrder();
      setAmount('');
      setSide('YES');
      setTradeType('BUY');
      setBalanceError(null);
    }
  }, [isOpen, initialTradeType, initialOutcome, resetOrder]);

  // Check balance when amount changes
  useEffect(() => {
    const checkBalance = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        setBalanceError(null);
        return;
      }

      const tradeAmount = parseFloat(amount);

      // For SELL mode: check if user has enough SHARES to sell
      if (tradeType === 'SELL') {
        if (tradeAmount > userShares) {
          setBalanceError(`Insufficient shares. You have ${userShares.toFixed(2)} ${side} shares available.`);
        } else {
          setBalanceError(null);
        }
        return;
      }

      // For BUY mode: check USDC balance
      if (!balance) {
        setBalanceError(null);
        return;
      }

      const totalBalance = parseFloat(balance);
      const bridgedBalance = balances ? parseFloat(balances.bridged) : 0;
      const nativeBalance = balances ? parseFloat(balances.native) : 0;

      if (tradeAmount > totalBalance) {
        setBalanceError(`Insufficient balance. You have $${totalBalance.toFixed(2)} USDC total.`);
      } else if (tradeAmount > bridgedBalance && nativeBalance > 0) {
        // Has native USDC that needs swap
        setBalanceError(null); // We'll auto-swap
      } else if (tradeAmount > bridgedBalance) {
        setBalanceError(`Insufficient USDC.e balance. You have $${bridgedBalance.toFixed(2)} ready for trading.`);
      } else {
        setBalanceError(null);
      }
    };

    checkBalance();
  }, [amount, balance, balances, tradeType, userShares, side]);

  if (!isOpen) return null;

  const price = side === 'YES' ? marketData.current_yes_price : marketData.current_no_price;
  const tradeValue = parseFloat(amount || '0');
  const payout = tradeValue * (1 / price);
  const spread = ((marketData.best_ask - marketData.best_bid) * 100).toFixed(2);
  const feeInfo = calculateFee(tradeValue, tradeType);

  const getTokenId = (): string => {
    const possibleTokenFields = [
      market.clobTokenIds,
      market.clob_token_ids,
      market.tokenIds,
      market.token_ids,
      market.tokens,
    ];

    for (const rawTokens of possibleTokenFields) {
      if (!rawTokens) continue;

      let tokens: any[] | null = null;

      if (Array.isArray(rawTokens)) {
        tokens = rawTokens;
      } else if (typeof rawTokens === 'string') {
        try {
          const parsed = JSON.parse(rawTokens);
          if (Array.isArray(parsed)) tokens = parsed;
        } catch {
          continue;
        }
      }

      if (!tokens || tokens.length < 2) continue;

      if (typeof tokens[0] === 'string') {
        return side === 'YES' ? tokens[0] : tokens[1];
      }
      
      if (typeof tokens[0] === 'object' && tokens[0] !== null && 'token_id' in tokens[0]) {
        const tokenId = side === 'YES' ? tokens[0].token_id : tokens[1]?.token_id;
        if (tokenId) return tokenId;
      }
    }

    console.error('❌ Could not find token ID');
    return '';
  };

  // Handle trade - streamlined flow
  const handleTrade = async () => {
    // Step 1: Check authentication
    if (!authenticated) {
      login();
      return;
    }

    // Step 2: Initialize session if needed (one-time, cached after)
    if (!isReady) {
      await initializeSession();
      return;
    }

    // Step 3: Validate input
    if (!amount || parseFloat(amount) <= 0) {
      setBalanceError('Please enter a valid amount');
      return;
    }

    const tokenId = getTokenId();
    if (!tokenId) {
      setBalanceError('Invalid market - cannot trade');
      return;
    }

    // Step 4: Check balance and auto-swap if needed (BUY mode only)
    setIsCheckingBalance(true);
    setBalanceError(null);

    try {
      // For SELL mode: verify user has enough shares (already checked in useEffect, but double-check)
      if (tradeType === 'SELL') {
        if (parseFloat(amount) > userShares) {
          setBalanceError(`Insufficient shares. You have ${userShares.toFixed(2)} ${side} shares available.`);
          setIsCheckingBalance(false);
          return;
        }
      } else {
        // For BUY mode: check and auto-swap USDC if needed
        const requiredAmount = ethers.utils.parseUnits(amount, 6);
        const hasEnough = await ensureUsdcBalance(requiredAmount);

        if (!hasEnough) {
          setBalanceError('Insufficient USDC balance. Please deposit more funds.');
          setIsCheckingBalance(false);
          return;
        }
      }

      setIsCheckingBalance(false);

      // Step 5: Place order (this is the ONLY signature user should see)
      console.log('📤 Placing order...');
      const result = await placeOrder({
        tokenId,
        price,
        size: parseFloat(amount),
        side: tradeType,
        negRisk: market.negRisk || market.neg_risk || false,
      });

      if (result.success) {
        console.log('🎉 Trade successful!');
        
        // Record trade in backend database
        try {
          const walletAddress = session?.eoaAddress || wallets[0]?.address;
          if (walletAddress) {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://precedence-production.up.railway.app';
            const response = await fetch(`${API_BASE_URL}/api/users/${walletAddress}/trades`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                market_id: market.id || market.condition_id || '',
                side: tradeType,
                outcome: side,
                size: parseFloat(amount),
                price: price,
                order_id: result.orderId,
                token_id: tokenId,
                market_question: market.question || market.market || '',
              }),
            });
            if (response.ok) {
              console.log('📝 Trade recorded in database');
            } else {
              console.warn('⚠️ Failed to record trade:', await response.text());
            }
          }
        } catch (recordErr) {
          // Don't fail the trade if recording fails
          console.warn('⚠️ Failed to record trade in database:', recordErr);
        }
        
        // Refresh balance after trade
        setTimeout(refreshBalance, 2000);
      }
    } catch (err: any) {
      setBalanceError(err.message || 'Trade failed');
      setIsCheckingBalance(false);
    }
  };

  const getActionButtonText = () => {
    if (!authenticated) return 'CONNECT WALLET';
    if (isInitializing) return 'SETTING UP...';
    if (!isReady) return 'START TRADING';
    if (isCheckingBalance) return 'CHECKING BALANCE...';
    if (isOrderLoading) return 'SIGNING ORDER...';
    if (isOrderSuccess) return '✅ ORDER PLACED!';
    return `CONFIRM ${tradeType}`;
  };

  const getActionButtonColor = () => {
    if (isOrderError || balanceError) return 'bg-red-600 hover:bg-red-700';
    if (isOrderSuccess) return 'bg-green-600 hover:bg-green-700';
    if (!authenticated) return 'bg-purple-600 hover:bg-purple-500';
    return tradeType === 'SELL'
      ? 'bg-amber-600 hover:bg-amber-500'
      : 'bg-blue-600 hover:bg-blue-500';
  };

  const isButtonDisabled = () => {
    if (!authenticated) return false;
    if (isInitializing || isOrderLoading || isCheckingBalance) return true;
    if (!isReady && !isInitializing) return false;
    if (!amount || parseFloat(amount) <= 0) return true;
    return false;
  };

  const displayStatus = isInitializing ? sessionStatus : orderStatus;

  // Calculate if user has enough balance/shares
  const hasInsufficientBalance = tradeType === 'SELL'
    ? amount && parseFloat(amount) > userShares
    : balance && amount && parseFloat(amount) > parseFloat(balance);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="cyber-grid-bg w-full h-full"></div>
        </div>

        {/* Header */}
        <div className="relative p-6 border-b border-white/10 bg-[#151518]">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-mono text-blue-400 uppercase tracking-wider mb-2">
                <Cpu size={14} />
                EXECUTE_ORDER // {market.id?.slice(-8) || 'UNKNOWN'}
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {market.question || market.market || 'Unknown Market'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative p-6 space-y-6">

          {/* Geo-Restriction Warning */}
          {!isGeoLoading && isRestricted && (
            <div className={`rounded-xl p-4 border ${
              isUSUser 
                ? 'bg-amber-500/10 border-amber-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isUSUser ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
                  {isUSUser ? (
                    <Info size={18} className="text-amber-400" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold text-sm mb-1 ${isUSUser ? 'text-amber-400' : 'text-red-400'}`}>
                    {isUSUser ? 'US Trading Coming Soon' : 'Region Restricted'}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {restrictionMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Demo Market Indicator */}
          {marketType === 'demo' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono">
                <Settings2 size={14} />
                TEST MODE: Demo market
              </div>
            </div>
          )}

          {/* Trade Type Selector */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
                Trade Type
              </span>
              {tradeType === 'SELL' && (
                <span className="text-xs text-amber-400 font-mono flex items-center gap-1">
                  <Receipt size={12} />
                  1% Platform Fee
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setTradeType('BUY')}
                className={`p-3 rounded-lg border transition-all text-left ${
                  tradeType === 'BUY'
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">BUY</span>
                  <ArrowUpCircle size={14} className="text-green-400" />
                </div>
                <div className="text-sm font-mono text-green-400 mt-1">
                  Enter Position
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  No platform fee
                </div>
              </button>

              <button
                onClick={() => setTradeType('SELL')}
                className={`p-3 rounded-lg border transition-all text-left ${
                  tradeType === 'SELL'
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">SELL</span>
                  <ArrowDownCircle size={14} className="text-amber-400" />
                </div>
                <div className="text-sm font-mono text-amber-400 mt-1">
                  Exit Position
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  1% platform fee
                </div>
              </button>
            </div>
          </div>

          {/* Live Price Display */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
                Live Price Data
              </span>
              <span className="text-xs text-green-400 font-mono">
                SPREAD: {spread}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSide('YES')}
                className={`p-3 rounded-lg border transition-all text-left ${
                  side === 'YES'
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">YES</span>
                  <TrendingUp size={12} className="text-green-400" />
                </div>
                <div className="text-lg font-mono font-bold text-green-400 mt-1">
                  {marketData.current_yes_price.toFixed(3)}
                </div>
              </button>

              <button
                onClick={() => setSide('NO')}
                className={`p-3 rounded-lg border transition-all text-left ${
                  side === 'NO'
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">NO</span>
                  <TrendingDown size={12} className="text-red-400" />
                </div>
                <div className="text-lg font-mono font-bold text-red-400 mt-1">
                  {marketData.current_no_price.toFixed(3)}
                </div>
              </button>
            </div>
          </div>

          {/* Amount Input - Different for BUY vs SELL */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs text-slate-400 uppercase tracking-wider font-mono">
                {tradeType === 'SELL' ? 'Shares to Sell' : 'Investment Amount'}
              </label>

              {/* For BUY: show dollar presets */}
              {tradeType === 'BUY' && (
                <div className="flex gap-2">
                  {[10, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset.toString())}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20"
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              )}

              {/* For SELL: show available shares and percentage buttons */}
              {tradeType === 'SELL' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Available: <span className={`font-mono ${userShares > 0 ? 'text-green-400' : 'text-slate-600'}`}>
                      {userShares.toFixed(2)}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* SELL mode: percentage buttons */}
            {tradeType === 'SELL' && userShares > 0 && (
              <div className="flex gap-2 mb-3">
                {[25, 50, 100].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => setAmount((userShares * (percent / 100)).toFixed(2))}
                    className="flex-1 text-xs text-amber-400 hover:text-amber-300 transition-colors px-2 py-2 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20"
                  >
                    {percent === 100 ? 'Max' : `${percent}%`}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              {tradeType === 'BUY' ? (
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              ) : (
                <TrendingDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
              )}
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-4 bg-[#030304] border border-white/10 rounded-xl text-white font-mono text-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-slate-600"
                disabled={isOrderLoading || isInitializing || isCheckingBalance}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-mono">
                {tradeType === 'SELL' ? 'SHARES' : 'USDC'}
              </span>
            </div>

            {/* Estimated Return */}
            {amount && parseFloat(amount) > 0 && (
              <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                {tradeType === 'BUY' && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Estimated Return:</span>
                      <span className="text-green-400 font-mono font-bold">
                        {payout.toFixed(2)} shares @ ${price.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-slate-500">Potential Payout:</span>
                      <span className="text-slate-400 font-mono">
                        ${payout.toFixed(2)} if {side} wins
                      </span>
                    </div>
                  </>
                )}

                {tradeType === 'SELL' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Trade Value:</span>
                      <span className="text-white font-mono">${tradeValue.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-amber-400 flex items-center gap-1">
                        <Receipt size={12} />
                        Platform Fee ({FEE_PERCENT}%):
                      </span>
                      <span className="text-amber-400 font-mono">-${feeInfo.feeAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 mt-2">
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span className="text-green-400">You Receive:</span>
                        <span className="text-green-400 font-mono">${feeInfo.netAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Balance Error / Insufficient Balance Warning */}
          {(balanceError || hasInsufficientBalance) && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-400 text-sm font-mono">
                <X size={16} />
                {balanceError || 'not enough balance / allowance'}
              </div>
            </div>
          )}

          {/* Status Messages */}
          {displayStatus && !balanceError && (
            <div className={`p-4 rounded-xl font-mono text-sm ${
              isOrderError
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : isOrderSuccess
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
            }`}>
              {displayStatus}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="relative p-4 border-t border-white/10 bg-[#151518]">
          {/* Status badges - compact row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {authenticated && walletsReady && wallets.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-[10px]">
                <Wallet size={10} className={isReady ? 'text-green-400' : 'text-yellow-400'} />
                <span className="text-slate-400 font-mono">{isReady ? 'READY' : 'SETUP'}</span>
              </div>
            )}
            {session?.safeAddress && (
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-[10px]">
                <Shield size={10} className="text-blue-400" />
                <span className="text-slate-400 font-mono">{session.safeAddress.slice(0, 6)}...{session.safeAddress.slice(-4)}</span>
              </div>
            )}
            {balance && (
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-[10px]">
                <DollarSign size={10} className="text-green-400" />
                <span className="text-green-400 font-mono">${parseFloat(balance).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons - full width */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isOrderLoading || isInitializing || isCheckingBalance}
              className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 text-slate-300 font-mono text-sm font-medium rounded-xl"
            >
              CANCEL
            </button>
            <button
              onClick={handleTrade}
              disabled={isButtonDisabled()}
              className={`flex-1 py-3 border ${getActionButtonColor()} text-white font-mono text-sm font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {(isOrderLoading || isInitializing || isCheckingBalance) && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {getActionButtonText()}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
